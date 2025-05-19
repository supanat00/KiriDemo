// src/app/api/scans/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db'; // ตรวจสอบ Path ไปยัง Prisma Client instance
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // ตรวจสอบ Path

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const scans = await prisma.modelScan.findMany({
            orderBy: {
                createdAt: 'desc', // เรียงจากใหม่ไปเก่า
            },
            // (Optional) ถ้าต้องการเลือกเฉพาะบาง Fields:
            select: {
                id: true,
                serialize: true,
                name: true,
                status: true,
                createdAt: true,
                previewUrl: true,
                // ไม่ต้องดึง downloadUrl ถ้าไม่ได้ใช้แสดงผลโดยตรง
            }
        });
        console.log("[API /api/scans] Fetched scans:", scans);
        return NextResponse.json(scans);
    } catch (error) {
        console.error("[API /api/scans] Error fetching scans:", error);
        return NextResponse.json({ error: 'Failed to fetch scans from database' }, { status: 500 });
    }
}