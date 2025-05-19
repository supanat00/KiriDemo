// src/lib/auth.ts
import { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// import { JWT } from "next-auth/jwt"; // ไม่จำเป็นต้อง import โดยตรงถ้าไม่ได้ใช้แบบซับซ้อนมาก

// (Optional) ขยาย NextAuth User type ถ้าต้องการเพิ่ม Property ให้กับ User object ใน session
interface MyAppUser extends NextAuthUser {
    id: string; // id เป็น Property พื้นฐานที่ควรมี
    role?: string; // ตัวอย่าง: เพิ่ม role
    // คุณสามารถเพิ่ม Properties อื่นๆ ที่ authorize function คืนค่ามาได้ที่นี่
}

export const authOptions: NextAuthOptions = {
    // adapters: ไม่ใช้ Database Adapter ในกรณีนี้
    // providers: กำหนด Providers สำหรับการ Authentication
    providers: [
        CredentialsProvider({
            // ชื่อของ Provider (จะแสดงบนหน้า Login ที่ NextAuth สร้างให้ ถ้าใช้)
            name: 'Credentials',
            // ส่วน `credentials` นี้จะใช้ในการสร้าง Form บนหน้า Login อัตโนมัติ (ถ้าคุณไม่ได้สร้างหน้า Login เอง)
            // และยังช่วยให้ TypeScript อนุมาน Type ได้บ้าง
            credentials: {
                username: { label: "Username", type: "text", placeholder: "Enter your username" },
                password: { label: "Password", type: "password", placeholder: "Enter your password" }
            },
            // `authorize` function คือหัวใจของการตรวจสอบ Credentials
            async authorize(credentials) {
                // 1. ดึงค่า Admin Username และ Password จาก Environment Variables
                const adminUsername = process.env.ADMIN_USERNAME;
                const adminPassword = process.env.ADMIN_PASSWORD;

                // ตรวจสอบว่า Environment Variables ถูกตั้งค่าไว้หรือไม่
                if (!adminUsername || !adminPassword) {
                    console.error("CRITICAL: ADMIN_USERNAME or ADMIN_PASSWORD is not set in .env.local. Login will fail.");
                    // ใน Production อาจจะ throw error หรือ return null เพื่อป้องกันการ Login โดยไม่มีเงื่อนไข
                    // throw new Error("Server configuration error for authentication.");
                    return null;
                }

                // 2. เข้าถึง `username` และ `password` จาก `credentials` object อย่างปลอดภัย
                //    โดยใช้ Optional Chaining (?.)
                const inputUsername = credentials?.username;
                const inputPassword = credentials?.password;

                // 3. ตรวจสอบว่าผู้ใช้ได้กรอก Username และ Password มาหรือไม่
                if (!inputUsername || !inputPassword) {
                    console.log("Authorize attempt: Username or password not provided.");
                    return null; // คืนค่า null ถ้าข้อมูลไม่ครบ
                }

                // 4. เปรียบเทียบ Credentials (Case-Sensitive โดย Default)
                if (inputUsername === adminUsername && inputPassword === adminPassword) {
                    // ถ้า Credentials ถูกต้อง, คืนค่า User object
                    // User object นี้จะถูกใช้ในการสร้าง Session/JWT
                    // Property `id` เป็นสิ่งสำคัญ
                    console.log(`Authorize successful for user: ${inputUsername}`);
                    return {
                        name: process.env.ADMIN_USERNAME || "Administrator", // ใช้ชื่อจาก env ถ้ามี, หรือ hardcode                        
                        role: "admin" // (Optional) เพิ่ม Role
                        // คุณสามารถเพิ่ม Properties อื่นๆ ที่ต้องการให้มีใน Session/Token ได้ที่นี่
                    } as MyAppUser; // Cast เป็น MyAppUser (ถ้ามีการขยาย Type)
                } else {
                    // ถ้า Credentials ไม่ถูกต้อง
                    console.log(`Authorize failed for user: ${inputUsername}. Invalid credentials.`);
                    return null; // คืนค่า null เพื่อบ่งบอกว่า Authentication ล้มเหลว
                }
            }
        })
        // คุณสามารถเพิ่ม Providers อื่นๆ ได้ที่นี่ (เช่น Google, GitHub)
    ],

    // session: กำหนดวิธีการจัดการ Session
    session: {
        // strategy: 'database' // ถ้าใช้ Database Adapter และต้องการเก็บ Session ใน DB
        strategy: 'jwt',      // แนะนำให้ใช้ 'jwt' ถ้าไม่ใช้ Database Adapter (Session จะถูกเก็บใน JWT cookie)
        maxAge: 30 * 24 * 60 * 60, // ระยะเวลาที่ Session (หรือ JWT) จะยังคงใช้งานได้ (30 วัน)
        // updateAge: 24 * 60 * 60, // (Optional) ระยะเวลาที่ NextAuth จะอัปเดต Session (ทุกๆ 24 ชั่วโมง)
    },

    // jwt: (Optional) การตั้งค่าเพิ่มเติมสำหรับ JWT (ถ้า session.strategy เป็น 'jwt')
    // jwt: {
    //   secret: process.env.NEXTAUTH_SECRET, // Secret เดียวกับด้านล่าง
    //   maxAge: 60 * 60 * 24 * 30, // สามารถกำหนด maxAge ของ JWT ที่นี่ได้อีกที
    // },

    // callbacks: ฟังก์ชันที่ถูกเรียกในระหว่างกระบวนการ Authentication ต่างๆ
    //            มีประโยชน์สำหรับการปรับแต่งข้อมูลใน Session/Token
    callbacks: {
        // `jwt` callback ถูกเรียกทุกครั้งที่มีการสร้างหรืออัปเดต JWT
        // (เมื่อใช้ strategy: 'jwt' หรือเมื่อใช้ Providers เช่น OAuth ที่คืนค่า JWT)
        async jwt({ token, user }) {
            // `user` object คือสิ่งที่ `authorize` function คืนค่ามา (เฉพาะตอน Sign in ครั้งแรก)
            // `account` object มีข้อมูลจาก OAuth provider (ถ้าใช้)
            if (user) {
                // เพิ่มข้อมูลจาก `user` object (ที่ได้จาก authorize) เข้าไปใน `token`
                // เพื่อให้ข้อมูลนี้ถูกเก็บไว้ใน JWT และสามารถเข้าถึงได้ใน `session` callback
                const myAppUser = user as MyAppUser; // Cast เป็น Type ที่เราขยายไว้
                token.id = myAppUser.id;
                if (myAppUser.role) {
                    token.role = myAppUser.role;
                }
                // token.customData = myAppUser.customData; // ถ้ามีข้อมูลอื่นๆ
            }
            return token; // คืนค่า token ที่ถูกปรับแต่งแล้ว
        },

        // `session` callback ถูกเรียกทุกครั้งที่มีการเข้าถึง Session (เช่น ผ่าน `useSession` หรือ `getSession`)
        // `token` object คือ JWT ที่ถูกประมวลผลโดย `jwt` callback แล้ว
        async session({ session, token }) {
            // `token` object จะมีข้อมูลที่เราเพิ่มเข้าไปใน `jwt` callback
            // เราจะนำข้อมูลจาก `token` มาใส่ใน `session.user` object
            // เพื่อให้ Client-side (เช่น `useSession`) สามารถเข้าถึงข้อมูลเหล่านั้นได้
            if (session.user && token.id) {
                const extendedUser = session.user as MyAppUser; // Cast session.user
                extendedUser.id = token.id as string;
                if (token.role) {
                    extendedUser.role = token.role as string;
                }
                // session.user.customData = token.customData; // ถ้ามี
            }
            // `user` parameter ใน session callback คือ User object จาก Database (ถ้าใช้ Adapter)
            // ในกรณีที่ไม่ใช้ Adapter, `token` จะเป็นแหล่งข้อมูลหลัก
            return session; // คืนค่า session ที่ถูกปรับแต่งแล้ว
        },
    },

    // pages: (Optional) กำหนด Path สำหรับหน้าต่างๆ ที่เกี่ยวข้องกับ Authentication
    pages: {
        signIn: '/login',         // Path ไปยังหน้า Login ที่คุณสร้างเอง
        // signOut: '/auth/signout', // (Optional) Path ไปยังหน้า Logout (ถ้ามี)
        // error: '/auth/error',     // (Optional) Path ไปยังหน้าแสดงข้อผิดพลาด (เช่น ถ้า Login ผิดพลาด)
        // verifyRequest: '/auth/verify-request', // (Optional) สำหรับ Email provider
        // newUser: '/auth/new-user' // (Optional) Redirect หลังจากการ Sign up ครั้งแรกด้วย OAuth
    },

    // secret: ค่า Secret ที่ใช้สำหรับการเข้ารหัส (สำคัญมาก!)
    // ควรจะตรงกับ NEXTAUTH_SECRET ใน .env.local
    secret: process.env.NEXTAUTH_SECRET,

    // debug: (Optional) เปิด Debug mode ใน Development เพื่อดู Log เพิ่มเติมจาก NextAuth.js
    debug: process.env.NODE_ENV === 'development',
};

// ไม่ต้อง export default NextAuth(authOptions) จากที่นี่แล้ว
// ไฟล์ src/app/api/auth/[...nextauth]/route.ts จะทำหน้าที่นี้