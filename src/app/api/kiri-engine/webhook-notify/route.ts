// src/app/api/kiri-engine/webhook-notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateJob, mapKiriStatus } from '@/lib/jobManager'; // Ensure this path is correct
import type { Job, JobStatus } from '@/types/project';

const KIRI_WEBHOOK_SIGNING_SECRET = process.env.KIRI_WEBHOOK_SIGNING_SECRET;

interface KiriWebhookPayload {
    serialize: string;
    status: number;
    modelUrl?: string;
    errorMessage?: string;
    // Add other fields KIRI might send
}

export async function POST(request: NextRequest) {
    console.log('[Webhook Notify] Received a request.');

    if (!KIRI_WEBHOOK_SIGNING_SECRET) {
        console.error('[Webhook Notify] KIRI_WEBHOOK_SIGNING_SECRET is not configured on server.');
        return NextResponse.json({ message: 'Webhook processing disabled: Server configuration error.' }, { status: 503 });
    }

    let rawBody: string;
    try {
        rawBody = await request.text();
    } catch (err) {
        console.error('[Webhook Notify] Failed to read request body:', err);
        return NextResponse.json({ message: 'Failed to read request body.' }, { status: 400 });
    }

    const signature = request.headers.get('x-signature');
    if (!signature) {
        console.warn('[Webhook Notify] Missing X-Signature header.');
        return NextResponse.json({ message: 'Missing signature.' }, { status: 400 });
    }

    try {
        const hmac = crypto.createHmac('sha256', KIRI_WEBHOOK_SIGNING_SECRET);
        hmac.update(rawBody, 'utf8');
        const calculatedSignature = hmac.digest('hex');

        if (calculatedSignature !== signature) {
            console.warn('[Webhook Notify] Invalid signature.');
            return NextResponse.json({ message: 'Invalid signature.' }, { status: 403 });
        }
        console.log('[Webhook Notify] Signature verified successfully.');

        const payload = JSON.parse(rawBody) as KiriWebhookPayload;
        console.log('[Webhook Notify] Parsed Payload:', payload);

        const { serialize, status: kiriStatus, modelUrl, errorMessage } = payload;

        if (!serialize || typeof serialize !== 'string') {
            console.warn('[Webhook Notify] Payload missing or invalid serialize ID.');
            return NextResponse.json({ message: 'Payload missing or invalid serialize ID.' }, { status: 400 });
        }
        if (typeof kiriStatus !== 'number') { // Basic check for status
            console.warn('[Webhook Notify] Payload missing or invalid status.');
            return NextResponse.json({ message: 'Payload missing or invalid status.' }, { status: 400 });
        }


        const newAppStatus: JobStatus = mapKiriStatus(kiriStatus);
        const updates: Partial<Omit<Job, 'id' | 'submittedAt' | '_id'>> = {
            status: newAppStatus,
        };

        if (newAppStatus === 'completed') {
            updates.completedAt = new Date();
            if (modelUrl) updates.modelUrl = modelUrl;
            // Consider if thumbnailUrl or other details come with webhook
        }
        if (newAppStatus === 'failed') {
            updates.errorMessage = errorMessage || 'Processing failed (from webhook).';
        }

        const updatedJobResult = await updateJob(serialize, updates);

        if (updatedJobResult) {
            console.log(`[Webhook Notify] Job ${serialize} updated to status ${newAppStatus} via webhook.`);
        } else {
            console.warn(`[Webhook Notify] Job ${serialize} not found in DB for webhook update. Payload:`, payload);
            // Potentially log this for investigation, or create the job if it makes sense for your flow.
        }

        return NextResponse.json({ message: 'Webhook received and processed successfully.' }, { status: 200 });

    } catch (error) {
        console.error('[Webhook Notify] Error processing webhook:', error);
        const message = error instanceof Error ? error.message : 'Unknown error processing webhook';
        // Return 200 to KIRI to acknowledge receipt and prevent retries, even if our processing fails.
        // Log internal errors thoroughly.
        return NextResponse.json({ message: `Internal error: ${message}` }, { status: 200 });
    }
}