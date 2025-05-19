// src/middleware.ts
export { default } from "next-auth/middleware"

export const config = {
    matcher: [
        "/dashboard/:path*", // ป้องกันทุก path ภายใต้ /dashboard
        "/api/kiri/:path*",  // ป้องกัน API route ของ Kiri (ถ้าต้องการให้เฉพาะ Admin เรียก)
        // เพิ่ม path อื่นๆ ที่ต้องการป้องกันที่นี่
    ],
}