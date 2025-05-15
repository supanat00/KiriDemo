// src/app/page.tsx
"use client";

import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
// import Image from "next/image"; // Uncomment if you configure next/image for external URLs
import { Plus, UploadCloud, Video as VideoIcon, RefreshCw, CheckCircle, AlertTriangle, Download, Eye, Loader2 } from 'lucide-react';
import type { Job, ProcessingJobUI, CompletedItemUI } from '@/types/project';

const formatDate = (dateInput: Date | string | undefined): string => {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString('th-TH', {
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

  const fetchJobs = useCallback(async (showLoadingIndicator: boolean = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    console.log('[UI] Fetching all jobs...');
    try {
      const response = await fetch('/api/jobs');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch jobs: ${response.statusText}` }));
        throw new Error(errorData.message);
      }
      const fetchedJobs: Job[] = await response.json();
      const currentProcessing: ProcessingJobUI[] = [];
      const currentCompleted: CompletedItemUI[] = [];

      fetchedJobs.forEach(job => {
        if (!job || !job.id || !job.status) { // Basic validation of job structure
          console.warn("[UI] Received invalid job object:", job);
          return;
        }
        if (job.status === 'processing' || job.status === 'queuing' || job.status === 'uploading') {
          currentProcessing.push(job as ProcessingJobUI);
        } else if (job.status === 'completed' || job.status === 'failed' || job.status === 'expired') {
          currentCompleted.push(job as CompletedItemUI);
        }
      });

      setProcessingJobs(currentProcessing.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
      setCompletedItems(currentCompleted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      console.log('[UI] Jobs fetched and states updated. Processing:', currentProcessing.length, 'Completed/Failed:', currentCompleted.length);
    } catch (error) {
      console.error("[UI] Error fetching jobs:", error);
      // Handle error display in UI if needed
    } finally {
      if (showLoadingIndicator) setIsLoading(false);
    }
  }, []);

  const pollJobStatus = useCallback(async (jobId: string) => {
    if (!jobId) return;
    console.log(`[UI] Polling status for job ${jobId}...`);
    try {
      const response = await fetch(`/api/kiri-engine/get-status/${jobId}`);
      if (!response.ok) {
        console.error(`[UI] Failed to poll status for ${jobId}: ${response.statusText} (${response.status})`);
        if ((response.status === 404 || response.status === 500) && pollingIntervalsRef.current[jobId]) { // Stop polling on 404 or critical server error
          console.warn(`[UI] Job ${jobId} not found or server error during poll, stopping polling.`);
          clearInterval(pollingIntervalsRef.current[jobId]);
          delete pollingIntervalsRef.current[jobId];
          fetchJobs(false); // Fetch all jobs to ensure UI consistency
        }
        return;
      }
      const updatedJobFromServer: Job = await response.json();
      console.log(`[UI] Polled status for ${jobId}:`, updatedJobFromServer.status);

      if (updatedJobFromServer.status === 'completed' || updatedJobFromServer.status === 'failed' || updatedJobFromServer.status === 'expired') {
        console.log(`[UI] Job ${jobId} reached final state: ${updatedJobFromServer.status}. Fetching all jobs.`);
        fetchJobs(false);
        if (pollingIntervalsRef.current[jobId]) {
          clearInterval(pollingIntervalsRef.current[jobId]);
          delete pollingIntervalsRef.current[jobId];
        }
      } else {
        // Update only the specific job in the processing list to avoid full re-render if not necessary
        setProcessingJobs(prev =>
          prev.map(j => (j.id === jobId ? { ...j, ...updatedJobFromServer } as ProcessingJobUI : j))
        );
      }
    } catch (error) {
      console.error(`[UI] Error polling job ${jobId}:`, error);
      // Optionally stop polling on certain errors
    }
  }, [fetchJobs]);

  useEffect(() => {
    fetchJobs(true); // Initial fetch with loading indicator
    return () => { // Cleanup on unmount
      Object.values(pollingIntervalsRef.current).forEach(clearInterval);
      pollingIntervalsRef.current = {};
    };
  }, [fetchJobs]); // fetchJobs is memoized, so this runs once on mount

  useEffect(() => { // Manages polling intervals
    const currentPollingJobIds = Object.keys(pollingIntervalsRef.current);
    const activeProcessingJobIds = processingJobs
      .filter(job => job.status === 'processing' || job.status === 'queuing' || job.status === 'uploading')
      .map(job => job.id);

    // Stop polling for jobs no longer active or in processing list
    currentPollingJobIds.forEach(jobId => {
      if (!activeProcessingJobIds.includes(jobId)) {
        if (pollingIntervalsRef.current[jobId]) {
          console.log(`[UI] Stopping polling for job ${jobId} (no longer active processing).`);
          clearInterval(pollingIntervalsRef.current[jobId]);
          delete pollingIntervalsRef.current[jobId];
        }
      }
    });

    // Start polling for new active processing jobs
    activeProcessingJobIds.forEach(jobId => {
      if (!pollingIntervalsRef.current[jobId]) {
        console.log(`[UI] Starting polling for job ${jobId}.`);
        pollJobStatus(jobId); // Initial poll
        pollingIntervalsRef.current[jobId] = setInterval(() => pollJobStatus(jobId), 20000); // Poll every 20s
      }
    });
  }, [processingJobs, pollJobStatus]);


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
      // Add file size check if needed based on KIRI Engine limits
      // const MAX_FILE_SIZE_MB = 200;
      // if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { ... }

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
        fetchJobs(false); // Refresh job list
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
      alert(`จำลองการดูโมเดล 3D จาก URL: ${model.modelUrl}`);
      // Implement actual 3D viewer modal or page navigation here
    } else {
      alert(`ดูรายละเอียด Job ID: ${jobId} (ยังไม่มี Model URL หรือไม่ใช่สถานะ completed)`);
    }
  };

  const handleDownloadModel = async (jobId: string) => {
    // This function should call an API route that then calls KIRI's getModelZip API
    alert(`(จำลอง) กำลังขอลิงก์ดาวน์โหลดสำหรับ Job ID: ${jobId}...`);
    try {
      // Example: const response = await fetch(`/api/kiri-engine/download-model/${jobId}`);
      // const data = await response.json();
      // if (response.ok && data.modelUrl) {
      //   window.open(data.modelUrl, '_blank');
      // } else {
      //   throw new Error(data.message || 'Could not get download link.');
      // }
      console.log("TODO: Implement API call to get KIRI download link for job:", jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(`ไม่สามารถดาวน์โหลดโมเดลได้: ${message}`);
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
                      สถานะ: {job.status === 'queuing' ? 'รอคิว' : job.status === 'uploading' ? 'กำลังอัปโหลด' : 'กำลังสร้างโมเดล...'}
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt={String(item.modelName || item.videoName)} className="job-thumbnail" />
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
                        <button onClick={() => handleDownloadModel(item.id)} title="ดาวน์โหลดโมเดล">
                          <Download size={18} />
                        </button>
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
        accept="video/*" // Focus on video only
        onChange={handleFileSelected}
      />
    </div>
  );
}