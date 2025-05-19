// src/components/dashboard/ModelCard.tsx
import StatusBadge from './StatusBadge';
import { ModelItem } from '@/types/scanTypes'; // Import จากไฟล์ Types ใหม่
import { InformationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'; // เปลี่ยน EyeIcon เป็น InformationCircleIcon
// import Image from 'next/image'; // ไม่จำเป็นแล้วถ้าไม่แสดง Thumbnail จาก previewUrl

interface ModelCardProps {
    model: ModelItem;
    onViewDetails: () => void; // เปลี่ยนชื่อ Prop จาก onPreview
    onRefreshStatus: () => void;
    refreshingSerializeId?: string | null;
}

export default function ModelCard({ model, onViewDetails, onRefreshStatus, refreshingSerializeId }: ModelCardProps) {
    // console.log(`[ModelCard] Data for "${model.name}": Status = ${model.status}`);

    // ปุ่ม "View Details" จะ Enable เมื่อโมเดลประมวลผลสำเร็จ
    // หรืออาจจะ Enable ในสถานะอื่นด้วยถ้าต้องการให้ดู Details ได้ (เช่น Failed, Expired)
    const canViewDetails = model.status === 2 || model.status === 1 || model.status === 4; // Successful, Failed, Expired

    const isCurrentlyProcessing = model.status === -1 || model.status === 0 || model.status === 3;
    const showRefreshButton = isCurrentlyProcessing || model.status === 1 || model.status === 4; // แสดงปุ่ม Refresh ถ้ากำลัง Process, Failed, หรือ Expired
    const isThisCardRefreshing = refreshingSerializeId === model.serialize;

    return (
        <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-cyan-500/30 hover:scale-[1.02] min-h-[360px] sm:min-h-[380px]">
            {/* Placeholder Thumbnail Area */}
            <div className="w-full h-40 sm:h-48 bg-slate-700 flex items-center justify-center border-b border-slate-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 sm:w-20 sm:h-20 text-slate-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
            </div>

            {/* Card Content */}
            <div className="p-4 sm:p-5 flex-grow flex flex-col">
                <h3 className="text-base sm:text-lg font-semibold text-gray-100 mb-1 truncate" title={model.name}>
                    {model.name}
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                    Created: {model.createdAt}
                </p>
                <div className="mb-3 sm:mb-4">
                    <StatusBadge status={model.status} />
                </div>
                <p className="text-xs text-slate-500 mb-3 sm:mb-4 truncate" title={model.serialize}>
                    ID: {model.serialize}
                </p>

                {/* Action Buttons */}
                <div className="mt-auto space-y-2 pt-2">
                    <button
                        onClick={onViewDetails}
                        disabled={!canViewDetails || isThisCardRefreshing}
                        className={`w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm transition-colors duration-150
                        ${canViewDetails && !isThisCardRefreshing
                                ? 'text-white bg-sky-600 hover:bg-sky-500 focus:ring-sky-500'
                                : 'text-slate-500 bg-slate-700 cursor-not-allowed opacity-60'
                            } 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800`}
                    >
                        <InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        View Details
                    </button>

                    {showRefreshButton && (
                        <button
                            onClick={onRefreshStatus}
                            disabled={isThisCardRefreshing}
                            className={`w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-600 text-xs sm:text-sm font-medium rounded-md shadow-sm transition-colors duration-150
                          ${isThisCardRefreshing
                                    ? 'text-slate-500 bg-slate-600 cursor-wait'
                                    : 'text-slate-300 bg-slate-700 hover:bg-slate-600 focus:ring-cyan-500'
                                }
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800`}
                        >
                            <ArrowPathIcon className={`h-4 w-4 sm:h-5 sm:w-5 mr-2 ${isThisCardRefreshing ? 'animate-spin' : ''}`} />
                            {isThisCardRefreshing ? 'Refreshing...' : 'Refresh Status'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}