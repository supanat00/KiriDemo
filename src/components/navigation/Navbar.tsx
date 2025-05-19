// src/components/navigation/Navbar.tsx
'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="bg-slate-800 shadow-lg">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/dashboard" className="flex-shrink-0 text-xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                            Photogrammetry Dashboard
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        {session?.user && (
                            <>
                                <span className="text-sm text-slate-300 hidden sm:block">
                                    Welcome, {session.user.name || 'Admin'}
                                </span>
                                {/* Optional: Settings Icon */}
                                {/* <button
                  title="Settings"
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white"
                >
                  <Cog6ToothIcon className="h-6 w-6" />
                </button> */}
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    title="Sign Out"
                                    className="flex items-center p-2 rounded-md text-sm font-medium text-slate-300 hover:bg-red-700 hover:text-white transition-colors"
                                >
                                    <ArrowLeftOnRectangleIcon className="h-5 w-5 sm:mr-1" />
                                    <span className="hidden sm:inline">Sign Out</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}