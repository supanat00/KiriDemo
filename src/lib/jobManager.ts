// src/lib/jobManager.ts
import { getJobsCollection } from './mongodb';
import type { Job, JobStatus } from '@/types/project';
import { WithId } from 'mongodb';

/**
 * Helper function to convert a MongoDB document (WithId<Job>)
 * to our application's Job type.
 * This function EXPECTS a non-null input document.
 * It will throw an error if critical fields are missing for conversion.
 *
 * @param mongoDbJobWithId The document retrieved from MongoDB, typed as WithId<Job>.
 * @returns A Job object adhering to our application's type.
 * @throws Error if essential data for conversion is missing.
 */
function normalizeAppJobStrict(mongoDbJobWithId: WithId<Job>): Job { // <--- Input ไม่ใช่ null, Return ไม่ใช่ null
    const { ...appJobData } = mongoDbJobWithId;

    if (typeof appJobData.id !== 'string' ||
        typeof appJobData.videoName !== 'string' ||
        typeof appJobData.status !== 'string' || // Assuming JobStatus is a string enum
        !(appJobData.submittedAt instanceof Date || typeof appJobData.submittedAt === 'string' || typeof appJobData.submittedAt === 'number') || // Check if convertible to Date
        !(appJobData.updatedAt instanceof Date || typeof appJobData.updatedAt === 'string' || typeof appJobData.updatedAt === 'number')
    ) {
        console.error('[JobManager] normalizeAppJobStrict: Missing critical fields for job conversion. Data:', mongoDbJobWithId);
        throw new Error('Failed to normalize job data due to missing critical fields.');
    }

    return {
        id: appJobData.id,
        videoName: appJobData.videoName,
        status: appJobData.status,
        submittedAt: new Date(appJobData.submittedAt),
        updatedAt: new Date(appJobData.updatedAt),
        modelName: appJobData.modelName as string | undefined,
        completedAt: appJobData.completedAt ? new Date(appJobData.completedAt) : undefined,
        modelUrl: appJobData.modelUrl as string | undefined,
        thumbnailUrl: appJobData.thumbnailUrl as string | undefined,
        errorMessage: appJobData.errorMessage as string | undefined,
    };
}

export const mapKiriStatus = (kiriStatus: number): JobStatus => {
    // ... (เหมือนเดิม) ...
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
    const jobsCollection = await getJobsCollection();
    const jobsData = await jobsCollection.find({})
        .sort({ submittedAt: -1 })
        .toArray(); // Returns WithId<Job>[]

    return jobsData.map(jobDoc => {
        try {
            return normalizeAppJobStrict(jobDoc); // Use the strict version
        } catch (error) {
            console.error(`[JobManager getAllJobs] Failed to normalize job ${jobDoc._id}:`, error);
            return null; // Return null for problematic jobs in a list
        }
    }).filter(job => job !== null) as Job[]; // Filter out nulls
};

export const getJobById = async (id: string): Promise<Job | null> => {
    const jobsCollection = await getJobsCollection();
    const jobData = await jobsCollection.findOne({ id: id }); // Returns WithId<Job> | null
    if (!jobData) return null;
    try {
        return normalizeAppJobStrict(jobData); // Use the strict version
    } catch (error) {
        console.error(`[JobManager getJobById] Failed to normalize job ${id}:`, error);
        return null; // Return null if normalization fails
    }
};

export const addJob = async (newJobData: Omit<Job, 'updatedAt' | '_id' | 'submittedAt'> & { submittedAt?: Date }): Promise<Job> => {
    const jobsCollection = await getJobsCollection();
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

    const resultFromDb = await jobsCollection.findOneAndUpdate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: jobDocumentToInsert.id as any },
        {
            $set: jobDocumentToInsert,
            $setOnInsert: { submittedAt: jobDocumentToInsert.submittedAt }
        },
        { upsert: true, returnDocument: 'after' }
    );

    if (!resultFromDb) {
        console.error('[JobManager addJob] Failed to add/upsert job (findOneAndUpdate returned null):', newJobData.id);
        throw new Error('Database operation failed: Document not returned after upsert in addJob.');
    }

    // At this point, resultFromDb is guaranteed to be WithId<Job> (not null)
    // normalizeAppJobStrict expects WithId<Job> and returns Job (not Job | null)
    // or throws an error if conversion fails.
    try {
        const normalizedJob = normalizeAppJobStrict(resultFromDb);
        console.log('[JobManager] Added/Upserted job:', normalizedJob.id);
        return normalizedJob; // This is now type Job
    } catch (error) {
        console.error(`[JobManager addJob] Error normalizing job after upsert (ID: ${resultFromDb.id}):`, error);
        // Re-throw the error or throw a new more specific one
        throw new Error(`Failed to process job data after database operation (addJob): ${(error as Error).message}`);
    }
};

export const updateJob = async (id: string, updates: Partial<Omit<Job, 'id' | 'submittedAt' | '_id'>>): Promise<Job | null> => {
    const jobsCollection = await getJobsCollection();
    const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { submittedAt, ...restOfUpdates } = updateWithTimestamp as any;
    if (submittedAt !== undefined) {
        console.warn(`[JobManager] Attempted to update submittedAt for job ${id}. Ignoring.`);
    }

    // @typescript-eslint/no-explicit-any
    const resultFromDb = await jobsCollection.findOneAndUpdate(
        { id: id as string },
        { $set: restOfUpdates },
        { returnDocument: 'after' }
    );

    if (!resultFromDb) {
        console.warn(`[JobManager] Job with ID ${id} not found for update.`);
        return null;
    }

    // At this point, resultFromDb is guaranteed to be WithId<Job> (not null)
    try {
        const normalizedJob = normalizeAppJobStrict(resultFromDb);
        console.log('[JobManager] Updated job:', normalizedJob.id, 'with updates:', restOfUpdates);
        return normalizedJob; // This is now type Job
    } catch (error) {
        console.error(`[JobManager updateJob] Error normalizing job after update (ID: ${resultFromDb.id}):`, error);
        // For updateJob, returning null on normalization error might be acceptable
        // depending on how you want to handle it upstream. Or throw.
        return null;
    }
};