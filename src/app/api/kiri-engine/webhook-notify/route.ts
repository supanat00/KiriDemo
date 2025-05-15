// src/app/api/kiri-engine/webhook-notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto'; // สำหรับการตรวจสอบ Signature
import { updateJob, mapKiriStatus, JobStatus, Job } from '@/libs/jobStore'; // หรือ Path ที่ถูกต้องของคุณ

const KIRI_WEBHOOK_SIGNING_SECRET = process.env.KIRI_WEBHOOK_SIGNING_SECRET;

interface KiriWebhookPayload {
    serialize: string;
    status: number; // -1: Uploading, 0: Processing, 1: Failed, 2: Successful, 3: Queuing, 4: Expired
    // KIRI อาจจะส่งข้อมูลอื่นๆ มาด้วย เช่น modelUrl, errorMessage
    modelUrl?: string;
    errorMessage?: string;
    // ตรวจสอบเอกสาร KIRI หรือ Payload จริงๆ ที่ได้รับเพื่อดู field ทั้งหมด
}

export async function POST(request: NextRequest) {
    console.log('[Webhook Notify] Received a request.');

    if (!KIRI_WEBHOOK_SIGNING_SECRET) {
        console.error('[Webhook Notify] KIRI_WEBHOOK_SIGNING_SECRET is not configured.');
        // ไม่ควรตอบกลับด้วย Error นี้ให้ KIRI โดยตรง แต่ควร Log ไว้
        // KIRI คาดหวัง 200 OK เสมอถ้าเรา "รับ" request ได้ (แม้จะประมวลผลภายในไม่ได้)
        // แต่ถ้า Secret ไม่มี เราก็ verify ไม่ได้ อาจจะต้องพิจารณาการตอบกลับ
        return NextResponse.json({ message: 'Webhook signing secret not configured on server.' }, { status: 500 }); // หรือ 400
    }

    try {
        const rawBody = await request.text(); // อ่าน Raw Body สำหรับการ Verify Signature
        const signature = request.headers.get('x-signature'); // ตามที่ KIRI Engine ระบุ Header

        if (!signature) {
            console.warn('[Webhook Notify] Missing X-Signature header.');
            return NextResponse.json({ message: 'Missing signature.' }, { status: 400 });
        }

        // --- Verify Signature ---
        const hmac = crypto.createHmac('sha256', KIRI_WEBHOOK_SIGNING_SECRET);
        hmac.update(rawBody, 'utf8'); // KIRI มักจะ Sign Raw JSON Body
        const calculatedSignature = hmac.digest('hex');

        if (calculatedSignature !== signature) {
            console.warn('[Webhook Notify] Invalid signature.');
            // ใน Production จริง อาจจะไม่ต้อง Log รายละเอียดมากถ้ามีการโจมตี
            return NextResponse.json({ message: 'Invalid signature.' }, { status: 403 }); // Forbidden
        }
        console.log('[Webhook Notify] Signature verified successfully.');

        // --- Process a valid webhook ---
        const payload = JSON.parse(rawBody) as KiriWebhookPayload;
        console.log('[Webhook Notify] Parsed Payload:', payload);

        const { serialize, status: kiriStatus, modelUrl, errorMessage } = payload;

        if (!serialize) {
            console.warn('[Webhook Notify] Payload missing serialize ID.');
            return NextResponse.json({ message: 'Payload missing serialize ID.' }, { status: 400 });
        }

        const newAppStatus: JobStatus = mapKiriStatus(kiriStatus);
        const updates: Partial<Omit<Job, 'id' | 'submittedAt'>> = {
            status: newAppStatus,
        };

        if (newAppStatus === 'completed') {
            updates.completedAt = new Date();
            if (modelUrl) {
                updates.modelUrl = modelUrl;
            }
            // อาจจะต้องมีการเรียก API getModelZip เพื่อเอา modelUrl ที่ถูกต้องอีกที
            // ถ้า Webhook ไม่ได้ส่งมา หรือส่งมาเป็น URL ชั่วคราว
        }

        if (newAppStatus === 'failed') {
            if (errorMessage) {
                updates.errorMessage = errorMessage;
            }
        }
        // อัปเดต thumbnailUrl ถ้ามีใน payload ด้วย
        // if (payload.thumbnailUrl) {
        //   updates.thumbnailUrl = payload.thumbnailUrl;
        // }


        const updatedJob = updateJob(serialize, updates);

        if (updatedJob) {
            console.log(`[Webhook Notify] Job ${serialize} updated to status ${newAppStatus}.`);
            // TODO: (Optional) Trigger real-time update to connected clients (e.g., via SSE, WebSockets)
            // TODO: (Optional) Send email notification to user
        } else {
            console.warn(`[Webhook Notify] Job ${serialize} not found in store, but webhook received.`);
            // อาจจะสร้าง Job ใหม่ถ้ามันไม่มีอยู่ (แต่ควรจะถูกสร้างตอน Upload แล้ว)
            // หรือ Log ไว้เพื่อตรวจสอบ
        }

        // --- สำคัญ: ตอบกลับ KIRI ด้วย HTTP 200 OK ---
        return NextResponse.json({ message: 'Webhook received and processed.' }, { status: 200 });

    } catch (error) {
        console.error('[Webhook Notify] Error processing webhook:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        // แม้จะเกิด Error ภายใน เราก็ควรพยายามตอบ 200 ให้ KIRI ถ้าเป็นไปได้
        // ยกเว้น Error ที่เกิดจากการ Parse Body หรือ Signature ที่ควรตอบ 400/403
        // ถ้าเป็น Error ที่ไม่คาดคิด อาจจะ Log แล้วตอบ 500 แต่ KIRI อาจจะ Retry
        // การตอบ 200 เพื่อบอกว่า "เราได้รับแล้ว" จะดีกว่า
        return NextResponse.json({ message: `Error processing: ${message}` }, { status: 200 }); // หรือ 500 ถ้าต้องการให้ KIRI retry (เช็ค Doc KIRI)
    }
}