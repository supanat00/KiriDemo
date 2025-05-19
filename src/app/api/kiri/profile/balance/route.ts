// src/app/api/kiri/profile/balance/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const KIRI_API_BASE_URL = process.env.KIRI_API_BASE_URL;
const KIRI_API_KEY = process.env.KIRI_API_KEY;

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!KIRI_API_BASE_URL || !KIRI_API_KEY) {
        console.error("KIRI API Base URL or Key is not configured for getBalance.");
        return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
    }

    try {
        const kiriApiUrl = `${KIRI_API_BASE_URL}/v1/open/balance`;
        console.log(`[API Route] Requesting balance from KIRI: ${kiriApiUrl}`);

        const kiriResponse = await fetch(kiriApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KIRI_API_KEY}`,
            },
            cache: 'no-store',
        });

        const data = await kiriResponse.json();
        console.log("[API Route] KIRI Raw Response (getBalance):", data); // Log เพื่อดูข้อมูลดิบ

        // VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV
        // แก้ไขเงื่อนไขตรงนี้
        // VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV
        // ตรวจสอบ HTTP Status Code ก่อน แล้วค่อยดู code ภายใน JSON
        if (!kiriResponse.ok) { // ถ้า HTTP Status ไม่ใช่ 2xx
            console.error('[API Route] KIRI API HTTP Error (getBalance):', data.msg || kiriResponse.statusText);
            return NextResponse.json({ error: 'Failed to get balance from KIRI Engine', details: data.msg || kiriResponse.statusText }, { status: kiriResponse.status });
        }

        // ถ้า HTTP Status OK (2xx), ตรวจสอบ code และ data ภายใน
        // จาก Log ของคุณ KIRI ตอบ code: 200 เมื่อสำเร็จ
        // และมี ok: true ด้วย
        // แต่บางที code 0 ก็อาจจะหมายถึงสำเร็จในบาง API ของเขา (ตามเอกสารเก่า)
        // เราควรจะยืดหยุ่นกับ code 0 หรือ code 200 ถ้า ok เป็น true และมี data.balance
        if (!(data.ok === true && (data.code === 0 || data.code === 200) && data.data?.balance !== undefined)) {
            console.error('[API Route] KIRI API Success but data format incorrect or internal code indicates issue (getBalance):', data);
            return NextResponse.json({ error: 'Failed to retrieve a valid balance', details: data.msg || "Unexpected data format" }, { status: 500 });
        }

        const balanceValue = parseFloat(data.data.balance);
        if (isNaN(balanceValue)) {
            console.error('[API Route] KIRI API returned a balance that is not a number:', data.data.balance);
            return NextResponse.json({ error: 'Invalid balance format received' }, { status: 500 });
        }

        console.log("[API Route] Successfully fetched balance:", balanceValue);
        return NextResponse.json({ balance: balanceValue });

    } catch (error) {
        console.error('[API Route] Error in get-balance handler:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}