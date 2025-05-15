// src/app/api/kiri-engine/get-status/[serialize]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateJob, mapKiriStatus } from '@/lib/jobManager'; // Ensure this path is correct
import type { Job, JobStatus } from '@/types/project'; // Ensure this path is correct

const KIRI_ENGINE_API_KEY = process.env.KIRI_ENGINE_API_KEY;
const KIRI_ENGINE_STATUS_URL_BASE = 'https://api.kiriengine.app/api/v1/open/model/getStatus?serialize=';

interface KiriStatusResponsePayload {
    serialize: string;
    status: number;
    modelUrl?: string;
    errorMessage?: string;
}

// --- ลองใช้ "any" สำหรับ argument ที่สองทั้งหมด ---
export async function GET(
    request: NextRequest,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any // <--- เปลี่ยนเป็น any โดยตรง
) {
    // พยายามเข้าถึง params อย่างปลอดภัย
    const params = context?.params;
    const serializeId = params?.serialize as string | undefined; // Cast เป็น string | undefined

    if (!KIRI_ENGINE_API_KEY) {
        return NextResponse.json({ message: 'KIRI Engine API key is not configured.' }, { status: 500 });
    }

    if (!serializeId || typeof serializeId !== 'string') {
        console.error('[API GetStatus] Invalid or missing serializeId. Context:', context);
        return NextResponse.json({ message: 'Serialize ID is required in the path and must be a string.' }, { status: 400 });
    }

    try {
        const kiriStatusUrl = `${KIRI_ENGINE_STATUS_URL_BASE}${serializeId}`;
        console.log(`[API GetStatus] Fetching status for ${serializeId} from KIRI: ${kiriStatusUrl}`);

        const kiriResponse = await fetch(kiriStatusUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}` },
        });

        const kiriResponseData = await kiriResponse.json();
        console.log(`[API GetStatus] Response from KIRI for ${serializeId}:`, kiriResponseData);

        if (!kiriResponse.ok || kiriResponseData.code !== 0) {
            const errorMessage = kiriResponseData.msg || `Failed to get status for ${serializeId} from KIRI`;
            await updateJob(serializeId, { status: 'failed', errorMessage: `KIRI API Error: ${errorMessage}` });
            return NextResponse.json(
                { message: errorMessage, details: kiriResponseData },
                { status: kiriResponse.status || 500 }
            );
        }

        const kiriStatusPayload = kiriResponseData.data as KiriStatusResponsePayload;
        if (!kiriStatusPayload || typeof kiriStatusPayload.status === 'undefined' || typeof kiriStatusPayload.serialize === 'undefined') {
            console.error('[API GetStatus] Invalid payload structure from KIRI status API:', kiriResponseData);
            await updateJob(serializeId, { status: 'failed', errorMessage: 'Invalid response from KIRI status API' });
            return NextResponse.json({ message: 'Invalid response structure from KIRI status API.' }, { status: 500 });
        }

        const newStatus: JobStatus = mapKiriStatus(kiriStatusPayload.status);
        const updates: Partial<Pick<Job, 'status' | 'modelUrl' | 'completedAt' | 'errorMessage'>> = {
            status: newStatus
        };

        if (newStatus === 'completed') {
            if (kiriStatusPayload.modelUrl) {
                updates.modelUrl = kiriStatusPayload.modelUrl;
            }
            updates.completedAt = new Date();
        }
        if (newStatus === 'failed') {
            updates.errorMessage = kiriStatusPayload.errorMessage || kiriResponseData.msg || 'Processing failed (no specific error from KIRI status).';
        }

        const updatedJob = await updateJob(serializeId, updates);

        if (!updatedJob) {
            console.warn(`[API GetStatus] Job ${serializeId} not found in local DB for update attempt.`);
            return NextResponse.json({ message: `Job ${serializeId} not found locally.` }, { status: 404 });
        }

        return NextResponse.json(updatedJob, { status: 200 });

    } catch (error) {
        console.error(`[API GetStatus] Catch block error for ${serializeId}:`, error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        // ตรวจสอบ serializeId อีกครั้งก่อนเรียก updateJob ใน catch
        if (serializeId && typeof serializeId === 'string') {
            await updateJob(serializeId, { status: 'failed', errorMessage: `Internal Error during status check: ${message.substring(0, 100)}` });
        }
        return NextResponse.json({ message }, { status: 500 });
    }
}