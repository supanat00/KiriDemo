// src/app/api/kiri/create/photo-scan-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // ตรวจสอบ Path
import prisma from '@/lib/db'; // ตรวจสอบ Path ไปยัง Prisma Client
import { mapPrismaScanToModelItem } from '@/types/scanTypes'; // สมมติว่าย้าย ModelItem และ map function ไปที่นี่
import { serialize } from 'mongodb';

const KIRI_API_BASE_URL = process.env.KIRI_API_BASE_URL;
const KIRI_API_KEY = process.env.KIRI_API_KEY;
// (Optional) Callback URL สำหรับ Webhook, KIRI อาจจะให้ตั้งค่า Global ใน Dashboard ของเขา
// หรืออาจจะต้องส่งไปกับแต่ละ Request (ตรวจสอบเอกสาร KIRI)
// const KIRI_NOTIFY_URL = process.env.KIRI_WEBHOOK_CALLBACK_URL || `${process.env.NEXTAUTH_URL}/api/webhooks/kiri`;

export async function POST(request: NextRequest) {
    // 1. ตรวจสอบ Authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) { // ตรวจสอบ session.user ด้วยเผื่อกรณี Type
        return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    // 2. ตรวจสอบ Configuration ของ KIRI API
    if (!KIRI_API_BASE_URL || !KIRI_API_KEY) {
        console.error("CRITICAL: KIRI_API_BASE_URL or KIRI_API_KEY is not configured.");
        return NextResponse.json({ error: 'KIRI API configuration is missing on the server.' }, { status: 500 });
    }

    try {
        // 3. รับ FormData จาก Request
        const formData = await request.formData();
        const videoFile = formData.get('videoFile') as File | null;
        const modelTitle = formData.get('modelTitle') as string | null;

        // ดึง Parameters เฉพาะสำหรับ Photo Scan (Video)
        const modelQuality = formData.get('modelQuality') as string || "1"; // Default: Medium
        const textureQuality = formData.get('textureQuality') as string || "1"; // Default: 2K
        const fileFormat = formData.get('fileFormat') as string || "GLB";    // Default: GLB (ดีสำหรับการ Preview)
        const isMask = formData.get('isMask') as string || "1";              // Default: Turn ON Auto Object Masking
        const textureSmoothing = formData.get('textureSmoothing') as string || "1"; // Default: Turn ON Texture Smoothing

        // 4. Validate Input พื้นฐาน
        if (!videoFile) {
            return NextResponse.json({ error: 'Video file is required.' }, { status: 400 });
        }
        if (!modelTitle || modelTitle.trim() === '' || modelTitle.trim().toLowerCase() === 'untitled') {
            // อาจจะอนุญาต "Untitled" แล้วให้ User แก้ไขทีหลังได้ หรือบังคับให้ตั้งชื่อที่มีความหมาย
            return NextResponse.json({ error: 'A valid model title is required.' }, { status: 400 });
        }
        // (Optional) เพิ่ม Validation สำหรับ Video File (Type, Size, Duration, Resolution) ที่นี่อีกครั้ง
        // แม้ว่า Client-side จะทำไปแล้ว แต่การ Validate ที่ Server-side ก็เป็นการป้องกันที่ดี
        // แต่การ Validate Duration/Resolution ของ Video บน Server โดยไม่ใช้ Library อาจจะยาก
        // KIRI API น่าจะมีการ Validate ของตัวเองอยู่แล้ว และจะ Return Error กลับมาถ้าไม่ผ่าน

        // 5. สร้าง FormData ใหม่เพื่อส่งไปยัง KIRI Engine API
        const kiriFormData = new FormData();
        kiriFormData.append('videoFile', videoFile, videoFile.name); // ส่งชื่อไฟล์ไปด้วย
        // KIRI API Attributes for Photo Scan (Video)
        kiriFormData.append('modelQuality', modelQuality);
        kiriFormData.append('textureQuality', textureQuality);
        kiriFormData.append('fileFormat', fileFormat);
        kiriFormData.append('isMask', isMask);
        kiriFormData.append('textureSmoothing', textureSmoothing);
        // (Optional) ถ้า KIRI API ต้องการ Notify URL ต่อ Request
        // kiriFormData.append('notifyUrl', KIRI_NOTIFY_URL);

        console.log(`[API create/photo-scan-video] Preparing to send to KIRI. Title: ${modelTitle}, File: ${videoFile.name}`);
        // console.log("[API create/photo-scan-video] FormData to KIRI:", Object.fromEntries(kiriFormData.entries())); // For debugging FormData

        // 6. เรียก KIRI Engine API Endpoint สำหรับ Photo Scan - Video
        const kiriApiEndpoint = `${KIRI_API_BASE_URL}/v1/open/photo/video`;
        const kiriResponse = await fetch(kiriApiEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KIRI_API_KEY}`,
                // 'Content-Type': 'multipart/form-data' // fetch API จะตั้งค่า Boundary ให้เองเมื่อ Body เป็น FormData
            },
            body: kiriFormData,
        });

        const kiriData = await kiriResponse.json();
        console.log(`[API create/photo-scan-video] KIRI Raw Response for ${modelTitle}:`, kiriData);

        // 7. ตรวจสอบ Response จาก KIRI
        if (!kiriResponse.ok || !(kiriData.ok === true && (kiriData.code === 0 || kiriData.code === 200) && kiriData.data?.serialize)) {
            console.error(`[API create/photo-scan-video] KIRI API Error for ${modelTitle}:`, kiriData);
            // พยายามส่ง Error Message ที่ KIRI ให้มากลับไป (ถ้ามี)
            const errorMessage = kiriData.msg || (kiriData.data && typeof kiriData.data === 'string' ? kiriData.data : 'Failed to create scan with KIRI Engine.');
            const errorCode = kiriData.code; // อาจจะใช้ code นี้ในการแสดงผลที่ Client
            return NextResponse.json({ error: errorMessage, details: kiriData, errorCode: errorCode }, { status: kiriResponse.status || 500 });
        }

        const { serialize, calculateType } = kiriData.data;

        // 8. บันทึกข้อมูลโมเดลใหม่ลงในฐานข้อมูล Prisma/MongoDB ของคุณ
        try {
            const newScanInDb = await prisma.modelScan.create({
                data: {
                    serialize: serialize,
                    name: modelTitle.trim(),
                    status: -1, // สถานะเริ่มต้น: Uploading/Queuing (หรือสถานะอื่นที่ KIRI อาจจะระบุในการสร้าง)
                    calculateType: calculateType || 1, // Default to 1 (Photo Scan) if not provided
                    fileFormatUsed: fileFormat,
                    modelQuality: parseInt(modelQuality, 10),
                    textureQuality: parseInt(textureQuality, 10),
                    isMask: isMask === "1", // แปลงเป็น Boolean
                    textureSmoothing: textureSmoothing === "1", // แปลงเป็น Boolean
                    createdAt: new Date(), // Prisma จะจัดการให้ถ้ามี @default(now())
                    updatedAt: new Date(), // Prisma จะจัดการให้ถ้ามี @updatedAt
                    kiriRawCreateResponse: kiriData, // (Optional) เก็บ Raw Response จาก KIRI ตอนสร้าง
                },
            });
            console.log(`[API create/photo-scan-video] New scan '${modelTitle}' (Serialize: ${serialize}) saved to local DB with ID: ${newScanInDb.id}`);

            // 9. Return Response ที่สำเร็จให้ Frontend
            return NextResponse.json({
                message: "Photo Scan (Video) creation initiated successfully with KIRI Engine.",
                // ส่งข้อมูลโมเดลที่เพิ่งบันทึกลง DB กลับไป (Map ให้อยู่ใน Format ที่ Frontend คาดหวัง)
                scan: mapPrismaScanToModelItem(newScanInDb)
            }, { status: 201 }); // 201 Created

        } catch (dbError: unknown) { // <--- เปลี่ยน dbError: any เป็น dbError: unknown
            let dbErrorMessage = "An unknown database error occurred.";
            if (dbError instanceof Error) {
                dbErrorMessage = dbError.message;
            } else if (typeof dbError === 'string') {
                dbErrorMessage = dbError;
            }
            console.error(`[API create/photo-scan-video] Database error after KIRI success for ${serialize}:`, dbError);
            return NextResponse.json({
                error: "Scan created with KIRI, but failed to save to our database. Please contact support.",
                kiriSerialize: serialize,
                dbErrorMessage: dbErrorMessage, // ใช้ dbErrorMessage ที่ Process แล้ว
            }, { status: 500 });
        }

    } catch (error: unknown) { // <--- เปลี่ยน error: any เป็น error: unknown
        let errorMessage = "Internal Server Error during scan creation process.";
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        console.error('[API create/photo-scan-video] Unhandled error in handler:', error);
        // ถ้า serializeFromKiri มีค่า (หมายถึง KIRI call สำเร็จ แต่เกิด Error ก่อน DB call หรือระหว่างนั้น)
        // อาจจะต้องการส่ง serialize กลับไปด้วย
        return NextResponse.json({
            error: errorMessage,
            kiriSerializeIfKnown: serialize // (Optional)
        }, { status: 500 });
    }
}