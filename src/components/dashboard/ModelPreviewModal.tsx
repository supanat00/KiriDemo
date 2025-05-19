// src/components/dashboard/ModelPreviewModal.tsx
import Modal from '@/components/ui/Modal';
import { ModelItem } from '@/types/scanTypes'; // Import จากไฟล์ Types
import StatusBadge from './StatusBadge';
import { ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/react/24/outline'; // เปลี่ยน CubeIcon
import { useState } from 'react';

interface ModelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    model: ModelItem;
}

export default function ModelPreviewModal({ isOpen, onClose, model }: ModelPreviewModalProps) {
    const [isPreparingDownload, setIsPreparingDownload] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const canAttemptDownload = model.status === 2; // ปุ่ม Download จะ Enable เมื่อสถานะเป็น Successful

    const handleDownloadClick = async () => {
        if (!canAttemptDownload) return;
        setIsPreparingDownload(true);
        setDownloadError(null);
        try {
            const response = await fetch(`/api/kiri/model/download-link?serialize=${model.serialize}`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Failed to get download link (Status: ${response.status})`);
            }
            if (data.modelUrl) {
                const link = document.createElement('a');
                link.href = data.modelUrl;
                const fileName = `${model.name.replace(/[^a-zA-Z0-9_.\-]/g, '_') || model.serialize}.zip`;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                throw new Error(data.error || 'No download URL received from the server.');
            }
        } catch (error: unknown) {
            let errorMessage = 'Could not prepare download. Please try again.';
            if (error instanceof Error) { errorMessage = error.message; }
            else if (typeof error === 'string') { errorMessage = error; }
            console.error('Download initiation error:', error);
            setDownloadError(errorMessage);
        } finally {
            setIsPreparingDownload(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Model Details: ${model.name}`} size="2xl"> {/* เปลี่ยน Title และอาจจะปรับ Size */}
            <div className="space-y-6">
                {/* ส่วนสำหรับแสดง "No Preview" */}
                <div className="w-full p-6 bg-slate-700/50 rounded-lg flex flex-col items-center justify-center text-slate-400 border border-slate-600 min-h-[120px] sm:min-h-[150px]">
                    <InformationCircleIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-sky-500" />
                    <p className="font-medium text-slate-200 text-sm sm:text-base">3D Preview Not Available</p>
                    <p className="text-xs text-slate-500 mt-1 text-center">
                        Direct 3D model preview is not supported in this view. <br className="hidden sm:inline" />
                        You can download the model to view it in compatible software if processing is successful.
                    </p>
                </div>

                {/* Model Details Section */}
                <div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-100 mb-2 border-b border-slate-700 pb-2">
                        Details
                    </h4>
                    <dl className="divide-y divide-slate-700/50 text-xs sm:text-sm">
                        <div className="py-2.5 sm:py-3 grid grid-cols-3 gap-4">
                            <dt className="font-medium text-slate-400">Name</dt>
                            <dd className="text-slate-100 col-span-2 break-words">{model.name}</dd>
                        </div>
                        <div className="py-2.5 sm:py-3 grid grid-cols-3 gap-4">
                            <dt className="font-medium text-slate-400">Serialize ID</dt>
                            <dd className="text-slate-100 col-span-2 break-all">{model.serialize}</dd>
                        </div>
                        <div className="py-2.5 sm:py-3 grid grid-cols-3 gap-4 items-center">
                            <dt className="font-medium text-slate-400">Status</dt>
                            <dd className="text-slate-100 col-span-2">
                                <StatusBadge status={model.status} />
                            </dd>
                        </div>
                        <div className="py-2.5 sm:py-3 grid grid-cols-3 gap-4">
                            <dt className="font-medium text-slate-400">Created At</dt>
                            <dd className="text-slate-100 col-span-2">{model.createdAt}</dd>
                        </div>
                        {model.calculateType !== undefined && model.calculateType !== null && (
                            <div className="py-2.5 sm:py-3 grid grid-cols-3 gap-4">
                                <dt className="font-medium text-slate-400">Scan Type</dt>
                                <dd className="text-slate-100 col-span-2">
                                    {model.calculateType === 1 ? 'Photo Scan' : model.calculateType === 2 ? 'Featureless Object Scan' : model.calculateType === 3 ? '3DGS Scan' : 'Unknown'}
                                </dd>
                            </div>
                        )}
                        {model.fileFormatUsed && (
                            <div className="py-2.5 sm:py-3 grid grid-cols-3 gap-4">
                                <dt className="font-medium text-slate-400">Target Format</dt>
                                <dd className="text-slate-100 col-span-2">{model.fileFormatUsed.toUpperCase()}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {downloadError && (
                    <p className="text-sm text-center text-red-400 bg-red-800/40 p-3 rounded-md border border-red-700/50">
                        Error: {downloadError}
                    </p>
                )}

                {/* Download Button Section */}
                {canAttemptDownload && (
                    <div className="pt-4 sm:pt-5">
                        <button
                            onClick={handleDownloadClick}
                            disabled={isPreparingDownload}
                            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 disabled:opacity-70 disabled:cursor-wait transition-all hover:shadow-lg"
                        >
                            {isPreparingDownload ? ( /* ... SVG Spinner ... */ 'Preparing Download...') : (<><ArrowDownTrayIcon className="h-5 w-5 mr-2" /> Download Model (.zip)</>)}
                        </button>
                    </div>
                )}
                {!canAttemptDownload && (
                    <div className="pt-4 sm:pt-5 text-center">
                        <p className="text-sm text-slate-400">Model is not yet available for download.</p>
                        <p className="text-xs text-slate-500 mt-1">Current status: <StatusBadge status={model.status} /></p>
                    </div>
                )}
            </div>
        </Modal>
    );
}