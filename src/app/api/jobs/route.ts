// src/app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/jobManager';

export async function GET() {
    try {
        const jobs = await getAllJobs();
        return NextResponse.json(jobs, { status: 200 });
    } catch (error) {
        console.error('[API GetJobs] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ message: `Failed to retrieve jobs: ${message}` }, { status: 500 });
    }
}