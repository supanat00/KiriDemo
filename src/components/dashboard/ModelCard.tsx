// src/components/dashboard/ModelCard.tsx
import StatusBadge from './StatusBadge';
import { ModelItem } from '@/types/scanTypes';
import { EyeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Image from 'next/image'; // For placeholder

interface ModelCardProps {
    model: ModelItem;
    onPreview: () => void;
    onRefreshStatus: () => void;
    refreshingSerializeId?: string | null; // New prop
}

export default function ModelCard({ model, onPreview, onRefreshStatus }: ModelCardProps) {
    const canPreview = model.status === 2 && model.previewUrl;

    const isProcessing = model.status === -1 || model.status === 0 || model.status === 3;

    return (
        <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-cyan-500/30 hover:scale-[1.02]">
            {/* Placeholder for Thumbnail - Replace with actual thumbnail if available */}
            <div className="w-full h-48 bg-slate-700 flex items-center justify-center">
                {/* Example: Use a generic 3D icon or a placeholder image */}
                {model.previewUrl && model.status === 2 ? (
                    <Image src={`/placeholder-thumbnail.png`} alt={model.name} width={192} height={192} className="object-cover opacity-80" /> // Replace with actual thumbnail
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                )}
            </div>

            <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-lg font-semibold text-gray-100 mb-1 truncate" title={model.name}>
                    {model.name}
                </h3>
                <p className="text-xs text-slate-400 mb-3">Created: {model.createdAt}</p>
                <div className="mb-4">
                    <StatusBadge status={model.status} />
                </div>
                <p className="text-xs text-slate-500 mb-4 truncate">Serialize: {model.serialize}</p>

                <div className="mt-auto space-y-2">
                    <button
                        onClick={onPreview}
                        disabled={!canPreview}
                        className={`w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm 
                        ${canPreview
                                ? 'text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500'
                                : 'text-slate-400 bg-slate-700 cursor-not-allowed'
                            } 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    >
                        <EyeIcon className="h-5 w-5 mr-2" />
                        Preview Model
                    </button>
                    {/* Download button (optional, could be inside preview modal) */}
                    {/* {canDownload && (
            <a
              href={model.downloadUrl}
              download
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-600 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Download
            </a>
          )} */}
                    {isProcessing && (
                        <button
                            onClick={onRefreshStatus}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-600 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500"
                        >
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Refresh Status
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}