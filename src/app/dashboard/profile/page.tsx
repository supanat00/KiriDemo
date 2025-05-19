'use client';

import { useSession, signOut } from 'next-auth/react';
import { UserCircleIcon, CreditCardIcon, Cog6ToothIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import useSWR from 'swr'; // Import SWR
import Link from 'next/link'; // For navigation if needed

// Fetcher function สำหรับ SWR
const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) {
        // สามารถโยน Error ที่มีข้อมูลจาก Response ได้
        return res.json().then(errorData => {
            const error = new Error(errorData.error || 'An error occurred while fetching the data.');
            // @ts-expect-error // สามารถเพิ่ม custom properties ให้ Error object ได้
            error.info = errorData.details || 'No additional details';
            // @ts-expect-error // สามารถเพิ่ม custom properties ให้ Error object ได้
            error.status = res.status;
            throw error;
        });
    }
    return res.json();
});


export default function ProfilePage() {
    const { data: session } = useSession();

    // ใช้ SWR เพื่อดึงข้อมูล Balance
    // '/api/kiri/profile/balance' คือ Key ของ SWR (และ URL ที่จะ Fetch)
    // `fetcher` คือฟังก์ชันที่จะใช้ Fetch ข้อมูล
    // `refreshInterval: 10000` (10 วินาที) หรือค่าที่คุณต้องการ (Optional: เพื่อ Auto-refresh)
    // SWR จะ Revalidate on focus, on reconnect โดยอัตโนมัติ
    const { data: balanceData, error: balanceError, isLoading: isLoadingBalance, mutate: mutateBalance } = useSWR<{ balance: number }>(
        session ? '/api/kiri/profile/balance' : null, // Fetch เฉพาะเมื่อมี Session
        fetcher,
        {
            refreshInterval: 30000, // Re-fetch ทุก 30 วินาที (ปรับตามความเหมาะสม)
            revalidateOnFocus: true, // Re-fetch เมื่อ Tab กลับมา Active
            revalidateOnReconnect: true, // Re-fetch เมื่อ Network กลับมา Online
            // dedupingInterval: 5000, // (Optional) ไม่ Fetch ซ้ำภายใน 5 วินาที
        }
    );

    if (!session?.user) {
        return (
            <div className="flex flex-col min-h-[calc(100vh-10rem)] items-center justify-center text-slate-400 p-10">
                <p>Loading user profile or not authenticated...</p>
                <Link href="/login" className="mt-4 text-cyan-400 hover:text-cyan-300">
                    Please login
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl mx-auto px-2 sm:px-4 pb-20">
            {/* User Info Card */}
            <div className="flex items-center space-x-4 p-6 bg-slate-800 rounded-xl shadow-lg">
                <UserCircleIcon className="h-16 w-16 sm:h-20 sm:w-20 text-cyan-400 p-1 border-2 border-cyan-500/70 rounded-full" />
                <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-gray-100">
                        {session.user.name || 'Admin User'}
                    </h1>
                    <p className="text-sm text-slate-400">{session.user.email || 'admin@example.com'}</p>
                </div>
            </div>

            {/* Credit Balance Card */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-100 flex items-center">
                        <CreditCardIcon className="h-6 w-6 mr-2 text-teal-400" />
                        API Credit Balance
                    </h2>
                    <button
                        onClick={() => mutateBalance()} // Trigger re-fetch on demand
                        disabled={isLoadingBalance}
                        className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        title="Refresh balance"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isLoadingBalance ? 'animate-spin' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001a7.5 7.5 0 01-1.06 3.589m-1.06 3.589a7.5 7.5 0 01-3.75 2.475m3.75-2.475a7.5 7.5 0 01-1.064 2.475m-1.064-2.475L12 18.75m-4.992-9.348h4.992V9.348a7.5 7.5 0 01-1.06 3.589m-1.06 3.589a7.5 7.5 0 01-3.75 2.475m3.75-2.475a7.5 7.5 0 01-1.064 2.475m-1.064 2.475L12 18.75m-4.992-9.348H2.25V9.348a7.5 7.5 0 011.06-3.589m1.06 3.589a7.5 7.5 0 013.75-2.475m-3.75 2.475a7.5 7.5 0 011.064-2.475m1.064-2.475L12 3.75" />
                        </svg>
                    </button>
                </div>

                {isLoadingBalance && !balanceData && ( // แสดง Loading Skeleton เฉพาะตอนโหลดครั้งแรก
                    <div className="animate-pulse">
                        <div className="h-8 bg-slate-700 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                    </div>
                )}
                {balanceError && (
                    <p className="text-red-400 text-sm">
                        Could not load balance: {balanceError.message || 'Unknown error'}
                    </p>
                )}
                {!isLoadingBalance && balanceData && (
                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                        {balanceData.balance.toLocaleString()} <span className="text-lg text-slate-400 font-normal">Credits</span>
                    </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                    Credits are used for processing 3D models via the API.
                </p>
            </div>

            {/* Other Settings (Placeholder) */}
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                    <Cog6ToothIcon className="h-6 w-6 mr-2 text-sky-400" />
                    Settings
                </h2>
                <p className="text-slate-400 text-sm">
                    Account settings and preferences will be available here in a future update.
                </p>
            </div>

            {/* Sign Out Button */}
            <div className="mt-8">
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-colors"
                >
                    <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}