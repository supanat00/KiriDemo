// src/lib/jobManager.ts
import { getJobsCollection } from './mongodb'; // Ensure this path is correct
import type { Job, JobStatus } from '@/types/project'; // Ensure this path is correct
import { ObjectId, WithId } from 'mongodb'; // Import ObjectId

// Helper to ensure dates are Date objects and _id is handled if present in app's Job type
// This version assumes app's Job type might have _id as string, and MongoDB doc has _id as ObjectId
function normalizeAppJob(jobData: Job | WithId<Job>): Job {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { _id, ...rest } = jobData as any; // Cast to handle _id flexibility
    const appJob: Job = {
        ...rest,
        id: rest.id as string, // KIRI Serialize
        videoName: rest.videoName as string,
        status: rest.status as JobStatus,
        submittedAt: new Date(rest.submittedAt),
        updatedAt: new Date(rest.updatedAt),
        modelName: rest.modelName as string | undefined,
        completedAt: rest.completedAt ? new Date(rest.completedAt) : undefined,
        modelUrl: rest.modelUrl as string | undefined,
        thumbnailUrl: rest.thumbnailUrl as string | undefined,
        errorMessage: rest.errorMessage as string | undefined,
    };
    // If your app's Job type expects _id as a string (converted from ObjectId)
    if (_id && typeof appJob.id === 'undefined' && _id instanceof ObjectId) {
        // (appJob as any)._id = _id.toString(); // Example if Job type has _id: string
    } else if (_id && typeof appJob.id === 'undefined') {
        // (appJob as any)._id = _id; // If Job type can take ObjectId or already string
    }
    // If Job type has no _id, this function effectively removes it.
    return appJob;
}


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

export const getAllJobs = async (): Promise<Job[]> => {
    const jobsCollection = await getJobsCollection(); // Returns Collection<Job>
    const jobsData = await jobsCollection.find({})
        .sort({ submittedAt: -1 })
        .toArray(); // Returns WithId<Job>[]
    return jobsData.map(jobDoc => normalizeAppJob(jobDoc));
};

export const getJobById = async (id: string): Promise<Job | null> => {
    const jobsCollection = await getJobsCollection();
    const jobData = await jobsCollection.findOne({ id: id }); // Returns WithId<Job> | null
    if (!jobData) return null;
    return normalizeAppJob(jobData);
};

export const addJob = async (newJobData: Omit<Job, 'updatedAt' | '_id' | 'submittedAt'> & { submittedAt?: Date }): Promise<Job> => {
    const jobsCollection = await getJobsCollection(); // Returns Collection<Job>
    const jobDocumentToInsert = {
        id: newJobData.id,
        videoName: newJobData.videoName,
        status: newJobData.status,
        submittedAt: newJobData.submittedAt || new Date(),
        updatedAt: new Date(),
        modelName: newJobData.modelName,
        completedAt: newJobData.completedAt,
        modelUrl: newJobData.modelUrl,
        thumbnailUrl: newJobData.thumbnailUrl,
        errorMessage: newJobData.errorMessage,
    };

    // When Collection is typed as Collection<Job>, findOneAndUpdate with returnDocument: 'after'
    // should return Promise<Job | null> (where Job's _id might be ObjectId if that's in your TSchema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Job | null = await jobsCollection.findOneAndUpdate( // <--- Type of result is Job | null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: jobDocumentToInsert.id as any }, // Query on 'id'
        {
            $set: jobDocumentToInsert,
            $setOnInsert: { submittedAt: jobDocumentToInsert.submittedAt }
        },
        { upsert: true, returnDocument: 'after' }
    );

    if (!result) { // <--- Check result directly
        console.error('[JobManager] Failed to add/upsert job (findOneAndUpdate returned null):', newJobData.id);
        throw new Error('Database operation failed: Document not returned after upsert.');
    }
    console.log('[JobManager] Added/Upserted job:', result.id);
    return normalizeAppJob(result); // result is already of type Job (potentially with _id: ObjectId)
};

export const updateJob = async (id: string, updates: Partial<Omit<Job, 'id' | 'submittedAt' | '_id'>>): Promise<Job | null> => {
    const jobsCollection = await getJobsCollection(); // Returns Collection<Job>
    const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { submittedAt, ...restOfUpdates } = updateWithTimestamp as any;
    if (submittedAt !== undefined) {
        console.warn(`[JobManager] Attempted to update submittedAt for job ${id}. Ignoring.`);
    }

    const result: Job | null = await jobsCollection.findOneAndUpdate( // <--- Type of result is Job | null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: id as any }, // Query on 'id'
        { $set: restOfUpdates },
        { returnDocument: 'after' }
    );

    if (result) { // <--- Check result directly
        console.log('[JobManager] Updated job:', result.id, 'with updates:', restOfUpdates);
        return normalizeAppJob(result);
    }

    console.warn(`[JobManager] Job with ID ${id} not found for update.`);
    return null;
};