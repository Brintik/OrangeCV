"use client";

import Link from 'next/link';

export default function ResultsDashboard({ data, onReset }: { data: any, onReset: () => void }) {
  const score = data?.score || 0;
  const missingKeywords = data?.missingKeywords || [];
  const optimizations = data?.optimizations || [];
  
  // Safely grab the breakdown scores
  const breakdown = data?.breakdown || { keywords: 0, experience: 0, formatting: 0, contact: 0 };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-brand-light-orange/20 overflow-hidden animate-fade-in">
      <div className="bg-brand-brown-orange p-8 text-center text-white shadow-sm">
        <h2 className="text-3xl font-extrabold mb-2">ATS Scan Complete</h2>
        <p className="opacity-90 font-medium">Here is how your resume aligns with industry standards.</p>
      </div>

      <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12">
        
        {/* Left: Score Circle & Breakdown Bars */}
        <div className="flex-1 flex flex-col items-center border-b md:border-b-0 md:border-r border-brand-light-orange/20 pb-8 md:pb-0 md:pr-12 w-full">
          
          {/* Main Radial Circle */}
          <div className="relative w-48 h-48 flex items-center justify-center rounded-full shadow-inner mb-8 bg-white/50">
            <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-brand-offwhite" />
              <circle 
                cx="96" 
                cy="96" 
                r="88" 
                stroke="currentColor" 
                strokeWidth="8" 
                fill="transparent" 
                strokeDasharray="552.9" 
                strokeDashoffset={552.9 - (552.9 * score) / 100} 
                className={`${score >= 70 ? 'text-green-500' : score >= 40 ? 'text-brand-light-orange' : 'text-red-500'} transition-all duration-1000 ease-out`} 
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center z-10">
              <span className="text-5xl font-extrabold text-brand-dark">{score}%</span>
              <p className="text-sm font-bold text-brand-dark/50 uppercase tracking-widest mt-1">Match</p>
            </div>
          </div>

          {/* NEW: Category Breakdown Bars */}
          <div className="w-full space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-brand-dark/70 mb-1">
                <span>Keywords (Max 40)</span>
                <span>{breakdown.keywords}</span>
              </div>
              <div className="w-full bg-brand-offwhite h-2 rounded-full overflow-hidden">
                <div className="bg-brand-brown-orange h-full rounded-full" style={{ width: `${(breakdown.keywords / 40) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-brand-dark/70 mb-1">
                <span>Experience Impact (Max 30)</span>
                <span>{breakdown.experience}</span>
              </div>
              <div className="w-full bg-brand-offwhite h-2 rounded-full overflow-hidden">
                <div className="bg-brand-light-orange h-full rounded-full" style={{ width: `${(breakdown.experience / 30) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-brand-dark/70 mb-1">
                <span>Formatting (Max 15)</span>
                <span>{breakdown.formatting}</span>
              </div>
              <div className="w-full bg-brand-offwhite h-2 rounded-full overflow-hidden">
                <div className="bg-brand-dark/50 h-full rounded-full" style={{ width: `${(breakdown.formatting / 15) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-brand-dark/70 mb-1">
                <span>Contact Info (Max 15)</span>
                <span>{breakdown.contact}</span>
              </div>
              <div className="w-full bg-brand-offwhite h-2 rounded-full overflow-hidden">
                <div className="bg-brand-dark/30 h-full rounded-full" style={{ width: `${(breakdown.contact / 15) * 100}%` }}></div>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Actionable Feedback */}
        <div className="flex-1 space-y-8">
          <div>
            <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Missing Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.length > 0 ? missingKeywords.map((kw: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-red-50 text-red-600 text-sm font-bold rounded-full border border-red-100">{kw}</span>
              )) : (
                <span className="text-sm text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200">Great job! You hit all the core keywords.</span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-brand-brown-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Formatting & Optimizations
            </h3>
            <ul className="space-y-3">
              {optimizations.length > 0 ? optimizations.map((opt: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-dark/80 font-medium">
                  <svg className="w-5 h-5 text-brand-light-orange mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  {opt}
                </li>
              )) : (
                <li className="text-sm text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200 inline-block">Your formatting looks solid!</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-brand-offwhite border-t border-brand-light-orange/20 flex flex-col sm:flex-row gap-4 justify-end items-center">
        <button onClick={onReset} className="w-full sm:w-auto px-6 py-3 font-bold text-brand-dark/60 hover:text-brand-dark transition-colors">
          Scan Another Resume
        </button>
        <Link href="/builder" className="w-full sm:w-auto px-8 py-3 bg-brand-brown-orange text-white font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-md text-center flex items-center justify-center gap-2">
          Edit in AI Builder 
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </Link>
      </div>
    </div>
  );
}