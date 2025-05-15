// src/types/project.ts
export type JobStatus =
    | 'uploading'
    | 'queuing'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'expired';

export interface Job {
    id: string;             // KIRI Engine's serialize ID (Our primary unique key)
    videoName: string;
    modelName?: string;
    status: JobStatus;
    submittedAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    modelUrl?: string;
    thumbnailUrl?: string;
    errorMessage?: string;
}

export interface ProcessingJobUI extends Job {
    status: 'uploading' | 'queuing' | 'processing';
}

export interface CompletedItemUI extends Job {
    status: 'completed' | 'failed' | 'expired';
}