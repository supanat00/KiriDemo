// src/types/scanTypes.ts (หรือไฟล์ที่คุณเก็บ Types)
import type { ModelScan as PrismaModelScanType } from '@prisma/client'; // Import Type จาก Prisma Client

export interface ModelItem {
    id: string;
    serialize: string;
    name: string;
    status: -1 | 0 | 1 | 2 | 3 | 4;
    createdAt: string; // Formatted date string
    calculateType?: number | null;   // Type เป็น number และ Optional
    fileFormatUsed?: string | null; // Type เป็น string และ Optional
}

export const mapPrismaScanToModelItem = (dbScan: PrismaModelScanType): ModelItem => {
    return {
        id: dbScan.id,
        serialize: dbScan.serialize,
        name: dbScan.name,
        status: dbScan.status as ModelItem['status'], // Cast to ensure our defined union type
        createdAt: new Date(dbScan.createdAt).toLocaleDateString('en-CA', { // en-CA for YYYY-MM-DD
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }),
        calculateType: dbScan.calculateType ?? null, // ใช้ Nullish Coalescing ถ้าเป็น Optional ใน DB
        fileFormatUsed: dbScan.fileFormatUsed ?? null, // ใช้ Nullish Coalescing
    };
};

// (Optional) ถ้าคุณต้องการ Type สำหรับ Parameters ของ Photo Scan แยกต่างหาก
export interface PhotoScanVideoApiParams {
    modelQuality: string;
    textureQuality: string;
    fileFormat: string;
    isMask: string;
    textureSmoothing: string;
}