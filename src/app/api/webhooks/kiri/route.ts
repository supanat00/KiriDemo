// src/app/api/webhooks/kiri/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db'; // ตรวจสอบ Path

const KIRI_WEBHOOK_SIGNING_SECRET = process.env.KIRI_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
    if (!KIRI_WEBHOOK_SIGNING_SECRET) {
        console.error("CRITICAL: KIRI_WEBHOOK_SIGNING_SECRET is not configured in .env.local.");
        return NextResponse.json({ error: "Webhook processing misconfigured on server." }, { status: 500 });
    }

    try {
        const requestBodyText = await request.text();
        const signatureFromKiri = request.headers.get('x-signature');

        if (!signatureFromKiri) {
            console.warn("Webhook received: Missing X-Signature header.");
            return NextResponse.json({ error: "Signature missing" }, { status: 400 });
        }

        const expectedSignature = crypto
            .createHmac('sha256', KIRI_WEBHOOK_SIGNING_SECRET)
            .update(requestBodyText)
            .digest('hex');

        let isSignatureValid = false;
        try {
            const sigBufferFromKiri = Buffer.from(signatureFromKiri, 'hex');
            const sigBufferExpected = Buffer.from(expectedSignature, 'hex');
            if (sigBufferFromKiri.length === sigBufferExpected.length) {
                isSignatureValid = crypto.timingSafeEqual(sigBufferFromKiri, sigBufferExpected);
            } else {
                console.warn("Webhook signature length mismatch.");
            }
        } catch (e) {
            console.error("Error during signature comparison (possibly invalid hex format from Kiri):", e);
        }

        if (!isSignatureValid) {
            console.warn(`Webhook received: Invalid signature. Expected: ${expectedSignature}, Got: ${signatureFromKiri}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        console.log("Webhook signature verified successfully.");

        const payload = JSON.parse(requestBodyText); // This can throw SyntaxError if requestBodyText is not valid JSON
        const { serialize, status } = payload;

        if (serialize === undefined || status === undefined) {
            console.warn("Webhook payload missing 'serialize' or 'status':", payload);
            return NextResponse.json({ error: "Missing 'serialize' or 'status' in payload" }, { status: 400 });
        }

        const numericStatus = parseInt(String(status), 10);
        if (isNaN(numericStatus)) {
            console.warn("Webhook 'status' is not a valid number:", status);
            return NextResponse.json({ error: "Invalid 'status' format in payload" }, { status: 400 });
        }

        console.log(`Webhook processed: Serialize ID = ${serialize}, New Status = ${numericStatus}`);

        try {
            const updatedScan = await prisma.modelScan.updateMany({
                where: { serialize: String(serialize) },
                data: {
                    status: numericStatus,
                    updatedAt: new Date(),
                    kiriRawWebhookPayload: payload,
                },
            });

            if (updatedScan.count > 0) {
                console.log(`Successfully updated status for serialize '${serialize}' to '${numericStatus}'.`);
            } else {
                console.warn(`Webhook: No model found in DB with serialize '${serialize}'. Payload:`, payload);
            }
        } catch (dbError: unknown) { // Handle DB error specifically
            let dbErrorMessage = "Error updating model status in DB.";
            if (dbError instanceof Error) {
                dbErrorMessage = dbError.message;
            } else if (typeof dbError === 'string') {
                dbErrorMessage = dbError;
            }
            console.error(`DB error updating status for serialize '${serialize}':`, dbError);
            return NextResponse.json({ error: dbErrorMessage }, { status: 500 });
        }

        return NextResponse.json({ message: "Webhook received and processed." }, { status: 200 });

    } catch (error: unknown) { // <--- เปลี่ยน error: any เป็น error: unknown (Outer catch)
        let errorMessage = "An unexpected error occurred processing webhook.";
        // Log the original error for server-side debugging
        console.error("Unhandled error in webhook handler:", error);

        if (error instanceof SyntaxError) { // Check if it's a JSON parsing error
            errorMessage = "Invalid JSON payload.";
            return NextResponse.json({ error: errorMessage }, { status: 400 });
        } else if (error instanceof Error) {
            errorMessage = error.message; // Use message from other Error instances
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // For other types of errors, or if no specific message was extracted
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}