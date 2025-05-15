// src/app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { getAllJobs } from '@/libs/jobStore';

export async function GET() {
    try {
        const jobs = getAllJobs();
        return NextResponse.json(jobs, { status: 200 });
    } catch (error) {
        console.error('[API GetJobs] Error:', error);
        return NextResponse.json({ message: 'Failed to retrieve jobs' }, { status: 500 });
    }
}