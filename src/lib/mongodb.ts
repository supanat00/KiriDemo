// src/lib/mongodb.ts (แก้ไขส่วน Production)
import { MongoClient, Db, Collection, ServerApiVersion } from 'mongodb';
import type { Job } from '@/types/project';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
    throw new Error('❌ Please define the MONGODB_URI environment variable inside .env.local');
}
if (!dbName) {
    throw new Error('❌ Please define the MONGODB_DB_NAME environment variable inside .env.local');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
    // eslint-disable-next-line no-var
    var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, {
            serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
        });
        console.log('🔵 MongoDB: (Dev) Initiating new connection...');
        global._mongoClientPromise = client.connect()
            .then(clientInstance => {
                console.log('✅ MongoDB: (Dev) Connected successfully!');
                return clientInstance;
            })
            .catch(err => {
                console.error('❌ MongoDB: (Dev) FAILED to connect:', err);
                process.exit(1); // Exit in dev if connection fails critically
                // return Promise.reject(err); // Alternative to process.exit
            });
    }
    clientPromise = global._mongoClientPromise;
} else { // Production
    client = new MongoClient(uri, {
        serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
    });
    console.log('🔵 MongoDB: (Prod) Initiating new connection...'); // <--- Log เดิม
    clientPromise = client.connect()
        .then(clientInstance => {
            console.log('✅ MongoDB: (Prod) Connected successfully!'); // <--- เพิ่ม Log นี้
            return clientInstance;
        })
        .catch(err => {
            console.error('❌ MongoDB: (Prod) FAILED to connect:', err); // <--- เพิ่ม Log นี้
            // In production, rethrowing the error is often preferred so the calling function handles it
            // or the serverless function can terminate and log the error.
            throw err;
        });
}

export default clientPromise;

export async function getDb(): Promise<Db> {
    console.log('[MongoDB getDb] Awaiting clientPromise...'); // Log เพื่อดูว่า getDb ถูกเรียก
    const mongoClient = await clientPromise; // This will either resolve or throw if clientPromise was rejected
    console.log('[MongoDB getDb] clientPromise resolved. Getting DB:', dbName);
    return mongoClient.db(dbName);
}

export async function getJobsCollection(): Promise<Collection<Job>> {
    const db = await getDb();
    console.log('[MongoDB getJobsCollection] Got DB instance. Getting collection: jobs (or KiriAPI as per config)');
    return db.collection<Job>('KiriAPI'); // <--- แก้เป็น KiriAPI ตามที่คุณบอก
}