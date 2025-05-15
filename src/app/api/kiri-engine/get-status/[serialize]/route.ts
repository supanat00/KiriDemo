// src/app/api/kiri-engine/get-status/[serialize]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateJob, mapKiriStatus, JobStatus, Job } from '@/libs/jobStore'; // <<-- แก้ Path ตรงนี้เป็น @/lib/jobStore ถ้า jobStore อยู่ใน lib

const KIRI_ENGINE_API_KEY = process.env.KIRI_ENGINE_API_KEY;
const KIRI_ENGINE_STATUS_URL_BASE = 'https://api.kiriengine.app/api/v1/open/model/getStatus?serialize=';

interface KiriStatusResponseData {
    serialize: string;
    status: number;
    modelUrl?: string;
    errorMessage?: string;
}

export async function GET(
    request: NextRequest,
    // eslint-disable-next-line
    context: any // <--- ลองเปลี่ยนเป็น any ชั่วคราว
) {
    // สมมติว่า context.params.serialize ยังคงมีอยู่
    const serializeId = context.params?.serialize; // <--- ใช้ optional chaining เผื่อ params ไม่มี

    if (!KIRI_ENGINE_API_KEY) {
        return NextResponse.json({ message: 'KIRI Engine API key is not configured.' }, { status: 500 });
    }

    if (!serializeId || typeof serializeId !== 'string') { // <--- เพิ่มการตรวจสอบ Type ของ serializeId
        console.error('[API GetStatus] Invalid or missing serializeId in context:', context.params);
        return NextResponse.json({ message: 'Serialize ID is required in the path and must be a string.' }, { status: 400 });
    }

    // ... (ส่วนที่เหลือของโค้ดเหมือนเดิม) ...
    try {
        const kiriStatusUrl = `${KIRI_ENGINE_STATUS_URL_BASE}${serializeId}`;
        console.log(`[API GetStatus] Fetching status for ${serializeId} from KIRI: ${kiriStatusUrl}`);

        const kiriResponse = await fetch(kiriStatusUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
            },
        });

        const kiriResponseData = await kiriResponse.json();
        console.log(`[API GetStatus] Response from KIRI for ${serializeId}:`, kiriResponseData);

        if (!kiriResponse.ok || kiriResponseData.code !== 0) {
            const errorMessage = kiriResponseData.msg || `Failed to get status for ${serializeId} from KIRI`;
            updateJob(serializeId, { status: 'failed', errorMessage: `KIRI API Error: ${errorMessage}` });
            return NextResponse.json(
                { message: errorMessage, details: kiriResponseData },
                { status: kiriResponse.status }
            );
        }

        const kiriStatusPayload = kiriResponseData.data as KiriStatusResponseData;
        const newStatus: JobStatus = mapKiriStatus(kiriStatusPayload.status);

        const updates: Partial<Omit<Job, 'id' | 'submittedAt'>> = { status: newStatus };

        if (newStatus === 'completed') {
            if (kiriStatusPayload.modelUrl) {
                updates.modelUrl = kiriStatusPayload.modelUrl;
            }
            updates.completedAt = new Date();
        }
        if (newStatus === 'failed') {
            if (kiriStatusPayload.errorMessage) {
                updates.errorMessage = kiriStatusPayload.errorMessage;
            } else if (kiriResponseData.msg && kiriResponseData.msg !== "success") {
                updates.errorMessage = kiriResponseData.msg;
            }
        }

        const updatedJob = updateJob(serializeId, updates);

        if (!updatedJob) {
            console.warn(`[API GetStatus] Job ${serializeId} not found in local store after KIRI update.`);
            return NextResponse.json({ message: `Job ${serializeId} not found locally. It might have been cleared or never existed.` }, { status: 404 });
        }

        return NextResponse.json(updatedJob, { status: 200 });

    } catch (error) {
        console.error(`[API GetStatus] Catch block error for ${serializeId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error in GetStatus API';
        updateJob(serializeId, { status: 'failed', errorMessage: `Internal Error: ${errorMessage.substring(0, 100)}` });
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}