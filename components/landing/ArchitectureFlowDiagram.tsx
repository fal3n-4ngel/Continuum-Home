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
          <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
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
          2. EXTERNAL SYNCS
        </text>
        <text x="605" y="22" textAnchor="middle" fontFamily="monospace" fontSize="9.5" fontWeight="600" letterSpacing="0.14em" className="fill-[#9C9288] uppercase">
          3. CONTINUUM CORE
        </text>
        <text x="730" y="22" fontFamily="monospace" fontSize="9.5" fontWeight="600" letterSpacing="0.14em" className="fill-[#9C9288] uppercase">
          4. AI CORE &amp; ANALYTICS
        </text>
        <line x1="40" y1="32" x2="930" y2="32" stroke="#DDD5CB" strokeWidth="0.8" strokeDasharray="3 3" className="dark:stroke-[#25272E]" />

        {/* ================= CONNECTING BEZIER PATHS ================= */}

        {/* Col 1.1 (Website) -> Col 2.1 (Trakt & TMDB) */}
        <path
          d="M 230 101 C 255 101, 255 76, 280 76"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 1.1 (Website) -> Direct to Center Core */}
        <path
          d="M 230 101 C 395 101, 395 166, 560 166"
          fill="none"
          stroke="#9E5D48"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 1.2 (Custom GPT) -> Col 2.2 (AniList & Books) */}
        <path
          d="M 230 231 C 255 231, 255 166, 280 166"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 1.2 (Custom GPT) -> Direct to Center Core */}
        <path
          d="M 230 231 C 395 231, 395 166, 560 166"
          fill="none"
          stroke="#10B981"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 1.2 (Custom GPT) -> Col 2.3 (Market Data Feeds) */}
        <path
          d="M 230 231 C 255 231, 255 256, 280 256"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 2.1 (Trakt Sync) -> Center Continuum Core */}
        <path
          d="M 480 76 C 520 76, 520 166, 560 166"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 2.2 (AniList & Books) -> Center Continuum Core */}
        <line
          x1="480"
          y1="166"
          x2="560"
          y2="166"
          stroke="#9E5D48"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Col 2.3 (Market Feeds) -> Center Continuum Core */}
        <path
          d="M 480 256 C 520 256, 520 166, 560 166"
          fill="none"
          stroke="#D99419"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Center Continuum Core -> Col 4.1 (Financial Analytics) */}
        <path
          d="M 650 166 C 690 166, 690 76, 730 76"
          fill="none"
          stroke="#9E5D48"
          strokeWidth="1.75"
          strokeDasharray="4 4"
        />

        {/* Center Continuum Core -> Col 4.2 (AI Core Insights - If Enabled) */}
        <line
          x1="650"
          y1="166"
          x2="730"
          y2="166"
          stroke="#10B981"
          strokeWidth="1.75"
          strokeDasharray="4 4"
        />

        {/* Center Continuum Core -> Col 4.3 (Conversational Copilot) */}
        <path
          d="M 650 166 C 690 166, 690 256, 730 256"
          fill="none"
          stroke="#3B82F6"
          strokeWidth="1.75"
          strokeDasharray="4 4"
        />

        {/* Animated Flying Particles */}
        <circle r="2.8" fill="#10B981">
          <animateMotion
            path="M 230 231 C 395 231, 395 166, 560 166 L 650 166 L 730 166"
            dur="3.8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="2.8" fill="#D99419">
          <animateMotion
            path="M 230 101 C 255 101, 255 76, 280 76 C 520 76, 520 166, 560 166 L 650 166 C 690 166, 690 76, 730 76"
            dur="4.5s"
            begin="1.8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* ================= COLUMN 1: INCOMING DATA ================= */}

        {/* Card 1.1: Web Application */}
        <g transform="translate(40, 74)" className="cursor-pointer">
          <rect x="0" y="0" width="190" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          {/* Icon Box: Browser / Web Window */}
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <rect x="17" y="18" width="18" height="18" rx="1.5" stroke="#9E5D48" strokeWidth="1.3" fill="none" />
          <line x1="17" y1="24" x2="35" y2="24" stroke="#9E5D48" strokeWidth="1" />
          <circle cx="21" cy="21" r="1" fill="#9E5D48" />
          <circle cx="25" cy="21" r="1" fill="#D99419" />

          {/* Texts */}
          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Web Application</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Website &amp; direct logs</text>

          {/* Badge */}
          <rect x="144" y="19" width="36" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="162" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="600" fill="#9E5D48">WEBSITE</text>
        </g>

        {/* Card 1.2: Custom GPT & AI Agents */}
        <g transform="translate(40, 204)" className="cursor-pointer">
          <rect x="0" y="0" width="190" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          {/* Icon Box: Custom GPT & Actions */}
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <path d="M 20 27 L 23 21 L 26 27 L 32 23 L 26 31 Z" stroke="#10B981" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
          <circle cx="26" cy="21" r="1.5" fill="#10B981" />

          {/* Texts */}
          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Custom GPT &amp; AI</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">OpenAPI 3.1 Actions</text>

          {/* Badge */}
          <rect x="134" y="19" width="46" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#10B981]/40" strokeWidth="0.8" />
          <text x="157" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7" fontWeight="600" fill="#10B981">CUSTOM GPT</text>
        </g>

        {/* ================= COLUMN 2: EXTERNAL SYNCS ================= */}

        {/* Card 2.1: Trakt & TMDB Sync */}
        <g transform="translate(280, 49)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <rect x="17" y="19" width="18" height="15" rx="1.5" stroke="#D99419" strokeWidth="1.2" fill="none" />
          <polygon points="24,23 29,26.5 24,30" fill="#D99419" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Trakt &amp; TMDB</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Movie &amp; show syncs</text>

          <rect x="144" y="19" width="46" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="167" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="600" fill="#D99419">MEDIA SYNC</text>
        </g>

        {/* Card 2.2: AniList & Books */}
        <g transform="translate(280, 139)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <path d="M 18 21 Q 26 19, 26 31 Q 26 19, 34 21" stroke="#3B82F6" strokeWidth="1.4" fill="none" />
          <line x1="26" y1="19" x2="26" y2="31" stroke="#3B82F6" strokeWidth="1.2" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">AniList &amp; Books</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Anime &amp; OpenLibrary</text>

          <rect x="148" y="19" width="42" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="169" y="30" textAnchor="middle" fontFamily="monospace" fontSize="8" fontWeight="600" fill="#3B82F6">BOOKS</text>
        </g>

        {/* Card 2.3: Market Data Feeds */}
        <g transform="translate(280, 229)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <polyline points="18,31 23,24 28,27 34,18" stroke="#D99419" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="30,18 34,18 34,22" stroke="#D99419" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Market Feeds</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">NSE stocks &amp; AMFI NAVs</text>

          <rect x="144" y="19" width="46" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="167" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="600" fill="#D99419">PRICES</text>
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
          <g transform="translate(33, 13)">
            <rect x="0" y="0" width="10" height="10" rx="1.5" fill="#FAF8F5" />
            <rect x="14" y="0" width="10" height="10" rx="1.5" fill="#D99419" />
            <rect x="0" y="14" width="10" height="10" rx="1.5" fill="#D99419" />
            <rect x="14" y="14" width="10" height="10" rx="1.5" fill="#FAF8F5" />
          </g>

          <text
            x="45"
            y="52"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="7.5"
            fontWeight="bold"
            letterSpacing="0.06em"
            fill="#D99419"
          >
            CONTINUUM CORE
          </text>
          <text
            x="45"
            y="63"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="6.5"
            fontWeight="600"
            letterSpacing="0.04em"
            className="fill-[#9C9288]"
          >
            AES-256-GCM
          </text>
        </g>

        {/* ================= COLUMN 4: AI CORE & ANALYTICS ================= */}

        {/* Card 4.1: Financial Analytics */}
        <g transform="translate(730, 49)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <rect x="18" y="26" width="3.5" height="10" fill="#9E5D48" />
          <rect x="24" y="20" width="3.5" height="16" fill="#D99419" />
          <rect x="30" y="16" width="3.5" height="20" fill="#9E5D48" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Financial Analytics</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Runway &amp; salary cycles</text>

          <rect x="144" y="19" width="46" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="167" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="600" fill="#9E5D48">METRICS</text>
        </g>

        {/* Card 4.2: AI Core (If Enabled) */}
        <g transform="translate(730, 139)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          {/* Sparkles / AI Core Icon */}
          <path d="M 26 17 L 27.5 22 L 32 23.5 L 27.5 25 L 26 30 L 24.5 25 L 20 23.5 L 24.5 22 Z" fill="#10B981" />
          <path d="M 18 18 L 19 20 L 21 21 L 19 22 L 18 24 L 17 22 L 15 21 L 17 20 Z" fill="#D99419" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">AI Analytics Core</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Daily advice &bull; If enabled</text>

          {/* Prominent OPT-IN Badge */}
          <rect x="134" y="19" width="56" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#10B981]/50" strokeWidth="0.8" />
          <circle cx="141" cy="26.5" r="2" fill="#10B981" />
          <text x="165" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7" fontWeight="bold" fill="#10B981">IF ENABLED</text>
        </g>

        {/* Card 4.3: Conversational Copilot */}
        <g transform="translate(730, 229)" className="cursor-pointer">
          <rect x="0" y="0" width="200" height="54" rx="3" filter="url(#arch-card-shadow)" className="fill-[#FAF8F5] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="1" />
          
          <rect x="10" y="11" width="32" height="32" rx="2" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <path d="M 17 21 C 17 19 19 17 21 17 H 31 C 33 17 35 19 35 21 V 27 C 35 29 33 31 31 31 H 23 L 18 34 V 31 H 21" stroke="#3B82F6" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          <text x="50" y="26" fontFamily="sans-serif" fontSize="11" fontWeight="600" className="fill-[#26211F] dark:fill-[#F4F5F7]">Assistant Copilot</text>
          <text x="50" y="38" fontFamily="sans-serif" fontSize="9" className="fill-[#6D635C] dark:fill-[#9BA1B0]">Gemini &amp; Groq Q&amp;A</text>

          <rect x="144" y="19" width="46" height="15" rx="1.5" className="fill-[#F3EFEA] dark:fill-[#121316] stroke-[#DDD5CB] dark:stroke-[#25272E]" strokeWidth="0.8" />
          <text x="167" y="30" textAnchor="middle" fontFamily="monospace" fontSize="7.5" fontWeight="600" fill="#3B82F6">ASSISTANT</text>
        </g>

      </svg>

      {/* Footer Architectural Flow Pipeline Legend */}
      <div className="mt-4 pt-3 border-t border-dashed border-[#DDD5CB] dark:border-[#25272E] flex flex-wrap items-center justify-between gap-3 font-mono text-[9px] text-[#9C9288] uppercase">
        <div className="flex items-center gap-2">
          <span className="text-[#9E5D48] dark:text-[#E07A5F] font-semibold">FLOW:</span>
          <span>1. Incoming (Custom GPT / Website)</span>
          <span className="text-[#D99419]">&rarr;</span>
          <span>2. External Syncs (Trakt / AniList / Books)</span>
          <span className="text-[#D99419]">&rarr;</span>
          <span>3. Encrypted Core</span>
          <span className="text-[#D99419]">&rarr;</span>
          <span className="text-[#10B981] font-semibold">4. AI Core (If Enabled)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#10B981]">&bull; STRICT OPT-IN</span>
          <span>&bull; ZERO MODEL TRAINING</span>
        </div>
      </div>
    </div>
  );
}

