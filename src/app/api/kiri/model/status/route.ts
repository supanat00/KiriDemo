// src/app/api/kiri/model/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/db'; // Import Prisma Client

const KIRI_API_BASE_URL = process.env.KIRI_API_BASE_URL;
const KIRI_API_KEY = process.env.KIRI_API_KEY;

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!KIRI_API_BASE_URL || !KIRI_API_KEY) {
        console.error("KIRI API Base URL or Key is not configured.");
        return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const serialize = searchParams.get('serialize');

    if (!serialize) {
        return NextResponse.json({ error: 'Serialize ID is required' }, { status: 400 });
    }

    try {
        const kiriApiUrl = `${KIRI_API_BASE_URL}/v1/open/model/getStatus?serialize=${serialize}`;
        // console.log(`[API Proxy getStatus] Requesting status from KIRI: ${kiriApiUrl}`);

        const kiriResponse = await fetch(kiriApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KIRI_API_KEY}`,
            },
            cache: 'no-store',
        });

        const data = await kiriResponse.json();
        // console.log(`[API Proxy getStatus] KIRI Raw Response for ${serialize}:`, data);

        if (!kiriResponse.ok || !(data.ok === true && (data.code === 0 || data.code === 200) && data.data?.status !== undefined)) {
            console.error(`[API Proxy getStatus] KIRI API Error or unexpected data for ${serialize}:`, data);
            return NextResponse.json({ error: data.msg || 'Failed to get status from KIRI Engine', details: data }, { status: kiriResponse.status || 500 });
        }

        const numericStatus = parseInt(String(data.data.status), 10);
        if (isNaN(numericStatus)) {
            console.error(`[API Proxy getStatus] Invalid status format for ${serialize}:`, data.data.status);
            return NextResponse.json({ error: 'Invalid status format received' }, { status: 500 });
        }

        // (สำคัญ) อัปเดตสถานะใน Local DB ของคุณด้วย
        try {
            await prisma.modelScan.updateMany({ // หรือ update
                where: { serialize: serialize },
                data: {
                    status: numericStatus,
                    updatedAt: new Date(),
                    kiriRawWebhookPayload: data, // (Optional) เก็บ Response ล่าสุด
                },
            });
            console.log(`[API Proxy getStatus] Updated local DB for ${serialize} with status ${numericStatus}`);
        } catch (dbError) {
            console.error(`[API Proxy getStatus] DB error updating status for ${serialize}:`, dbError);
            // ดำเนินการต่อแม้ว่า DB update จะล้มเหลว แต่ Client ยังควรได้สถานะล่าสุดจาก KIRI
        }

        return NextResponse.json({
            serialize: data.data.serialize,
            status: numericStatus,
        });

    } catch (error) {
        console.error(`[API Proxy getStatus] Error for ${serialize}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}