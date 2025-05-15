// src/app/api/kiri-engine/upload-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addJob } from '@/lib/jobManager'; // Ensure this path is correct
import type { Job } from '@/types/project';

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
        if (!videoFile.type.startsWith('video/')) {
            return NextResponse.json({ message: 'Invalid file type. Only video files are allowed.' }, { status: 400 });
        }

        const kiriFormData = new FormData();
        kiriFormData.append('videoFile', videoFile, videoFile.name);
        kiriFormData.append('modelQuality', clientFormData.get('modelQuality')?.toString() || '1');
        kiriFormData.append('textureQuality', clientFormData.get('textureQuality')?.toString() || '1');
        kiriFormData.append('fileFormat', clientFormData.get('fileFormat')?.toString() || 'glb');
        kiriFormData.append('isMask', clientFormData.get('isMask')?.toString() || '1');
        kiriFormData.append('textureSmoothing', clientFormData.get('textureSmoothing')?.toString() || '1');

        console.log('[API Upload] Sending to KIRI Engine...');
        const kiriResponse = await fetch(KIRI_ENGINE_UPLOAD_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${KIRI_ENGINE_API_KEY}` },
            body: kiriFormData,
        });

        const kiriResponseData = await kiriResponse.json();
        console.log('[API Upload] Response from KIRI Engine:', kiriResponseData);

        if (!kiriResponse.ok || kiriResponseData.code !== 0) {
            return NextResponse.json(
                { message: kiriResponseData.msg || 'Failed to upload video to KIRI Engine', details: kiriResponseData },
                { status: kiriResponse.status || 500 }
            );
        }

        const serializeId = kiriResponseData.data?.serialize; // Optional chaining
        if (!serializeId || typeof serializeId !== 'string') {
            console.error('[API Upload] Invalid or missing serialize ID from KIRI Engine:', kiriResponseData.data);
            return NextResponse.json({ message: 'Received invalid serialize ID from KIRI Engine.' }, { status: 500 });
        }

        const newJobData: Omit<Job, 'updatedAt' | '_id' | 'submittedAt'> & { submittedAt?: Date } = {
            id: serializeId,
            videoName: videoFile.name,
            status: 'queuing',
            submittedAt: new Date(), // Explicitly set submittedAt here
        };
        const createdJob = await addJob(newJobData);

        return NextResponse.json({
            message: 'Video uploaded and job created successfully.',
            jobId: createdJob.id,
            kiriResponse: kiriResponseData.data
        }, { status: 201 });

    } catch (error) {
        console.error('[API Upload] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown internal server error during upload.';
        return NextResponse.json({ message }, { status: 500 });
    }
}