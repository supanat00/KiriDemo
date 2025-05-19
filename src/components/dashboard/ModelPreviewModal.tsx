// src/components/dashboard/ModelPreviewModal.tsx
import Modal from '@/components/ui/Modal';
import { ModelItem } from '@/types/scanTypes'; // สมมติว่าย้าย ModelItem ไปที่นี่
import StatusBadge from './StatusBadge';
import { ArrowDownTrayIcon, CubeTransparentIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface ModelPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    model: ModelItem;
}

export default function ModelPreviewModal({ isOpen, onClose, model }: ModelPreviewModalProps) {
    const [isPreparingDownload, setIsPreparingDownload] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const canAttemptDownload = model.status === 2;

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
                console.log('Download initiated for:', data.modelUrl);
            } else {
                throw new Error(data.error || 'No download URL received from the server.');
            }
        } catch (error: unknown) { // <--- เปลี่ยน error: any เป็น error: unknown
            let errorMessage = 'Could not prepare download. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            console.error('Download initiation error:', error); // Log the original error
            setDownloadError(errorMessage);
        } finally {
            setIsPreparingDownload(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Preview: ${model.name}`} size="3xl">
            <div className="space-y-6">
                {/* Placeholder for 3D Viewer */}
                <div className="w-full h-72 md:h-96 bg-slate-700/70 rounded-lg flex items-center justify-center text-slate-400 border border-slate-600">
                    {model.previewUrl && model.status === 2 ? (
                        <div className="text-center p-4">
                            <CubeTransparentIcon className="h-20 w-20 sm:h-24 sm:w-24 mx-auto mb-3 text-cyan-500" />
                            <p className="font-semibold text-slate-200">3D Preview Area</p>
                            <p className="text-xs text-slate-500">(Interactive viewer to be implemented)</p>
                        </div>
                    ) : (
                        <div className="text-center p-4">
                            <CubeTransparentIcon className="h-20 w-20 sm:h-24 sm:w-24 mx-auto mb-3 text-slate-600" />
                            <p className="font-semibold text-slate-300">Preview Not Available</p>
                            {model.status !== 2 && <p className="text-xs text-slate-500">(Model not successfully processed yet)</p>}
                        </div>
                    )}
                </div>

                {/* Model Details Section */}
                <div>
                    <h4 className="text-lg font-semibold text-gray-100 mb-2 border-b border-slate-700 pb-2">
                        Model Details
                    </h4>
                    <dl className="divide-y divide-slate-700/50">
                        <div className="py-3 grid grid-cols-3 gap-4">
                            <dt className="text-sm font-medium text-slate-400">Serialize ID</dt>
                            <dd className="mt-1 text-sm text-slate-100 sm:mt-0 col-span-2 break-all">{model.serialize}</dd>
                        </div>
                        <div className="py-3 grid grid-cols-3 gap-4 items-center">
                            <dt className="text-sm font-medium text-slate-400">Status</dt>
                            <dd className="mt-1 text-sm text-slate-100 sm:mt-0 col-span-2">
                                <StatusBadge status={model.status} />
                            </dd>
                        </div>
                        <div className="py-3 grid grid-cols-3 gap-4">
                            <dt className="text-sm font-medium text-slate-400">Created At</dt>
                            <dd className="mt-1 text-sm text-slate-100 sm:mt-0 col-span-2">{model.createdAt}</dd>
                        </div>
                        {model.calculateType !== undefined && ( // Check if calculateType exists and is not null/undefined
                            <div className="py-3 grid grid-cols-3 gap-4">
                                <dt className="text-sm font-medium text-slate-400">Scan Type</dt>
                                <dd className="mt-1 text-sm text-slate-100 sm:mt-0 col-span-2">
                                    {model.calculateType === 1 ? 'Photo Scan' : model.calculateType === 2 ? 'Featureless Object Scan' : model.calculateType === 3 ? '3DGS Scan' : 'Unknown'}
                                </dd>
                            </div>
                        )}
                        {model.fileFormatUsed && (
                            <div className="py-3 grid grid-cols-3 gap-4">
                                <dt className="text-sm font-medium text-slate-400">Target Format</dt>
                                <dd className="mt-1 text-sm text-slate-100 sm:mt-0 col-span-2">{model.fileFormatUsed.toUpperCase()}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {downloadError && (
                    <p className="text-sm text-center text-red-400 bg-red-800/40 p-3 rounded-md border border-red-700/50">
                        Error: {downloadError}
                    </p>
                )}

                {canAttemptDownload && (
                    <div className="pt-5">
                        <button
                            onClick={handleDownloadClick}
                            disabled={isPreparingDownload}
                            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 disabled:opacity-70 disabled:cursor-wait transition-all hover:shadow-lg"
                        >
                            {isPreparingDownload ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Preparing Download...
                                </>
                            ) : (
                                <>
                                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                                    Download Model (.zip)
                                </>
                            )}
                        </button>
                    </div>
                )}
                {!canAttemptDownload && (
                    <div className="pt-5 text-center">
                        <p className="text-sm text-slate-400">Model is not yet available for download.</p>
                        <p className="text-xs text-slate-500 mt-1">Current status: <StatusBadge status={model.status} /></p>
                    </div>
                )}
            </div>
        </Modal>
    );
}