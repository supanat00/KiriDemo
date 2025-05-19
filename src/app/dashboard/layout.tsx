// src/app/dashboard/layout.tsx
import Navbar from '@/components/navigation/Navbar'; // Navbar เดิม (อาจจะปรับให้เรียบง่ายขึ้น)
import BottomNavigationBar from '@/components/navigation/BottomNavigationBar'; // Bottom Navigation ใหม่
import { ReactNode, Suspense } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200">
            <Navbar /> {/* อาจจะคงไว้ หรือเอาออกถ้า Bottom Nav จัดการทุกอย่าง */}

            {/* Main content area that will grow and allow scrolling if content is long */}
            <main className="flex-grow container mx-auto px-0 sm:px-4 py-4 md:py-6 overflow-y-auto">
                {/* Suspense for client components that might fetch data */}
                <Suspense fallback={<div className="text-center p-10">Loading page content...</div>}>
                    {children}
                </Suspense>
            </main>

            <BottomNavigationBar />
            {/* 
        Floating Action Button สำหรับ Upload อาจจะถูกเรียกใช้ใน BottomNavigationBar
        หรือถูกวางไว้ใน Layout นี้โดยตรง แล้วให้ BottomNav จัดการ State การซ่อน/แสดง ถ้าปุ่ม + มันทับ
      */}
        </div>
    );
}