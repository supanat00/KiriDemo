// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import ModelList from '@/components/dashboard/ModelList';
import ModelPreviewModal from '@/components/dashboard/ModelPreviewModal';
import FixedRefreshButton from '@/components/dashboard/FixedRefreshButton';
import { CubeIcon } from '@heroicons/react/24/outline';
import { ModelItem, mapPrismaScanToModelItem } from '@/types/scanTypes';


export default function ScansPage() {
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ModelItem | null>(null);
    const [models, setModels] = useState<ModelItem[]>([]); // เริ่มจาก Array ว่าง
    const [isLoading, setIsLoading] = useState(true); // isLoading สำหรับการโหลดข้อมูลทั้งหมด
    const [isRefreshingSingle, setIsRefreshingSingle] = useState<string | null>(null); // serialize ID ของโมเดลที่กำลัง Refresh เดี่ยว

    // Function to fetch models from our backend API (which gets from our DB)
    const fetchModelsFromDB = useCallback(async () => {
        setIsLoading(true);
        console.log('Fetching models from local DB via /api/scans...');
        try {
            const response = await fetch('/api/scans');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch scans: ${response.statusText}`);
            }
            const dbScans = await response.json();
            if (Array.isArray(dbScans)) {
                setModels(dbScans.map(mapPrismaScanToModelItem));
            } else {
                console.error("Fetched data is not an array:", dbScans);
                setModels([]);
            }
        } catch (error) {
            console.error("Error fetching local scans:", error);
            // TODO: แสดง Error message ให้ User เห็นใน UI
            setModels([]);
        } finally {
            setIsLoading(false);
        }
    }, []); // No dependencies, so it's stable

    // useEffect for initial data load
    useEffect(() => {
        fetchModelsFromDB();
    }, [fetchModelsFromDB]);

    // Function passed to ModelCard to refresh a single model's status
    // This will call our backend proxy, which calls KIRI and updates our DB
    const refreshSingleModelStatus = useCallback(async (serialize: string) => {
        setIsRefreshingSingle(serialize); // Set loading state for this specific card
        console.log(`Refreshing status for ${serialize} by calling our getStatus proxy...`);
        try {
            const response = await fetch(`/api/kiri/model/status?serialize=${serialize}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to refresh status for ${serialize}`);
            }
            const updatedStatusData = await response.json(); // { serialize, status }

            // อัปเดต State `models` ใน Frontend ทันทีหลังจาก KIRI ตอบกลับ (และ DB เราก็ควรจะอัปเดตแล้ว)
            setModels(prevModels =>
                prevModels.map(model =>
                    model.serialize === updatedStatusData.serialize
                        ? { ...model, status: updatedStatusData.status as ModelItem['status'] }
                        : model
                )
            );
            console.log(`Frontend state updated for ${serialize} with new status ${updatedStatusData.status}`);
        } catch (error) {
            console.error(`Error refreshing status for ${serialize}:`, error);
            // TODO: Show error specific to this card to the user
        } finally {
            setIsRefreshingSingle(null);
        }
    }, []); // No dependencies needed if it uses setModels with a function

    const handleOpenPreview = (model: ModelItem) => {
        setSelectedModel(model);
        setIsPreviewModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-24"> {/* pb-24 to ensure space for FAB and BottomNav */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 px-4 sm:px-0">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-100 flex items-center">
                    <CubeIcon className="h-8 w-8 mr-3 text-cyan-400" />
                    My Scans
                </h1>
            </div>

            <div className="px-4 sm:px-0">
                {isLoading && models.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <svg className="animate-spin h-8 w-8 text-cyan-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading scans...
                    </div>
                )}
                {!isLoading && models.length === 0 && (
                    <div className="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-500 mb-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                        <p className="text-xl text-slate-400">No 3D models yet.</p>
                        <p className="text-slate-500">Use the &apos;+&apos; button to upload your first video.</p>
                    </div>
                )}
                {models.length > 0 && (
                    <ModelList
                        models={models}
                        onPreview={handleOpenPreview}
                        onRefreshStatus={refreshSingleModelStatus}
                        refreshingSerializeId={isRefreshingSingle} // Pass this down to ModelCard
                    />
                )}
            </div>

            {isPreviewModalOpen && selectedModel && (
                <ModelPreviewModal
                    isOpen={isPreviewModalOpen}
                    onClose={() => setIsPreviewModalOpen(false)}
                    model={selectedModel}
                />
            )}

            <FixedRefreshButton
                onClick={fetchModelsFromDB} // ปุ่ม Refresh หลักจะดึงจาก Local DB
                isLoading={isLoading && models.length > 0} // แสดง Loading ถ้ากำลัง Fetch แต่ยังมีข้อมูลเก่าแสดงอยู่
            />
        </div>
    );
}