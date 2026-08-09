import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements matching the soft theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.15]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent-pink)] blur-3xl mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent-blue)] blur-3xl mix-blend-multiply"></div>
      </div>

      <div className="z-10 flex flex-col items-center text-center animate-[fadeIn_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        {/* Large 404 Text */}
        <h1 className="font-serif text-[120px] md:text-[160px] leading-none font-bold tracking-tight text-text-primary mb-2 opacity-90 select-none">
          404
        </h1>
        
        {/* Subtitle */}
        <h2 className="font-serif text-3xl md:text-4xl italic font-medium tracking-wide text-text-secondary mb-6">
          Page Not Found
        </h2>
        
        {/* Description */}
        <p className="text-text-muted text-sm md:text-base max-w-md mx-auto mb-10 leading-relaxed font-mono tracking-wide uppercase">
          The page you are looking for doesn't exist or has been moved to another ledger.
        </p>

        {/* Action Button */}
        <Link 
          href="/" 
          className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full border border-text-primary bg-text-primary px-8 font-medium text-bg-primary transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
        >
          <span className="relative z-10 flex items-center gap-2">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="transition-transform duration-300 group-hover:-translate-x-1"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Return to Dashboard
          </span>
        </Link>
      </div>
    </div>
  );
}
