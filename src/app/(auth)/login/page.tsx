// src/app/(auth)/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid'; // เพิ่ม EyeIcon และ EyeSlashIcon

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // State สำหรับแสดง/ซ่อนรหัสผ่าน
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === 'authenticated') {
            router.replace('/dashboard');
        }
    }, [status, router]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn('credentials', {
                redirect: false,
                username: username,
                password: password, // ส่ง password ที่ผู้ใช้กรอกโดยตรง
            });

            if (result?.error) {
                setError(result.error === "CredentialsSignin" ? "Invalid username or password." : result.error);
                setIsLoading(false);
            } else if (result?.ok) {
                router.push('/dashboard');
            } else {
                setError("An unknown error occurred during login.");
                setIsLoading(false);
            }
        } catch (err: unknown) { // 1. เปลี่ยน any เป็น unknown
            let errorMessage = "An unknown error occurred during login."; // Default error message
            if (err instanceof Error) {
                // 2. ถ้า err เป็น Instance ของ Error object จริงๆ ก็สามารถเข้าถึง .message ได้อย่างปลอดภัย
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                // 3. ถ้า err เป็น String (บาง API อาจจะ throw string)
                errorMessage = err;
            }
            // (Optional) Log error จริงๆ ไว้เพื่อ Debug
            console.error("Login handleSubmit caught error:", err);

            setError(errorMessage);
            setIsLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100">
                <p>Loading...</p>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-6 text-gray-100">
                <div className="w-full max-w-md bg-slate-800/70 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-2xl">
                    <div className="mb-6 text-center">
                        <div className="absolute top-4 left-4 md:top-6 md:left-6">
                            <Link href="/" className="inline-flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                                <ArrowLeftIcon className="h-5 w-5 mr-1" />
                                Back to Home
                            </Link>
                        </div>
                        <h2 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400">
                            Admin Login
                        </h2>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <p className="text-sm text-red-400 bg-red-900/30 p-3 rounded-md text-center border border-red-700">
                                {error}
                            </p>
                        )}
                        <div>
                            <label htmlFor="username-input" className="block text-sm font-medium text-slate-300 mb-1">
                                Username
                            </label>
                            <input
                                id="username-input"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="appearance-none block w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                                placeholder="Enter username"
                            />
                        </div>

                        {/* Password Field with Show/Hide Button */}
                        <div>
                            <label htmlFor="password-input" className="block text-sm font-medium text-slate-300 mb-1">
                                Password
                            </label>
                            <div className="relative"> {/* Container สำหรับ Input และปุ่ม */}
                                <input
                                    id="password-input"
                                    name="password"
                                    type={showPassword ? "text" : "password"} // สลับ type ของ input
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 pr-10 py-2.5 bg-slate-700 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button" // สำคัญ: ป้องกันการ Submit Form
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-400 hover:text-slate-200 focus:outline-none"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
                            >
                                {isLoading ? (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>) : 'Sign in'}
                            </button>
                        </div>
                    </form>
                </div>
                <footer className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center text-slate-500 text-xs sm:text-sm">
                    <p>Photogrammetry Technology.</p>
                </footer>
            </div>
        );
    }
    return null;
}