// src/components/dashboard/FixedRefreshButton.tsx
'use client';

import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface FixedRefreshButtonProps {
    onClick: () => void;
    isLoading: boolean;
    className?: string; // สำหรับการปรับแต่งเพิ่มเติมจาก Parent
}

export default function FixedRefreshButton({ onClick, isLoading, className }: FixedRefreshButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            title="Refresh Scans"
            className={`fixed bottom-20 right-6 sm:bottom-8 sm:right-8 z-30  // ปรับ bottom สำหรับ BottomNav
                  bg-slate-700 hover:bg-slate-600 text-slate-200 
                  p-3 rounded-full shadow-lg hover:shadow-xl 
                  focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-75 
                  transition-all duration-200 transform hover:scale-105
                  disabled:opacity-60 disabled:cursor-wait
                  ${isLoading ? 'animate-pulse' : ''} ${className}`}
        >
            <ArrowPathIcon className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span> {/* สำหรับ Accessibility */}
        </button>
    );
}