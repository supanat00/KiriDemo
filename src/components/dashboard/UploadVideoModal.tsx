// src/components/dashboard/UploadVideoModal.tsx
// โค้ดที่คุณให้มาล่าสุด (สมมติว่าถูกต้องและสมบูรณ์สำหรับ UI และ Logic ภายใน Modal นี้)
// ไม่มีการเปลี่ยนแปลงในไฟล์นี้จากผมตามคำขอของคุณ
import Modal from '@/components/ui/Modal';
import { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import { ArrowUpTrayIcon, PlayIcon as PlaySolidIcon, XMarkIcon as XMarkSolidIcon } from '@heroicons/react/24/solid';

interface UploadVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (file: File, title: string) => Promise<void>; // รับแค่ file และ title
}

const MAX_FILE_SIZE_MB = 100;
const MAX_VIDEO_DURATION_SECONDS = 3 * 60;
const MAX_VIDEO_WIDTH = 1920;
const MAX_VIDEO_HEIGHT = 1080;

export default function UploadVideoModal({ isOpen, onClose, onUpload }: UploadVideoModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('Untitled');
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
    const [showFullscreenPlayer, setShowFullscreenPlayer] = useState(false);
    const videoRefForValidation = useRef<HTMLVideoElement>(null);
    const fullscreenVideoRef = useRef<HTMLVideoElement>(null);

    const resetFormState = () => {
        setFile(null);
        setTitle('Untitled'); // กลับไปใช้ Untitled ตามที่คุณต้องการ
        setError(null);
        setIsUploading(false);
        if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
        setVideoObjectUrl(null);
        setShowFullscreenPlayer(false);
    };

    const handleClose = () => {
        resetFormState();
        onClose();
    };

    const validateVideoFile = (videoFile: File, videoElement: HTMLVideoElement): Promise<string | null> => {
        return new Promise((resolve) => {
            if (!videoFile.type.startsWith('video/')) {
                resolve('Please select a valid video file.'); return;
            }
            if (videoFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                resolve(`File size should not exceed ${MAX_FILE_SIZE_MB}MB.`); return;
            }
            const onLoadedMeta = () => {
                videoElement.removeEventListener('loadedmetadata', onLoadedMeta);
                videoElement.removeEventListener('error', onMetaError);
                if (videoElement.duration > MAX_VIDEO_DURATION_SECONDS) {
                    resolve(`Video duration should not exceed ${MAX_VIDEO_DURATION_SECONDS / 60} minutes.`);
                } else if (videoElement.videoWidth > MAX_VIDEO_WIDTH || videoElement.videoHeight > MAX_VIDEO_HEIGHT) {
                    resolve(`Video resolution must not exceed ${MAX_VIDEO_WIDTH}x${MAX_VIDEO_HEIGHT}. Current: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
                } else {
                    resolve(null);
                }
            };
            const onMetaError = () => {
                videoElement.removeEventListener('loadedmetadata', onLoadedMeta);
                videoElement.removeEventListener('error', onMetaError);
                resolve('Could not load video metadata. Please try a different file.');
            };
            videoElement.addEventListener('loadedmetadata', onLoadedMeta);
            videoElement.addEventListener('error', onMetaError);

            // Crucial: Set src to load metadata. Create a new URL for this specific validation instance.
            const tempValidationUrl = URL.createObjectURL(videoFile);
            if (videoElement.src && videoElement.src.startsWith('blob:')) {
                URL.revokeObjectURL(videoElement.src); // Clean up old one if exists for this element
            }
            videoElement.src = tempValidationUrl;
            videoElement.load();
            // Do NOT revoke tempValidationUrl here. It's needed for the async listeners.
            // It will be revoked by the listeners themselves or if the main videoObjectUrl changes.
            // Or, better yet, manage its lifecycle carefully if passed around.
        });
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
        setVideoObjectUrl(null); setFile(null); setShowFullscreenPlayer(false); setError(null);
        setTitle('Untitled');

        if (event.target.files && event.target.files[0]) {
            const selectedFile = event.target.files[0];
            const newObjectUrlForDisplay = URL.createObjectURL(selectedFile);
            setVideoObjectUrl(newObjectUrlForDisplay);

            if (videoRefForValidation.current) {
                const validationError = await validateVideoFile(selectedFile, videoRefForValidation.current);
                // The URL used inside validateVideoFile for videoRefForValidation.current should be revoked by it or its listeners.
                if (validationError) {
                    setError(validationError); setFile(null);
                    URL.revokeObjectURL(newObjectUrlForDisplay); // Clean up display URL
                    setVideoObjectUrl(null);
                    return;
                }
                setFile(selectedFile);
                if (title === 'Untitled' || !title.trim()) {
                    setTitle(selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name);
                }
            } else {
                console.error("Validation video ref is not available for file change.");
                setError("Internal error: Cannot validate video on file change.");
                URL.revokeObjectURL(newObjectUrlForDisplay);
                setVideoObjectUrl(null);
            }
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!file) { setError('Please select a video file.'); return; }
        if (!title.trim() || title.trim().toLowerCase() === 'untitled') { setError('Please enter a valid model title.'); return; }

        if (videoRefForValidation.current && file) {
            if (videoRefForValidation.current.src && videoRefForValidation.current.src.startsWith('blob:')) URL.revokeObjectURL(videoRefForValidation.current.src);
            videoRefForValidation.current.src = URL.createObjectURL(file);

            const validationError = await validateVideoFile(file, videoRefForValidation.current);
            if (videoRefForValidation.current.src && videoRefForValidation.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(videoRefForValidation.current.src);
                videoRefForValidation.current.src = "";
            }
            if (validationError) { setError(validationError); return; }
        } else {
            setError("Could not re-validate video. Please re-select the file."); return;
        }

        setIsUploading(true); setError(null);
        try {
            await onUpload(file, title.trim());
            resetFormState();
        } catch (uploadError: unknown) { // <--- เปลี่ยน uploadError: any เป็น uploadError: unknown
            let errorMessage = 'Upload failed. Please check details and try again.';
            if (uploadError instanceof Error) {
                errorMessage = uploadError.message;
            } else if (typeof uploadError === 'string') {
                errorMessage = uploadError;
            }
            console.error("Upload error in modal:", uploadError); // Log the original error
            setError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        // Cleanup for the main videoObjectUrl when it changes or component unmounts
        const currentVideoUrl = videoObjectUrl;
        return () => {
            if (currentVideoUrl) {
                URL.revokeObjectURL(currentVideoUrl);
            }
        };
    }, [videoObjectUrl]);

    useEffect(() => {
        // Cleanup for the validation video element's src when the modal is closed (isOpen becomes false)
        // This is important as validateVideoFile might set its src to a new object URL
        if (!isOpen) {
            if (videoRefForValidation.current && videoRefForValidation.current.src && videoRefForValidation.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(videoRefForValidation.current.src);
                videoRefForValidation.current.src = ""; // Clear it
            }
        }
    }, [isOpen]);


    useEffect(() => {
        if (showFullscreenPlayer && fullscreenVideoRef.current) {
            fullscreenVideoRef.current.play().catch(err => console.error("Error playing video:", err));
        }
    }, [showFullscreenPlayer]);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Upload Video for Photo Scan" size="xl">
            <div className="mb-6 p-4 bg-sky-800/70 border border-sky-600 rounded-lg text-sm text-sky-100 shadow-md">
                <p className="font-semibold text-base mb-1.5">Video Requirements:</p>
                <ul className="list-disc list-inside ml-2 space-y-1 text-xs">
                    <li>Resolution up to {MAX_VIDEO_WIDTH}x{MAX_VIDEO_HEIGHT}.</li>
                    <li>Duration up to {MAX_VIDEO_DURATION_SECONDS / 60} minutes.</li>
                    <li>Max file size: {MAX_FILE_SIZE_MB}MB.</li>
                </ul>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && <p className="text-sm text-red-300 bg-red-800/50 p-3 rounded-lg border border-red-700">{error}</p>}
                <div>
                    <label htmlFor="modelTitle" className="block text-sm font-medium text-slate-200 mb-1.5">Model Title</label>
                    <input id="modelTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                        className="appearance-none block w-full px-3.5 py-2.5 bg-slate-700 border-slate-600 rounded-lg shadow-sm placeholder-slate-400 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                        placeholder="e.g., My Awesome Scan" />
                </div>

                <div>
                    <label htmlFor="videoFile-input-trigger" className="block text-sm font-medium text-slate-200 mb-1.5">Video File</label>
                    <div
                        className="mt-1 relative w-full h-48 sm:h-56 md:h-64 border-2 border-slate-600 hover:border-cyan-500/80 border-dashed rounded-lg bg-slate-800 overflow-hidden cursor-pointer group transition-colors duration-200"
                        onClick={() => document.getElementById('videoFile-input-trigger')?.click()}
                    >
                        <video ref={videoRefForValidation} className="hidden" preload="metadata" muted playsInline></video>
                        {videoObjectUrl ? (
                            <>
                                <video src={videoObjectUrl} muted playsInline preload="metadata" className="w-full h-full object-cover pointer-events-none" onCanPlay={(e) => e.currentTarget.volume = 0} key={videoObjectUrl} />
                                <div onClick={(e) => { e.stopPropagation(); setShowFullscreenPlayer(true); }}
                                    className="absolute inset-0 bg-black opacity-80 flex flex-col items-center justify-center transition-all duration-300">
                                    <PlaySolidIcon className="h-12 w-12 sm:h-16 sm:w-16 text-white/80 group-hover:text-white transition-opacity" />
                                    <p className="mt-2 text-white/90 text-xs sm:text-sm font-semibold group-hover:text-white">Preview Video</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4 pointer-events-none">
                                <ArrowUpTrayIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-400" />
                                <div className="flex text-xs sm:text-sm text-slate-400 mt-2 justify-center">
                                    <span className="font-medium text-cyan-400">Upload a file</span>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Video files up to {MAX_FILE_SIZE_MB}MB</p>
                            </div>
                        )}
                        <input id="videoFile-input-trigger" name="videoFile" type="file" className="sr-only" accept="video/*" onChange={handleFileChange} />
                    </div>
                    {file && !showFullscreenPlayer && (
                        <p className="mt-2.5 text-sm text-slate-300">
                            Selected: <span className="font-medium text-cyan-400">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    )}
                </div>

                {showFullscreenPlayer && videoObjectUrl && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fadeIn">
                        <div className="relative w-full max-w-screen-lg max-h-[90vh] bg-black rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <video ref={fullscreenVideoRef} src={videoObjectUrl} controls autoPlay className="w-full h-auto max-h-[90vh] object-contain rounded-xl" />
                            <button onClick={() => setShowFullscreenPlayer(false)}
                                className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/60 hover:bg-black/80 p-2 rounded-full text-white transition-colors z-20"
                                aria-label="Close video preview">
                                <XMarkSolidIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={isUploading || !file || showFullscreenPlayer}
                        className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-lg active:scale-[0.99]"
                    >
                        {isUploading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing Upload...
                            </>
                        ) : (
                            'Upload & Start Photo Scan'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}