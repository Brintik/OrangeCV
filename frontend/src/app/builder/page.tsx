"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css'; 

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function BuilderPage() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    {role: 'ai', text: "Hello! Let's build your resume. What is your target job title?"}
  ]);
  const [resumeText, setResumeText] = useState("<h1>Your Resume</h1><p>(AI will build this as we chat!)</p>");
  const [savedJd, setSavedJd] = useState("General Application"); 
  
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
  const [pendingInsertion, setPendingInsertion] = useState<{text: string, index: number, length: number} | null>(null);

  // NEW: State for the 3 user requests
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); 
  const quillRef = useRef<any>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isMobileChatOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isMobileChatOpen]);

  // Mouse Roller Fix
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) { e.preventDefault(); toolbar.scrollLeft += e.deltaY; }
    };
    toolbar.addEventListener('wheel', handleWheel, { passive: false });
    return () => toolbar.removeEventListener('wheel', handleWheel);
  }, []);

  // NEW: 5-Second Debounced Live ATS Scoring
  useEffect(() => {
    if (resumeText.includes("(AI will build this as we chat!)")) return;
    
    setIsScoring(true);
    const timer = setTimeout(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/live-score`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume_text: resumeText, job_description: savedJd })
        });
        const data = await res.json();
        if (data.score !== undefined) setLiveScore(data.score);
      } finally {
        setIsScoring(false);
      }
    }, 5000); // 5 SECOND DELAY

    return () => clearTimeout(timer);
  }, [resumeText, savedJd]);

  // INITIAL LOAD & AUTO-SUGGESTIONS
  useEffect(() => {
    const savedDraft = localStorage.getItem("orangeCV_draft");
    const jd = localStorage.getItem("orangeCV_jd"); 
    if (jd) { setSavedJd(jd); localStorage.removeItem("orangeCV_jd"); }

    if (savedDraft) {
      setResumeText(`<p>${savedDraft}</p>`); 
      setMessages([{role: 'ai', text: "I've received your scanned resume! Formatting it now..."}]);
      localStorage.removeItem("orangeCV_draft"); 

      const autoFormatAndSuggest = async () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        try {
          // 1. Auto Format
          const res = await fetch(`${apiUrl}/api/build-resume`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Format this raw text into a clean HTML resume.", current_resume: savedDraft }),
          });
          const data = await res.json();
          const newHtml = data.resume_html || data.resume_markdown || savedDraft;
          setResumeText(newHtml);
          setMessages(prev => [...prev, { role: 'ai', text: data.chat_reply || "Done! I'm also scanning for direct improvements..." }]);

          // 2. Fetch Auto Suggestions (Issue #3)
          const suggestRes = await fetch(`${apiUrl}/api/auto-suggest`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume_text: newHtml, job_description: jd || "General Application" })
          });
          const suggestData = await suggestRes.json();
          if (suggestData.suggestions) {
            setAutoSuggestions(suggestData.suggestions);
          }
        } catch (err) { console.error(err); }
      };
      autoFormatAndSuggest();
    }
  }, []);

  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput("");
    setTimeout(() => inputRef.current?.focus(), 10);

    // NEW: 1-Second Artificial Chat Delay
    setIsChatLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/build-resume`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, current_resume: resumeText }),
      });
      
      const data = await response.json();
      if (data.chat_reply) setMessages(prev => [...prev, { role: 'ai', text: data.chat_reply }]);
      if (data.resume_html || data.resume_markdown) setResumeText(data.resume_html || data.resume_markdown);
    } catch (err) {
      console.error(err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleQuickAction = async (action: 'STAR' | 'Professional' | 'Grammar') => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection();

    if (!range || range.length === 0) {
      setMessages(prev => [...prev, { role: 'ai', text: "Please highlight text directly inside the document first!" }]);
      return;
    }

    const selectionText = editor.getText(range.index, range.length).trim();
    setMessages(prev => [...prev, { role: 'user', text: `Apply ${action} to: "${selectionText}"` }]);
    setIsChatLoading(true);

    let prompt = `Rewrite the following resume text to sound highly professional. Return ONLY the rewritten text, nothing else. Text: "${selectionText}"`;
    if (action === 'STAR') prompt = `Rewrite the following using the STAR method. Make it punchy and metric-driven. Return ONLY the rewritten text. Text: "${selectionText}"`;
    if (action === 'Grammar') prompt = `Fix spelling/grammar in this text. Return ONLY the corrected text. Text: "${selectionText}"`;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      
      const data = await response.json();
      const aiResponse = (data.response || data.chat_reply).trim();
      
      if (aiResponse) {
        setMessages(prev => [...prev, { role: 'ai', text: `Here is your upgraded text:\n\n"${aiResponse}"` }]);
        setPendingInsertion({ text: aiResponse, index: range.index, length: range.length });
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCoverLetter = async () => {
    setMessages(prev => [...prev, { role: 'user', text: "Please write a highly targeted cover letter." }]);
    setIsChatLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/generate-cover-letter`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, job_description: savedJd }),
      });
      const data = await response.json();
      if (data.cover_letter) setMessages(prev => [...prev, { role: 'ai', text: `Here is your targeted cover letter:\n\n${data.cover_letter}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const confirmInsertion = () => {
    if (!quillRef.current || !pendingInsertion) return;
    const editor = quillRef.current.getEditor();
    editor.deleteText(pendingInsertion.index, pendingInsertion.length);
    editor.insertText(pendingInsertion.index, pendingInsertion.text);
    setPendingInsertion(null); 
  };

  // NEW: Directly apply auto-suggestions using Quill's internal math!
  const applyAutoSuggestion = (original: string, improved: string, index: number) => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const fullText = editor.getText(); // Gets pure text, completely ignoring HTML tags!
    const searchIndex = fullText.indexOf(original.trim()); // Find the exact starting position

    if (searchIndex !== -1) {
      // Found it! Use Quill to surgically swap it out
      editor.deleteText(searchIndex, original.trim().length);
      editor.insertText(searchIndex, improved.trim());

      setAutoSuggestions(prev => prev.filter((_, i) => i !== index));
      setMessages(prev => [...prev, { role: 'ai', text: "✅ Applied suggestion perfectly!" }]);
    } else {
      setMessages(prev => [...prev, { role: 'ai', text: "⚠️ I couldn't find the exact text. You might have already edited it. You can copy/paste it manually:\n\n" + improved }]);
    }
  };

  const handleExportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.querySelector('.ql-editor') as HTMLElement;
    if (!element) return;
    
    const options = {
      margin: 10, 
      filename: 'OrangeCV_Resume.pdf', 
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 }, 
      // THE FIX: Add "as const" to 'portrait'
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const } 
    };
    
    html2pdf().set(options).from(element).save();
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['clean']
    ],
  };

  return (
    <div className="h-screen bg-brand-offwhite flex flex-col overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        .quill-container .quill { display: flex; flex-direction: column; height: 100%; min-height: 800px; }
        .quill-container .ql-toolbar { border: none !important; border-bottom: 2px solid #ffedd5 !important; background-color: #fffaf5; border-radius: 6px 6px 0 0; padding: 16px; }
        .quill-container .ql-container { border: none !important; flex: 1; font-family: inherit; font-size: 15px; }
        .quill-container .ql-editor { padding: 48px; color: #1c1917; line-height: 1.6; }
        .quill-container .ql-editor h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #9a3412; }
        .quill-container .ql-editor h2 { font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid #ffedd5; padding-bottom: 4px; }
        .quill-container .ql-editor ul { padding-left: 1.5rem; margin-bottom: 1rem; }
        .quill-container .ql-editor li { margin-bottom: 0.25rem; }
      `}} />

      {/* NEW: Live ATS Score injected into Header */}
      <header className="flex-shrink-0 w-full bg-white border-b-2 border-brand-light-orange/20 p-4 flex justify-between items-center shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-extrabold tracking-tighter text-brand-brown-orange ml-2 md:ml-4">OrangeCV.</div>
          <Link href="/" className="text-brand-dark/60 hover:text-brand-brown-orange font-bold text-sm transition-colors">&larr; Back <span className="hidden sm:inline">to Checker</span></Link>
        </div>
        <div className="mr-4 px-4 py-1.5 bg-brand-light-orange/10 border border-brand-light-orange/40 rounded-full flex items-center gap-3 shadow-sm">
          <span className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest">Live ATS Score</span>
          <span className={`text-lg font-extrabold ${isScoring ? 'text-brand-dark/30 animate-pulse' : 'text-brand-brown-orange'}`}>
            {isScoring ? "Checking..." : liveScore !== null ? `${liveScore}%` : "—"}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Chat Panel */}
        <div className={`
          ${isMobileChatOpen ? 'fixed inset-0 z-50 flex' : 'hidden'} 
          md:relative md:flex md:w-1/3 md:h-full 
          bg-white md:border-r-2 border-brand-light-orange/20 flex-col shadow-2xl md:shadow-lg
        `}>
          <div className="p-6 bg-brand-light-orange/10 border-b border-brand-light-orange/20 flex justify-between items-center">
            <h2 className="text-xl font-bold text-brand-dark">AI Co-Pilot</h2>
            <button onClick={() => setIsMobileChatOpen(false)} className="md:hidden text-brand-dark hover:text-brand-brown-orange outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-4 relative">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-brand-brown-orange text-white' : 'bg-brand-offwhite border border-brand-light-orange/30'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            
            {/* NEW: Auto-Suggestions Interactive Dashboard */}
            {autoSuggestions.length > 0 && (
              <div className="mt-4 p-4 border border-brand-light-orange/40 bg-white rounded-xl shadow-sm">
                <h3 className="text-sm font-bold mb-3 text-brand-dark flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-brown-orange animate-pulse"></span>
                  AI Suggested Improvements
                </h3>
                <div className="space-y-4">
                  {autoSuggestions.map((s, i) => (
                    <div key={i} className="p-3 bg-brand-offwhite rounded-lg border border-brand-light-orange/20 text-xs">
                      <p className="text-red-500 line-through mb-1.5 opacity-80">"{s.original}"</p>
                      <p className="text-green-700 font-bold mb-1">"{s.improved}"</p>
                      <p className="text-brand-dark/50 italic mb-2">Why: {s.reason}</p>
                      <button onClick={() => applyAutoSuggestion(s.original, s.improved, i)} className="w-full py-2 bg-brand-brown-orange/10 hover:bg-brand-brown-orange hover:text-white text-brand-brown-orange font-bold rounded transition-colors">
                        Insert Suggestion
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat / Action Feedback */}
          {pendingInsertion && (
            <div className="mx-4 mb-2 p-4 bg-brand-light-orange/10 border border-brand-brown-orange/30 rounded-xl flex flex-col gap-3 shadow-sm animate-fade-in flex-shrink-0">
              <p className="text-xs text-brand-dark font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                AI Suggestion Ready
              </p>
              <div className="flex gap-2">
                <button onClick={confirmInsertion} className="flex-1 bg-brand-brown-orange text-white text-xs font-bold py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity">Insert into CV</button>
                <button onClick={() => setPendingInsertion(null)} className="flex-1 bg-white border border-brand-light-orange/40 text-brand-dark text-xs font-bold py-2.5 rounded-lg shadow-sm hover:bg-brand-offwhite transition-colors">Discard</button>
              </div>
            </div>
          )}

          <div ref={toolbarRef} className="px-4 pt-3 pb-2 border-t border-brand-light-orange/20 bg-brand-offwhite/50 flex gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar flex-shrink-0">
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleQuickAction('STAR')} className="text-xs font-bold bg-white border border-brand-light-orange/40 text-brand-dark px-3 py-1.5 rounded-lg shadow-sm hover:border-brand-brown-orange transition-colors flex items-center gap-1">⭐ Apply STAR Method</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleQuickAction('Professional')} className="text-xs font-bold bg-white border border-brand-light-orange/40 text-brand-dark px-3 py-1.5 rounded-lg shadow-sm hover:border-brand-brown-orange transition-colors flex items-center gap-1">👔 Make Professional</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => handleQuickAction('Grammar')} className="text-xs font-bold bg-white border border-brand-light-orange/40 text-brand-dark px-3 py-1.5 rounded-lg shadow-sm hover:border-brand-brown-orange transition-colors flex items-center gap-1">🔍 Fix Grammar</button>
            <button onMouseDown={(e) => e.preventDefault()} onClick={handleCoverLetter} className="text-xs font-bold bg-brand-brown-orange border border-brand-brown-orange text-white px-3 py-1.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1">📝 Cover Letter</button>
          </div>

          <div className="p-4 bg-brand-offwhite/50 flex-shrink-0 border-t border-brand-light-orange/10 relative">
            {/* NEW: 1-Second Please Wait Overlay */}
            {isChatLoading && (
              <div className="absolute inset-0 z-10 bg-brand-offwhite/80 backdrop-blur-[1px] flex items-center justify-center rounded-b-lg">
                <span className="text-xs font-bold text-brand-brown-orange animate-pulse">Please wait, AI is typing...</span>
              </div>
            )}
            <div className="flex gap-2">
              <input 
                ref={inputRef} 
                className="flex-1 p-3 text-sm rounded-xl border border-brand-light-orange/30 outline-none focus:border-brand-brown-orange shadow-sm"
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask AI or highlight text for actions..."
                disabled={isChatLoading}
              />
              <button disabled={isChatLoading} onClick={sendMessage} className="px-6 py-3 bg-brand-brown-orange text-white font-bold rounded-xl shadow-md hover:opacity-90 outline-none disabled:opacity-50">Send</button>
            </div>
          </div>
        </div>

        {/* Right Editor Panel */}
        <div className="w-full md:w-2/3 h-full overflow-y-auto overscroll-contain p-4 md:p-8 relative">
          <div className="flex flex-col sm:flex-row justify-between items-center max-w-4xl mx-auto mb-4 gap-4">
             <div className="text-sm font-bold text-brand-dark/40 uppercase tracking-widest px-4 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-brand-brown-orange"></span> Live Document
             </div>
             <button onClick={handleExportPDF} className="text-sm font-bold text-white bg-brand-brown-orange px-6 py-2 rounded-full shadow-md w-full sm:w-auto outline-none hover:bg-brand-dark transition-colors">Download PDF</button>
          </div>

          <div className="max-w-4xl mx-auto bg-white min-h-[850px] shadow-xl border border-brand-light-orange/20 rounded-xl mb-12 quill-container overflow-hidden">
             {/* @ts-expect-error - dynamic import strips ref */}
             <ReactQuill ref={quillRef} theme="snow" value={resumeText} onChange={setResumeText} modules={quillModules} />
          </div>
        </div>

      </main>
    </div>
  );
}