export type JobStatus = 'processing' | 'completed' | 'failed' | 'queuing' | 'uploading' | 'expired';

export interface Job {
    id: string;
    videoName: string;
    status: JobStatus;
    submittedAt: Date;
    updatedAt: Date;
    errorMessage?: string;
    modelUrl?: string;
    thumbnailUrl?: string;
    completedAt?: Date;
}

const jobs: Job[] = [];

export const getAllJobs = (): Job[] => {
    return [...jobs].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
};

export const getJobById = (id: string): Job | undefined => {
    return jobs.find(job => job.id === id);
};

export const addJob = (newJobData: Omit<Job, 'updatedAt' | 'submittedAt'> & { submittedAt?: Date }): Job => {
    // ถ้า submittedAt ไม่ได้ถูกส่งมา ให้ใช้ new Date()
    const submittedAt = newJobData.submittedAt || new Date();
    const jobWithTimestamps: Job = {
        ...newJobData,
        submittedAt: submittedAt, // ใช้ submittedAt ที่กำหนดหรือสร้างใหม่
        updatedAt: new Date()     // updatedAt ใหม่เสมอ
    };

    const existingJobIndex = jobs.findIndex(j => j.id === jobWithTimestamps.id);

    if (existingJobIndex !== -1) {
        console.warn(`[JobStore] Job ID ${jobWithTimestamps.id} exists. Updating existing job.`);
        jobs[existingJobIndex] = {
            ...jobs[existingJobIndex], // คงค่าเก่าไว้เป็น base
            videoName: jobWithTimestamps.videoName, // อัปเดต videoName
            status: jobWithTimestamps.status,       // อัปเดต status
            // อัปเดต fields อื่นๆ ที่อาจจะมากับ jobWithTimestamps ถ้ามันมีค่า
            errorMessage: jobWithTimestamps.errorMessage !== undefined ? jobWithTimestamps.errorMessage : jobs[existingJobIndex].errorMessage,
            modelUrl: jobWithTimestamps.modelUrl !== undefined ? jobWithTimestamps.modelUrl : jobs[existingJobIndex].modelUrl,
            thumbnailUrl: jobWithTimestamps.thumbnailUrl !== undefined ? jobWithTimestamps.thumbnailUrl : jobs[existingJobIndex].thumbnailUrl,
            completedAt: jobWithTimestamps.completedAt !== undefined ? jobWithTimestamps.completedAt : jobs[existingJobIndex].completedAt,
            updatedAt: new Date(), // อัปเดตเวลาเสมอ
        };
        console.log('[JobStore] Updated job:', jobs[existingJobIndex]);
        return jobs[existingJobIndex];
    } else {
        jobs.unshift(jobWithTimestamps); // Add to the beginning of the array
        console.log('[JobStore] Added new job:', jobWithTimestamps);
        return jobWithTimestamps;
    }
};

export const updateJob = (id: string, updates: Partial<Omit<Job, 'id' | 'submittedAt'>>): Job | undefined => {
    const jobIndex = jobs.findIndex(job => job.id === id);
    if (jobIndex > -1) {
        // Ensure we don't overwrite submittedAt
        const { submittedAt, ...restOfExistingJob } = jobs[jobIndex];
        jobs[jobIndex] = {
            submittedAt, // Keep original submittedAt
            ...restOfExistingJob,
            ...updates,
            updatedAt: new Date()
        };
        console.log('[JobStore] Updated job via updateJob:', jobs[jobIndex]);
        return jobs[jobIndex];
    }
    console.warn(`[JobStore] Job with ID ${id} not found for update via updateJob.`);
    return undefined;
};


export const getProcessingJobs = (): Job[] => {
    return jobs.filter(job => job.status === 'processing' || job.status === 'queuing' || job.status === 'uploading');
};

export const getCompletedOrFailedJobs = (): Job[] => {
    return jobs.filter(job => job.status === 'completed' || job.status === 'failed' || job.status === 'expired');
};

export const mapKiriStatus = (kiriStatus: number): JobStatus => {
    switch (kiriStatus) {
        case -1: return 'uploading';
        case 0: return 'processing';
        case 1: return 'failed';
        case 2: return 'completed';
        case 3: return 'queuing';
        case 4: return 'expired';
        default:
            console.warn(`[mapKiriStatus] Unknown KIRI status: ${kiriStatus}, defaulting to 'processing'.`);
            return 'processing';
    }
};