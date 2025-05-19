// src/components/dashboard/StatusBadge.tsx
import { ModelItem } from '@/types/scanTypes';

interface StatusBadgeProps {
    status: ModelItem['status'];
}

const statusMap: Record<ModelItem['status'], { text: string; colorClasses: string }> = {
    '-1': { text: 'Uploading', colorClasses: 'bg-sky-500/20 text-sky-300 border-sky-500' },
    '0': { text: 'Processing', colorClasses: 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse' },
    '1': { text: 'Failed', colorClasses: 'bg-red-500/20 text-red-300 border-red-500' },
    '2': { text: 'Successful', colorClasses: 'bg-green-500/20 text-green-300 border-green-500' },
    '3': { text: 'Queuing', colorClasses: 'bg-indigo-500/20 text-indigo-300 border-indigo-500' },
    '4': { text: 'Expired', colorClasses: 'bg-slate-500/20 text-slate-300 border-slate-500' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
    const { text, colorClasses } = statusMap[status] || { text: 'Unknown', colorClasses: 'bg-gray-700 text-gray-300 border-gray-500' };

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
        >
            {text}
        </span>
    );
}