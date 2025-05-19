// src/components/dashboard/ModelList.tsx
import ModelCard from './ModelCard';
import { ModelItem } from '@/types/scanTypes'; // Import ModelItem type

interface ModelListProps {
    models: ModelItem[];
    onPreview: (model: ModelItem) => void;
    onRefreshStatus: (serialize: string) => void;
    refreshingSerializeId?: string | null; // New prop
}

export default function ModelList({ models, onPreview, onRefreshStatus }: ModelListProps) {
    if (models.length === 0) {
        return (
            <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-500 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                <p className="text-xl text-slate-400">No 3D models yet.</p>
                <p className="text-slate-500">Click the &quot;+&quot; button to upload your first video.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {models.map((model) => (
                <ModelCard
                    key={model.id}
                    model={model}
                    onPreview={() => onPreview(model)}
                    onRefreshStatus={() => onRefreshStatus(model.serialize)}
                />
            ))}
        </div>
    );
}