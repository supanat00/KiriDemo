// src/app/api/kiri/model/download-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // ตรวจสอบ Path ให้ถูกต้อง

const KIRI_API_BASE_URL = process.env.KIRI_API_BASE_URL;
const KIRI_API_KEY = process.env.KIRI_API_KEY;

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    if (!KIRI_API_BASE_URL || !KIRI_API_KEY) {
        console.error("CRITICAL: KIRI_API_BASE_URL or KIRI_API_KEY is not configured for getModelZip.");
        return NextResponse.json({ error: 'KIRI API configuration is missing on the server.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const serialize = searchParams.get('serialize');

    if (!serialize) {
        return NextResponse.json({ error: 'Serialize ID (serialize) is required in query parameters.' }, { status: 400 });
    }

    try {
        const kiriApiUrl = `${KIRI_API_BASE_URL}/v1/open/model/getModelZip?serialize=${encodeURIComponent(serialize)}`;
        console.log(`[API getModelZip] Requesting download link from KIRI for serialize: ${serialize}. URL: ${kiriApiUrl}`);

        const kiriResponse = await fetch(kiriApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KIRI_API_KEY}`,
            },
            cache: 'no-store',
        });

        const kiriData = await kiriResponse.json();
        console.log(`[API getModelZip] KIRI Raw Response for ${serialize}:`, kiriData);

        if (!kiriResponse.ok) {
            const errorMessage = kiriData?.msg || `Failed to get download link from KIRI Engine (HTTP ${kiriResponse.status})`;
            console.error(`[API getModelZip] KIRI API HTTP Error for ${serialize}:`, errorMessage, "Details:", kiriData);
            return NextResponse.json({ error: errorMessage, details: kiriData }, { status: kiriResponse.status });
        }

        if (!(kiriData.ok === true && (kiriData.code === 0 || kiriData.code === 200) && kiriData.data?.modelUrl)) {
            const errorMessage = kiriData.msg || "KIRI Engine returned an error or an invalid download link.";
            console.error(`[API getModelZip] KIRI API logical error or missing modelUrl for ${serialize}:`, errorMessage, "Details:", kiriData);
            let clientStatus = 500;
            if (kiriData.code === 2001 || kiriData.code === 2002 || kiriData.code === 2006) {
                clientStatus = 404;
            }
            return NextResponse.json({ error: errorMessage, details: kiriData, errorCode: kiriData.code }, { status: clientStatus });
        }

        console.log(`[API getModelZip] Successfully retrieved download link for ${serialize}: ${kiriData.data.modelUrl}`);
        return NextResponse.json({
            modelUrl: kiriData.data.modelUrl,
            serialize: kiriData.data.serialize,
        });

    } catch (error: unknown) { // <--- เปลี่ยน error: any เป็น error: unknown
        let errorMessage = "Internal Server Error while fetching download link.";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        // Log error เดิมที่มี serialize ID ด้วย
        console.error(`[API getModelZip] Unhandled error for serialize ${serialize}:`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}