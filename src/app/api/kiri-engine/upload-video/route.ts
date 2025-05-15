// src/app/api/kiri-engine/upload-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addJob, Job } from '@/libs/jobStore';

const KIRI_ENGINE_API_KEY = process.env.KIRI_ENGINE_API_KEY;
const KIRI_ENGINE_UPLOAD_URL = 'https://api.kiriengine.app/api/v1/open/photo/video';

export async function POST(request: NextRequest) {
    if (!KIRI_ENGINE_API_KEY) {
        return NextResponse.json({ message: 'KIRI Engine API key is not configured.' }, { status: 500 });
    }

    try {
        const clientFormData = await request.formData();
        const videoFile = clientFormData.get('videoFile') as File | null;

        if (!videoFile) {
            return NextResponse.json({ message: 'Video file is required.' }, { status: 400 });
        }

        // สร้าง FormData ใหม่สำหรับส่งไป KIRI Engine
        const kiriFormData = new FormData();
        kiriFormData.append('videoFile', videoFile, videoFile.name);
        // ดึงค่าอื่นๆ จาก clientFormData ถ้ามีการส่งมา หรือใช้ค่า default
        kiriFormData.append('modelQuality', clientFormData.get('modelQuality')?.toString() || '1'); // Medium
        kiriFormData.append('textureQuality', clientFormData.get('textureQuality')?.toString() || '1'); // 2K
        kiriFormData.append('fileFormat', clientFormData.get('fileFormat')?.toString() || 'glb');
        kiriFormData.append('isMask', clientFormData.get('isMask')?.toString() || '1');
        kiriFormData.append('textureSmoothing', clientFormData.get('textureSmoothing')?.toString() || '1');

        console.log('[API Upload] Sending to KIRI Engine with FormData:', kiriFormData);

        const kiriResponse = await fetch(KIRI_ENGINE_UPLOAD_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}`,
                // 'Content-Type' for 'multipart/form-data' is set automatically by fetch with FormData
            },
            body: kiriFormData,
        });

        const kiriResponseData = await kiriResponse.json();
        console.log('[API Upload] Response from KIRI Engine:', kiriResponseData);

        if (!kiriResponse.ok || kiriResponseData.code !== 0) {
            return NextResponse.json(
                { message: kiriResponseData.msg || 'Failed to upload video to KIRI Engine', details: kiriResponseData },
                { status: kiriResponse.status }
            );
        }

        // KIRI Engine ตอบกลับสำเร็จ, ได้ serialize (Job ID)
        const serializeId = kiriResponseData.data.serialize;

        // สร้าง Job ใหม่ใน Store ของเรา
        const newJobData: Omit<Job, 'updatedAt'> = {
            id: serializeId,
            videoName: videoFile.name,
            status: 'queuing', // หรือ 'processing' ขึ้นอยู่กับ KIRI Engine ตอบกลับ (API ไม่ได้บอกสถานะเริ่มต้น)
            submittedAt: new Date(),
            // errorMessage, modelUrl, etc. จะเป็น undefined ในตอนแรก
        };
        const createdJob = addJob(newJobData);

        return NextResponse.json({
            message: 'Video uploaded and job created successfully.',
            jobId: createdJob.id,
            kiriResponse: kiriResponseData.data // ส่งข้อมูลจาก KIRI กลับไปด้วย
        }, { status: 201 }); // 201 Created

    } catch (error) {
        console.error('[API Upload] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}