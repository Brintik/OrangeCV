"use client";

import { useState } from 'react';
import FileUploader from '@/components/ats/FileUploader';
import ScrollToTop from '@/components/ScrollToTop';
import Link from 'next/link';

export default function Home() {
  // State to manage the mobile hamburger menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const myDetails = {
    name: process.env.NEXT_PUBLIC_MY_NAME || "Brintik Majumder",
    role: process.env.NEXT_PUBLIC_MY_ROLE || "Solo Software Engineer",
    github: process.env.NEXT_PUBLIC_MY_GITHUB || "https://github.com",
    linkedin: process.env.NEXT_PUBLIC_MY_LINKEDIN || "https://linkedin.com",
    email: process.env.NEXT_PUBLIC_MY_EMAIL || "brintikmajumder@gmail.com",
    formspreeUrl: process.env.NEXT_PUBLIC_FORMSPREE_URL || "",
    // NEW: Portfolio link added to the dictionary
    portfolio: process.env.NEXT_PUBLIC_MY_PORTFOLIO || "https://portfolio-website-mocha-one.vercel.app/",
  };

  // We wrap the whole page in a div now instead of main so the header can stretch full width
  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-dark relative scroll-smooth">
      
      {/* Sticky Navigation Bar with Glassmorphism */}
      <header className="sticky top-0 z-50 w-full bg-brand-offwhite/90 backdrop-blur-md border-b border-brand-light-orange/20 shadow-sm">
        <nav className="max-w-6xl mx-auto flex justify-between items-center py-4 px-6">
          <div className="text-2xl font-extrabold tracking-tighter text-brand-brown-orange">
            OrangeCV.
          </div>
          
          {/* Desktop Navigation */}
          <div className="space-x-6 hidden md:flex font-medium items-center">
            <Link href="#checker" className="hover:text-brand-brown-orange transition-colors">ATS Checker</Link>
            <Link href="/builder" className="hover:text-brand-brown-orange transition-colors text-brand-brown-orange font-bold">AI Builder</Link>
            <a href={myDetails.portfolio} target="_blank" rel="noopener noreferrer" className="hover:text-brand-brown-orange transition-colors">Portfolio</a>
            <Link href="#about" className="hover:text-brand-brown-orange transition-colors">About Me</Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            className="md:hidden p-2 text-brand-dark hover:text-brand-brown-orange transition-colors outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
            </svg>
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-brand-light-orange/20 shadow-xl flex flex-col font-medium animate-fade-in">
            <Link href="#checker" onClick={() => setIsMobileMenuOpen(false)} className="p-4 border-b border-brand-light-orange/10 hover:bg-brand-offwhite/50">ATS Checker</Link>
            <Link href="/builder" onClick={() => setIsMobileMenuOpen(false)} className="p-4 border-b border-brand-light-orange/10 hover:bg-brand-offwhite/50 text-brand-brown-orange font-bold">AI Builder</Link>
            {/* UPDATED: Portfolio Link */}
            <a href={myDetails.portfolio} target="_blank" rel="noopener noreferrer" onClick={() => setIsMobileMenuOpen(false)} className="p-4 border-b border-brand-light-orange/10 hover:bg-brand-offwhite/50">Portfolio</a>
            <Link href="#about" onClick={() => setIsMobileMenuOpen(false)} className="p-4 hover:bg-brand-offwhite/50">About Me</Link>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="flex flex-col items-center px-6">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center space-y-8 mt-16 md:mt-24">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            Is your resume <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-brown-orange to-brand-light-orange">
              good enough?
            </span>
          </h1>
          
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-80 leading-relaxed">
            A free, secure, and top-tier AI resume checker. We perform crucial checks to ensure your resume is formatted perfectly for Applicant Tracking Systems and optimized to get you interview callbacks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link href="#checker" className="px-8 py-4 rounded-full bg-brand-brown-orange text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-lg w-full sm:w-auto">
              Check My Resume
            </Link>
            <Link href="/builder" className="px-8 py-4 rounded-full border-2 border-brand-brown-orange text-brand-brown-orange font-bold text-lg hover:bg-brand-light-orange hover:text-brand-dark hover:border-brand-light-orange transition-all shadow-sm w-full sm:w-auto">
              Use AI Builder
            </Link>
          </div>
          
          <p className="text-sm opacity-60 pt-6 flex items-center justify-center gap-2 font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Privacy guaranteed. Secure backend processing.
          </p>
        </section>

        {/* The Drag-and-Drop ATS Engine */}
        <section id="checker" className="w-full max-w-4xl mx-auto mt-32 min-h-[400px] flex items-center justify-center scroll-mt-24">
           <FileUploader />
        </section>

        {/* Portfolio Hub */}
        <section id="about" className="w-full max-w-6xl mx-auto mt-20 mb-10 bg-brand-dark text-white rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden scroll-mt-24">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-brown-orange rounded-full blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="flex flex-col md:flex-row gap-16 relative z-10">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Built by a {myDetails.role.toLowerCase()}.
              </h2>
              <p className="text-white/80 leading-relaxed text-lg">
                Hi, I'm {myDetails.name}. I built this platform because I believe everyone deserves access to top-tier, secure resume optimization tools without dealing with paywalls or data privacy risks. 
              </p>
              <p className="text-white/80 leading-relaxed text-lg">
                Every line of code—from the Next.js frontend to the AI-powered Python backend—was crafted to give job seekers an edge in Applicant Tracking Systems.
              </p>
              <div className="flex flex-wrap gap-4 pt-6">
                <a href={myDetails.github} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors font-bold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                  GitHub
                </a>
                <a href={myDetails.linkedin} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full bg-brand-brown-orange hover:bg-brand-light-orange transition-colors font-bold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
                  LinkedIn
                </a>
              </div>
            </div>

            <div className="flex-1 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-6">Get in Touch</h3>
              <form action={myDetails.formspreeUrl} method="POST" className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-1">Name</label>
                  <input type="text" id="name" name="name" required className="w-full bg-brand-dark border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-brand-light-orange transition-colors" placeholder="Jane Doe" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">Email</label>
                  <input type="email" id="email" name="email" required className="w-full bg-brand-dark border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-brand-light-orange transition-colors" placeholder="jane@example.com" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-white/70 mb-1">Message</label>
                  <textarea id="message" name="message" rows={4} required className="w-full bg-brand-dark border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:border-brand-light-orange transition-colors resize-none" placeholder="I'd love to chat about your project..."></textarea>
                </div>
                <button type="submit" className="w-full bg-brand-light-orange text-brand-dark font-bold py-3 rounded-lg hover:bg-brand-brown-orange hover:text-white transition-colors shadow-lg">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <ScrollToTop />

      <footer className="w-full text-center py-8 text-brand-dark/50 text-sm font-medium border-t border-brand-light-orange/20 mt-10">
        <p>© {new Date().getFullYear()} OrangeCV. Built with Next.js, FastAPI, and Groq AI.</p>
      </footer>
    </div>
  );
}