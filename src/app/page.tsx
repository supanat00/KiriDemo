// src/app/page.tsx
'use client';
import Link from 'next/link';
import { LockClosedIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useSession, signOut } from 'next-auth/react';

export default function HomePage() {
  const { data: session, status } = useSession();

  const renderAuthButton = () => {
    if (status === "loading") {
      // กำลังโหลด Session, อาจจะแสดง Placeholder หรือปุ่มแบบ Disabled
      return (
        <button
          disabled
          className="inline-flex items-center justify-center px-16 py-4 bg-gray-500 text-white text-xl font-semibold rounded-lg shadow-xl cursor-not-allowed"
        >
          Loading...
        </button>
      );
    }

    if (session) {
      // ถ้ามี Session (ผู้ใช้ Login แล้ว)
      return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-10 py-3 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white text-lg font-semibold rounded-lg shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <UserCircleIcon className="mr-2 h-6 w-6" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/' })} // Logout และกลับมาหน้าแรก
            className="inline-flex items-center justify-center px-10 py-3 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowRightOnRectangleIcon className="mr-2 h-6 w-6" />
            Logout
          </button>
        </div>
      );
    }

    // ถ้าไม่มี Session (ผู้ใช้ยังไม่ได้ Login)
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center px-16 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xl font-semibold rounded-lg shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500 focus:ring-opacity-50"
      >
        <LockClosedIcon className="mr-3 h-6 w-6" />
        Login
      </Link>
    );
  };



  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-gray-100">
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 mb-4 md:mb-6">
          ระบบทดลอง Photogrammetry
        </h1>

        <p className="text-lg md:text-xl text-slate-300 mb-8 md:mb-12">
          สำหรับการสร้างโมเดล 3 มิติจากวิดีโอ
        </p>

        {renderAuthButton()}
      </div>

      <footer className="absolute bottom-8 left-0 right-0 text-center text-slate-500 text-sm">
        <p>Photogrammetry Technology.</p>
      </footer>
    </div>
  );
}