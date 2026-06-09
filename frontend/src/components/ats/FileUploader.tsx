"use client";

import { useState, useRef } from 'react';
import ResultsDashboard from './ResultsDashboard';

export default function FileUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'extracting' | 'analyzing' | 'scoring' | 'complete'>('idle');
  const [aiResults, setAiResults] = useState<any>(null);
  const [jobDescription, setJobDescription] = useState(""); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type === 'application/pdf' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // UPGRADE: Only save the file into state. Do NOT trigger upload yet!
      setFile(selectedFile);
    } else {
      alert("Please upload a PDF or DOCX file.");
    }
  };

  const executeAnalysis = async () => {
    if (!file) return;
    
    setUploadState('extracting');
    
    const formData = new FormData();
    formData.append("file", file);
    
    const defaultDesc = process.env.NEXT_PUBLIC_DEFAULT_JOB_DESC || "General ATS Optimization";
    formData.append("job_description", jobDescription.trim() !== "" ? jobDescription : defaultDesc);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${apiUrl}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend rejected the file. Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("🔥 AI Finished Scoring:", data);
      
      if (data.extracted_text) {
        localStorage.setItem("orangeCV_draft", data.extracted_text);
      }
      const defaultDesc = process.env.NEXT_PUBLIC_DEFAULT_JOB_DESC || "General ATS Optimization";
      localStorage.setItem("orangeCV_jd", jobDescription.trim() !== "" ? jobDescription : defaultDesc);
      
      setAiResults(data);

      setUploadState('analyzing');
      setTimeout(() => setUploadState('scoring'), 2000);
      setTimeout(() => setUploadState('complete'), 4000);

    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to connect to the backend vault. Is your Python server running?");
      setUploadState('idle');
    }
  };

  const handleReset = () => {
    setFile(null);
    setAiResults(null);
    setJobDescription(""); 
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (uploadState === 'complete' && aiResults) {
    return <ResultsDashboard onReset={handleReset} data={aiResults} />;
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {uploadState === 'idle' ? (
        <>
          {/* Step 1 - Job Description Text Area */}
          <div className="w-full text-left space-y-2">
            <label htmlFor="jd" className="block text-lg font-bold text-brand-dark">
              1. Paste the Job Description <span className="text-sm font-normal opacity-60">(Optional)</span>
            </label>
            <textarea
              id="jd"
              rows={4}
              className="w-full p-4 rounded-xl border-2 border-brand-light-orange/40 focus:border-brand-brown-orange focus:ring-0 outline-none transition-all resize-none bg-white shadow-sm text-brand-dark"
              placeholder="Paste the job requirements here so our AI can strictly match your resume against them..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          {/* Step 2 - The Existing Drag & Drop Box */}
          <div className="w-full text-left space-y-2">
             <label className="block text-lg font-bold text-brand-dark">
              2. Upload Your Resume
            </label>
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer bg-white shadow-sm
                ${isDragging ? 'border-brand-brown-orange bg-brand-light-orange/10' : 'border-brand-light-orange hover:border-brand-brown-orange'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleChange} accept=".pdf,.docx" className="hidden" />
              
              {/* UPGRADE: If a file is selected, show it inside the box! */}
              {file ? (
                <div className="flex flex-col items-center justify-center space-y-3 animate-fade-in">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-brand-dark truncate max-w-xs">{file.name}</h3>
                  <p className="text-sm text-brand-dark/60 font-medium">Ready for analysis!</p>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents opening the file browser again
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }} 
                    className="text-red-500 hover:text-red-700 text-sm font-bold mt-2 outline-none"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="mx-auto w-16 h-16 mb-4 bg-brand-offwhite rounded-full flex items-center justify-center">
                     <svg className="w-8 h-8 text-brand-brown-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                     </svg>
                  </div>
                  <h3 className="text-xl font-bold text-brand-dark mb-2">Drop your resume here</h3>
                  <p className="text-brand-dark/70 mb-4">or click to browse files</p>
                  <p className="text-sm text-brand-dark/50 font-medium">PDF & DOCX only. Max 5MB file size.</p>
                </div>
              )}
            </div>
          </div>

          {/* UPGRADE: Step 3 - The Manual Start Button */}
          <div className="pt-4">
            <button
              onClick={executeAnalysis}
              disabled={!file}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-md flex justify-center items-center gap-2 outline-none
                ${file ? 'bg-brand-brown-orange text-white hover:opacity-90' : 'bg-brand-light-orange/20 text-brand-dark/40 cursor-not-allowed'}`}
            >
              Run ATS Scan
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>
        </>
      ) : (
        <div className="border-2 border-brand-light-orange rounded-2xl p-12 text-center bg-white shadow-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-brand-light-orange border-t-brand-brown-orange rounded-full animate-spin mb-6"></div>
          <h3 className="text-2xl font-bold text-brand-dark animate-pulse">
            {uploadState === 'extracting' && "Extracting document text..."}
            {uploadState === 'analyzing' && "AI analyzing against Job Description..."}
            {uploadState === 'scoring' && "Calculating ATS match percentage..."}
          </h3>
        </div>
      )}
    </div>
  );
}