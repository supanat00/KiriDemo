// src/components/navigation/BottomNavigationBar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
import { HomeIcon, PlusCircleIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';
import UploadVideoModal from '@/components/dashboard/UploadVideoModal';

// Interface for default parameters, can be moved to a shared types file
interface PhotoScanVideoApiParams {
    modelQuality: string;
    textureQuality: string;
    fileFormat: string;
    isMask: string;
    textureSmoothing: string;
}

export default function BottomNavigationBar() {
    const pathname = usePathname();
    const router = useRouter(); // Initialize useRouter
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isGlobalUploading, setIsGlobalUploading] = useState(false); // Optional: global loading state for the button

    const navItems = [
        { href: '/dashboard', label: 'Scans', icon: HomeIcon },
        { href: '/dashboard/profile', label: 'Profile', icon: UserCircleIcon },
    ];

    // This function will now handle the actual API call
    const handleActualUpload = async (file: File, title: string): Promise<void> => {
        console.log("BottomNav: handleActualUpload called with:", { title, fileName: file.name });
        setIsGlobalUploading(true); // Optional: visual feedback on the + button or elsewhere

        const formData = new FormData();
        formData.append('videoFile', file);
        formData.append('modelTitle', title);

        // Default Parameters for Photo Scan (Video)
        const defaultParams: PhotoScanVideoApiParams = {
            modelQuality: "1",      // Medium
            textureQuality: "1",    // 2K
            fileFormat: "GLB",      // GLB
            isMask: "1",            // On
            textureSmoothing: "1",  // On
        };
        Object.entries(defaultParams).forEach(([key, value]) => formData.append(key, value));

        try {
            const response = await fetch('/api/kiri/create/photo-scan-video', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('BottomNav: API Route Error for create/photo-scan-video:', result.error, result.details, result.errorCode);
                throw new Error(result.error || `Scan creation request failed (HTTP ${response.status})`);
            }

            console.log('BottomNav: Scan creation request successful:', result);
            setIsUploadModalOpen(false); // Close modal on success

            // IMPORTANT: Refresh the current route's data
            // This will re-run data fetching on the server for Server Components
            // and re-trigger useEffects in Client Components if their dependencies change
            // or if they fetch data without specific cache-busting.
            // For /api/scans, ensure it has `cache: 'no-store'` or revalidates appropriately.
            router.refresh();
            console.log("BottomNav: router.refresh() called to update scans list.");

        } catch (error) {
            console.error('BottomNav: Error during photo scan video upload:', error);
            // Error will be caught by UploadVideoModal's handleSubmit and displayed there
            throw error;
        } finally {
            setIsGlobalUploading(false);
        }
    };

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-top-lg z-40">
                <div className="max-w-screen-md mx-auto h-16 flex items-center justify-around px-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href === '/dashboard' && pathname.startsWith('/dashboard') && pathname !== '/dashboard/profile');
                        return (
                            <Link key={item.label} href={item.href} className={`flex flex-col items-center justify-center w-1/4 p-2 rounded-md transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-300'}`}>
                                <item.icon className={`h-6 w-6 ${isActive ? 'transform scale-110' : ''}`} />
                                <span className={`text-xs mt-0.5 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                    <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-[calc(50%+10px)] sm:-translate-y-[calc(50%+12px)] z-50">
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            disabled={isGlobalUploading} // Disable + button while an upload is in progress via this nav
                            title="Upload New Video"
                            className={`bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transition-all duration-300 transform hover:scale-110 ${isGlobalUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isGlobalUploading ? (
                                <svg className="animate-spin h-7 w-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <PlusCircleIcon className="h-8 w-8 sm:h-9" />
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {isUploadModalOpen && (
                <UploadVideoModal
                    isOpen={isUploadModalOpen}
                    onClose={() => {
                        if (!isGlobalUploading) setIsUploadModalOpen(false); // Prevent closing if an upload is active via this modal
                    }}
                    onUpload={handleActualUpload} // ส่งฟังก์ชันนี้ไป
                />
            )}
        </>
    );
}