// src/types/project.ts
// ไม่จำเป็นต้อง import ObjectId จาก mongodb ที่นี่ ถ้า Job type ของเราไม่มี _id

export type JobStatus =
    | 'uploading'   // Client is uploading to our server, or our server is uploading to KIRI
    | 'queuing'     // KIRI Engine has accepted the job and it's in queue
    | 'processing'  // KIRI Engine is actively processing the model
    | 'completed'   // KIRI Engine finished processing successfully
    | 'failed'      // KIRI Engine failed to process the model
    | 'expired';    // The job or model link has expired (if applicable)

export interface Job {
    // No _id (MongoDB's ObjectId) property here.
    // 'id' is our primary application-level identifier, storing KIRI's serialize.
    id: string;
    videoName: string;
    modelName?: string;     // Optional: User might name it later, or derive from videoName
    status: JobStatus;
    submittedAt: Date;    // When the job was first submitted to our system/KIRI
    updatedAt: Date;      // When this job record was last updated in our DB
    completedAt?: Date;   // When the job status became 'completed'
    modelUrl?: string;      // URL to view/download the 3D model (from KIRI)
    thumbnailUrl?: string;  // URL for a preview image of the model (if KIRI provides)
    errorMessage?: string;  // Error message if status is 'failed'
    // You can add other KIRI-specific fields if needed, e.g.,
    // kiriCalculateType?: number;
    // kiriFileFormat?: string;
}

// UI-specific types (optional, but can be helpful for clarity in components)
export interface ProcessingJobUI extends Job {
    status: 'uploading' | 'queuing' | 'processing';
}

export interface CompletedItemUI extends Job {
    status: 'completed' | 'failed' | 'expired';
}