"use client";

import React from "react";

export function ArchitectureFlowDiagram() {
  return (
    <div className="relative w-full max-w-5xl mx-auto rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-5 sm:p-7 shadow-xs overflow-hidden select-none">
      
      {/* Corner Ochre Tick Marks */}
      <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419] select-none pointer-events-none z-10">⌜</span>
      <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419] select-none pointer-events-none z-10">⌝</span>
      <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419] select-none pointer-events-none z-10">⌞</span>
      <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419] select-none pointer-events-none z-10">⌟</span>

      {/* Top Bar Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#DDD5CB] dark:border-[#25272E] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="font-mono text-[10.5px] font-bold tracking-wider text-[#9E5D48] dark:text-[#E07A5F] uppercase">
            SYSTEM ARCHITECTURE FLOW
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-[#9C9288]">
          <span>REST / OpenAPI 3.1</span>
          <span>&bull;</span>
          <span className="border border-[#9E5D48]/40 bg-[#FAF8F5] dark:bg-[#141518] px-2 py-0.5 font-bold text-[#9E5D48] dark:text-[#E07A5F] rounded-xs uppercase">
            AES-256 ENCRYPTED
          </span>
        </div>
      </div>

      {/* Responsive Architectural SVG Diagram */}
      <svg
        viewBox="0 0 1000 330"
        className="w-full h-auto block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Dot Grid */}
          <pattern
            id="arch-dots"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="0.8" className="fill-[#DDD5CB]/80 dark:fill-[#25272E]" />
          </pattern>

          {/* Soft Card Shadow */}
          <filter id="arch-card-shadow" x="-5%" y="-5%" width="110%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodOpacity="0.04" />
          </filter>
        </defs>

        {/* Dotted Background */}
        <rect width="100%" height="100%" fill="url(#arch-dots)" />

        {/* ================= COLUMN HEADERS ================= */}
        <text x="40" y="22" fontFamily="monospace" fontSize="9.5" fontWeight="600" letterSpacing="0.14em" className="fill-[#9C9288] uppercase">
          1. INCOMING DATA
        </text>
        <text x="280" y="22" fontFamily="monospace" fontSize="9.5" fontWeight="600" letterSpacing="0.14em" className="fill-[#9C9288] uppercase">
          2. CONTINUUM ENGINE
        </text>
        <text x="605" y="22" textAnchor="middle" fontFamily="monospace" fontSize="9.5" fontWeight="600" letterSpacing="0.14em" className="fill-[#9C9288] uppercase">
          3. CONTINUUM CORE
        </text>
        <text x="730" y="22" fontFamily="monospace" fontSize="9.5" fontWeight="600" letterSpacing="0.14em" className="fill-[#9C9288] uppercase">
          4. CLIENT INTERFACES
        </text>
        <line x1="40" y1="32" x2="930" y2="32" stroke="#DDD5CB" strokeWidth="0.8" strokeDasharray="3 3" className="dark:stroke-[#25272E]" />

        {/* ================= CONNECTING BEZIER PATHS ================= */}

        {/* Col 1.1 (External Sync) -> Col 2.1 (Expense Analytics) */}
        <path
          d="M 230 95 C 255 95, 255 76, 280 76"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 1.1 (External Sync) -> Col 2.2 (Media Sync Engine) */}
        <path
          d="M 230 95 C 255 95, 255 166, 280 166"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 1.2 (Local Entries) -> Col 2.3 (Reading Library) */}
        <path
          d="M 230 235 C 255 235, 255 256, 280 256"
          fill="none"
          stroke="#9E5D48"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 2.1 -> Center Continuum Core (Equidistant 80px gap) */}
        <path
          d="M 480 76 C 520 76, 520 166, 560 166"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 2.2 -> Center Continuum Core */}
        <line
          x1="480"
          y1="166"
          x2="560"
          y2="166"
          stroke="#9E5D48"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 2.3 -> Center Continuum Core */}
        <path
          d="M 480 256 C 520 256, 520 166, 560 166"
          fill="none"
          stroke="#9E5D48"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Center Continuum Core -> Col 4.1 (Dashboard Canvas) (Equidistant 80px gap) */}
        <path
          d="M 650 166 C 690 166, 690 101, 730 101"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.75"
          strokeDasharray="4 4"
        />

        {/* Center Continuum Core -> Col 4.2 (OpenAPI Endpoints) */}
        <path
          d="M 650 166 C 690 166, 690 231, 730 231"
          fill="none"
          stroke="#9E5D48"
          strokeWidth="1.75"
          strokeDasharray="4 4"
        />

        {/* Animated Flying Particles */}
        <circle r="2.8" fill="#D99419">
          <animateMotion
            path="M 230 95 C 255 95, 255 166, 280 166 L 560 166 L 650 166 C 690 166, 690 101, 730 101"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="2.8" fill="#9E5D48">
          <animateMotion
            path="M 230 235 C 255 235, 255 256, 280 256 C 520 256, 520 166, 560 166 L 650 166 C 690 166, 690 231, 730 231"
            dur="4.5s"
            begin="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* ================= COLUMN 1: INCOMING DATA ================= */}

        {/* Card 1.1: External Sync */}
        <g transform="translate(40, 68)" className="cursor-pointer">
          <rect x="0" y="0" width="190" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          {/* Icon Box */}
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <path d="M 22 23 L 26 27 L 30 23 M 26 31 L 26 27" stroke="#9E5D48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 20 27 H 18 A 3 3 0 0 1 18 21 H 24" stroke="#D99419" strokeWidth="1.2" strokeLinecap="round" />

          {/* Texts */}
          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">External Sync</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Trakt &amp; AniList APIs</text>

          {/* Badge */}
          <rect x="152" y="19" width="28" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="166" y="30" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="600" fill="#D99419">API</text>
        </g>

        {/* Card 1.2: Local Entries */}
        <g transform="translate(40, 208)" className="cursor-pointer">
          <rect x="0" y="0" width="190" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          {/* Icon Box */}
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <path d="M 21 31 L 31 21 L 27 17 L 17 27 L 17 31 Z" stroke="#D99419" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
          <line x1="25" y1="19" x2="29" y2="23" stroke="#D99419" strokeWidth="1.3" />

          {/* Texts */}
          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Local Entries</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Expenses, logs &amp; notes</text>

          {/* Badge */}
          <rect x="146" y="19" width="34" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="163" y="30" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="600" fill="#D99419">USER</text>
        </g>

        {/* ================= COLUMN 2: CONTINUUM ENGINE ================= */}

        {/* Card 2.1: Expense Analytics */}
        <g transform="translate(280, 49)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <rect x="18" y="26" width="3.5" height="10" fill="#9E5D48" />
          <rect x="24" y="20" width="3.5" height="16" fill="#D99419" />
          <rect x="30" y="16" width="3.5" height="20" fill="#9E5D48" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Expense Analytics</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Salary cycles &amp; Encryption</text>

          <rect x="146" y="19" width="44" height="15" rx="1.5" className="fill-[#FAF8F5] dark:fill-[#121316] stroke-[#E07A5F]" strokeWidth="0.8" />
          <text x="168" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="bold" fill="#E07A5F">AES-256</text>
        </g>

        {/* Card 2.2: Media Sync Engine */}
        <g transform="translate(280, 139)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <rect x="17" y="19" width="18" height="15" rx="1.5" stroke="#D99419" strokeWidth="1.2" fill="none" />
          <polygon points="24,23 29,26.5 24,30" fill="#D99419" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Media Sync Engine</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Trakt &amp; AniList updates</text>

          <rect x="150" y="19" width="40" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="170" y="30" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="600" fill="#7C98A6">OAUTH</text>
        </g>

        {/* Card 2.3: Reading Library */}
        <g transform="translate(280, 229)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <path d="M 18 21 Q 26 19, 26 31 Q 26 19, 34 21" stroke="#22c55e" strokeWidth="1.4" fill="none" />
          <line x1="26" y1="19" x2="26" y2="31" stroke="#22c55e" strokeWidth="1.2" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Reading Library</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">OpenLibrary cataloging</text>

          <rect x="144" y="19" width="46" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="167" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="600" fill="#22c55e">OPENLIB</text>
        </g>

        {/* ================= COLUMN 3: CONTINUUM CORE (CENTER CORE) ================= */}
        <g transform="translate(560, 130)" className="cursor-pointer">
          <rect
            x="0"
            y="0"
            width="90"
            height="72"
            rx="6"
            filter="url(#arch-card-shadow)"
            className="fill-[#1C1B18] dark:fill-[#121316] stroke-[#9E5D48] dark:stroke-[#E07A5F]"
            strokeWidth="1.5"
          />

          {/* Bento Logo in Center */}
          <g transform="translate(33, 14)">
            <rect x="0" y="0" width="10" height="10" rx="1.5" fill="#FAF8F5" />
            <rect x="14" y="0" width="10" height="10" rx="1.5" fill="#D99419" />
            <rect x="0" y="14" width="10" height="10" rx="1.5" fill="#D99419" />
            <rect x="14" y="14" width="10" height="10" rx="1.5" fill="#FAF8F5" />
          </g>

          <text
            x="45"
            y="54"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="7.5"
            fontWeight="bold"
            letterSpacing="0.06em"
            fill="#D99419"
          >
            CONTINUUM CORE
          </text>
        </g>

        {/* ================= COLUMN 4: CLIENT INTERFACES ================= */}

        {/* Card 4.1: Dashboard Canvas */}
        <g transform="translate(730, 74)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <rect x="17" y="18" width="18" height="18" rx="1.5" stroke="#9E5D48" strokeWidth="1.3" fill="none" />
          <line x1="17" y1="24" x2="35" y2="24" stroke="#9E5D48" strokeWidth="1" />
          <line x1="23" y1="24" x2="23" y2="36" stroke="#9E5D48" strokeWidth="1" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Dashboard Canvas</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">For Human Users</text>

          <rect x="148" y="19" width="42" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="169" y="30" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="600" fill="#9E5D48">WEB UI</text>
        </g>

        {/* Card 4.2: OpenAPI Endpoints */}
        <g transform="translate(730, 204)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <path d="M 18 22 L 23 27 L 18 32" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="25" y1="32" x2="33" y2="32" stroke="#3b82f6" strokeWidth="1.5" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">OpenAPI Endpoints</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">For ChatGPT &amp; AI Agents</text>

          <rect x="150" y="19" width="40" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="170" y="30" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="600" fill="#3b82f6">READY</text>
        </g>

      </svg>
    </div>
  );
}
