// src/types/project.ts

// ใช้ JobStatus จาก jobStore.ts หรือนิยามใหม่ที่นี่ถ้าต้องการ
export type JobStatus = 'processing' | 'completed' | 'failed' | 'queuing' | 'uploading' | 'expired';

export interface Job {
    id: string;
    videoName: string; // จะใช้ videoName เสมอในตอนแรก
    modelName?: string; // อาจจะตั้งได้ทีหลัง หรือ KIRI กำหนด
    status: JobStatus;
    submittedAt: Date;
    updatedAt: Date;
    errorMessage?: string;
    modelUrl?: string;
    thumbnailUrl?: string;
    completedAt?: Date;
}

// Type ที่เราอาจจะใช้ใน UI state โดยเฉพาะ
export interface ProcessingJobUI extends Job {
    status: 'processing' | 'queuing' | 'uploading';
}

export interface CompletedItemUI extends Job {
    status: 'completed' | 'failed' | 'expired';
}