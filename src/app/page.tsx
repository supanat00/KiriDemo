"use client";

import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import Image from "next/image" // คุณ import Image แต่ไม่ได้ใช้ในโค้ดที่ให้มา ถ้าไม่ใช้ก็ลบได้
import { Plus, UploadCloud, Video as VideoIcon, RefreshCw, CheckCircle, AlertTriangle, Download, Eye, Loader2 } from 'lucide-react';
import type { Job, ProcessingJobUI, CompletedItemUI } from '@/types/project';

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function HomePage() {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [processingJobs, setProcessingJobs] = useState<ProcessingJobUI[]>([]);
  const [completedItems, setCompletedItems] = useState<CompletedItemUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchJobs = useCallback(async (showLoading: boolean = true) => {
    if (showLoading) setIsLoading(true);
    console.log('[UI] Fetching all jobs...');
    try {
      const response = await fetch('/api/jobs');
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`);
      }
      const fetchedJobs: Job[] = await response.json();
      const currentProcessing: ProcessingJobUI[] = [];
      const currentCompleted: CompletedItemUI[] = [];
      fetchedJobs.forEach(job => {
        if (job.status === 'processing' || job.status === 'queuing' || job.status === 'uploading') {
          currentProcessing.push(job as ProcessingJobUI);
        } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'expired') {
          currentCompleted.push(job as CompletedItemUI);
        }
      });
      setProcessingJobs(currentProcessing.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
      setCompletedItems(currentCompleted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      console.log('[UI] Jobs fetched and states updated.');
    } catch (error) {
      console.error("[UI] Error fetching jobs:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []); // fetchJobs ไม่มี dependencies ภายนอก (นอกจาก setIsLoading ที่เป็น setter ซึ่งเสถียร)

  const pollJobStatus = useCallback(async (jobId: string) => {
    console.log(`[UI] Polling status for job ${jobId}...`);
    try {
      const response = await fetch(`/api/kiri-engine/get-status/${jobId}`);
      if (!response.ok) {
        console.error(`[UI] Failed to poll status for ${jobId}: ${response.statusText}`);
        if (response.status === 404 && pollingIntervalsRef.current[jobId]) {
          console.warn(`[UI] Job ${jobId} not found, stopping polling.`);
          clearInterval(pollingIntervalsRef.current[jobId]);
          delete pollingIntervalsRef.current[jobId];
        }
        return;
      }
      const updatedJobFromServer: Job = await response.json();
      console.log(`[UI] Polled status for ${jobId}:`, updatedJobFromServer.status);

      if (updatedJobFromServer.status === 'completed' || updatedJobFromServer.status === 'failed' || updatedJobFromServer.status === 'expired') {
        console.log(`[UI] Job ${jobId} finished or failed. Fetching all jobs to update UI.`);
        fetchJobs(false); // เรียก fetchJobs ที่ memoized
        if (pollingIntervalsRef.current[jobId]) {
          clearInterval(pollingIntervalsRef.current[jobId]);
          delete pollingIntervalsRef.current[jobId];
          console.log(`[UI] Stopped polling for job ${jobId}.`);
        }
      } else {
        setProcessingJobs(prev =>
          prev.map(j => (j.id === jobId ? { ...j, ...updatedJobFromServer } as ProcessingJobUI : j))
        );
      }
    } catch (error) {
      console.error(`[UI] Error polling job ${jobId}:`, error);
    }
  }, [fetchJobs]); // <--- ลบ eslint-disable-next-line ออก, ใส่ fetchJobs ใน deps ถูกต้องแล้ว


  useEffect(() => {
    fetchJobs();
    return () => {
      console.log('[UI] Clearing all polling intervals on unmount.');
      Object.values(pollingIntervalsRef.current).forEach(clearInterval);
      pollingIntervalsRef.current = {};
    };
  }, [fetchJobs]); // <--- ลบ eslint-disable-next-line ออก, ใส่ fetchJobs ใน deps ถูกต้องแล้ว

  useEffect(() => {
    const currentPollingIds = Object.keys(pollingIntervalsRef.current);
    const processingJobIds = processingJobs.map(job => job.id);

    currentPollingIds.forEach(jobId => {
      if (!processingJobIds.includes(jobId) && pollingIntervalsRef.current[jobId]) {
        console.log(`[UI] Job ${jobId} no longer processing, stopping its poll.`);
        clearInterval(pollingIntervalsRef.current[jobId]);
        delete pollingIntervalsRef.current[jobId];
      }
    });

    processingJobs.forEach(job => {
      if (!(job.id in pollingIntervalsRef.current) && (job.status === 'processing' || job.status === 'queuing' || job.status === 'uploading')) {
        console.log(`[UI] Starting polling for new/existing processing job ${job.id}`);
        pollJobStatus(job.id);
        pollingIntervalsRef.current[job.id] = setInterval(() => pollJobStatus(job.id), 20000);
      }
    });
  }, [processingJobs, pollJobStatus]);

  // ... (ส่วนที่เหลือของ handlers และ JSX เหมือนเดิม) ...

  const toggleActionMenu = () => setShowActionMenu(prev => !prev);

  const handleInitiateUpload = () => {
    setShowActionMenu(false);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('video/')) {
        alert('กรุณาเลือกไฟล์วิดีโอเท่านั้น');
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      const MAX_FILE_SIZE_MB = 200;
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`ไฟล์วิดีโอมีขนาดใหญ่เกินไป (สูงสุด ${MAX_FILE_SIZE_MB}MB)`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      console.log('[UI] File selected for processing:', file.name);
      const formData = new FormData();
      formData.append('videoFile', file);
      setIsUploading(true);
      try {
        const response = await fetch('/api/kiri-engine/upload-video', { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Failed to upload video (status: ${response.status}).`);
        console.log('[UI] Upload successful, Job created:', result);
        alert(`ไฟล์ "${file.name}" ถูกส่งไปประมวลผลแล้ว! Job ID: ${result.jobId}`);
        fetchJobs(false);
      } catch (error) {
        console.error('[UI] Error uploading file:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during upload.';
        alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${errorMessage}`);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const handleInitiateRecording = () => {
    setShowActionMenu(false);
    alert('หน้าจอถ่ายวิดีโอ (ยังไม่ได้ implement)');
  };

  const handleViewDetails = (jobId: string) => {
    const model = completedItems.find(item => item.id === jobId && item.status === 'completed');
    if (model && model.modelUrl) {
      alert(`จำลองการดูโมเดล 3D: ${model.modelUrl}`);
    } else {
      alert(`ดูรายละเอียด Job ID: ${jobId} (ยังไม่มี Preview หรือ Model URL)`);
    }
  };

  const handleDownloadModel = (modelUrl?: string) => {
    if (modelUrl && modelUrl !== '#') {
      alert(`กำลังดาวน์โหลดจาก: ${modelUrl}`);
      window.open(modelUrl, '_blank');
    } else {
      alert('ไม่มีไฟล์ให้ดาวน์โหลด หรือ URL ไม่ถูกต้อง');
    }
  };

  if (isLoading && processingJobs.length === 0 && completedItems.length === 0) {
    return (
      <div className="dashboard-container loading-state">
        <Loader2 size={48} className="animate-spin main-loader-icon" />
        <p>กำลังโหลดข้อมูลโปรเจกต์...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>โปรเจกต์ 3D ของฉัน</h1>
        <button onClick={() => fetchJobs(true)} disabled={isLoading || isUploading} className="refresh-button" title="รีเฟรชข้อมูล">
          {(isLoading || isUploading) ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          <span>รีเฟรช</span>
        </button>
      </header>

      <main className="dashboard-content">
        <section className="job-section">
          <h2>
            <Loader2 size={20} className="section-icon processing-icon animate-spin-slow" />
            กำลังประมวลผล ({processingJobs.length})
          </h2>
          {processingJobs.length > 0 ? (
            <ul className="job-list">
              {processingJobs.map(job => (
                <li key={job.id} className={`job-item status-${job.status}`}>
                  <div className="job-info">
                    <span className="job-name">{job.videoName || 'กำลังประมวลผล...'}</span>
                    <span className="job-status-text">
                      สถานะ: {job.status === 'queuing' ? 'รอคิว' : job.status === 'uploading' ? 'กำลังอัปโหลด (KIRI)' : 'กำลังสร้างโมเดล...'}
                    </span>
                    <span className="job-time">ส่งเมื่อ: {formatDate(job.submittedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">ไม่มีวิดีโอที่กำลังประมวลผลในขณะนี้</p>
          )}
        </section>

        <section className="job-section">
          <h2>
            <CheckCircle size={20} className="section-icon completed-icon" />
            เสร็จสิ้น / ล้มเหลว ({completedItems.length})
          </h2>
          {completedItems.length > 0 ? (
            <ul className="job-list completed-list">
              {completedItems.map(item => (
                <li key={item.id} className={`job-item status-${item.status}`}>
                  {item.status === 'completed' && item.thumbnailUrl && (

                    <Image src={item.thumbnailUrl} alt={String(item.modelName || item.videoName)} className="job-thumbnail" width={60} height={60} />
                    // ถ้าจะใช้ Next/Image ต้อง config hostname ของ thumbnailUrl ใน next.config.js
                    // <Image src={item.thumbnailUrl} alt={String(item.modelName || item.videoName)} className="job-thumbnail" width={60} height={60} />
                  )}
                  <div className="job-info">
                    <span className="job-name">{item.modelName || item.videoName || 'โปรเจกต์ไม่มีชื่อ'}</span>
                    {item.status === 'completed' && (
                      <span className="job-time">เสร็จเมื่อ: {formatDate(item.completedAt || item.updatedAt)}</span>
                    )}
                    {item.status === 'failed' && (
                      <>
                        <span className="job-status-text error-text">สถานะ: ล้มเหลว</span>
                        {item.errorMessage && <span className="job-error-message">สาเหตุ: {item.errorMessage}</span>}
                        <span className="job-time">อัปเดตเมื่อ: {formatDate(item.updatedAt)}</span>
                      </>
                    )}
                    {item.status === 'expired' && (
                      <span className="job-status-text error-text">สถานะ: หมดอายุ</span>
                    )}
                  </div>
                  <div className="job-actions">
                    {item.status === 'completed' && (
                      <>
                        <button onClick={() => handleViewDetails(item.id)} title="ดูโมเดล 3D (จำลอง)">
                          <Eye size={18} />
                        </button>
                        {item.modelUrl && (
                          <button onClick={() => handleDownloadModel(item.modelUrl)} title="ดาวน์โหลดโมเดล">
                            <Download size={18} />
                          </button>
                        )}
                      </>
                    )}
                    {(item.status === 'failed' || item.status === 'expired') && <AlertTriangle size={24} className="status-icon error-icon" />}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">ยังไม่มีโปรเจกต์ที่ประมวลผลเสร็จหรือล้มเหลว</p>
          )}
        </section>
      </main>

      <div className="fab-container">
        {isUploading && (
          <div className="upload-indicator">
            <Loader2 size={20} className="animate-spin" />
            <span>กำลังอัปโหลด...</span>
          </div>
        )}
        {showActionMenu && !isUploading && (
          <div className="fab-menu">
            <button className="fab-menu-item" onClick={handleInitiateUpload} title="อัปโหลดวิดีโอ">
              <UploadCloud size={24} />
              <span>อัปโหลด</span>
            </button>
            <button className="fab-menu-item" onClick={handleInitiateRecording} title="ถ่ายวิดีโอใหม่">
              <VideoIcon size={24} />
              <span>ถ่ายวิดีโอ</span>
            </button>
          </div>
        )}
        {!isUploading && (
          <button className="fab" onClick={toggleActionMenu} title={showActionMenu ? "ปิดเมนู" : "สร้างโปรเจกต์ใหม่"}>
            <Plus size={32} style={{ transform: showActionMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="video/*" // Focus on video only for now
        onChange={handleFileSelected}
      />
    </div>
  );
}