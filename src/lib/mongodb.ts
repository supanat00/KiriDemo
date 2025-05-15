// src/lib/mongodb.ts
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
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        global._mongoClientPromise = client.connect();
        console.log('🔵 MongoDB: New connection initiated in development.');
    }
    clientPromise = global._mongoClientPromise;
} else {
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    clientPromise = client.connect();
    console.log('🔵 MongoDB: New connection initiated for production/other.');
}

export default clientPromise;

export async function getDb(): Promise<Db> {
    const mongoClient = await clientPromise;
    return mongoClient.db(dbName); // dbName ควรจะเป็นชื่อ Database ของคุณ เช่น "TKODev" หรือ "KiriAPI" ถ้ามันคือชื่อ DB
}

export async function getJobsCollection(): Promise<Collection<Job>> {
    const db = await getDb();
    // --- แก้ไขตรงนี้ ให้เป็นชื่อ Collection ของคุณจริงๆ ---
    return db.collection<Job>('KiriAPI'); // <--- เปลี่ยน "jobs" เป็น "KiriAPI" ถ้า Collection ชื่อนี้
    // หรือถ้า Database ชื่อ TKODev และ Collection ชื่อ KiriAPI ให้แน่ใจว่า dbName ใน .env.local คือ TKODev
}