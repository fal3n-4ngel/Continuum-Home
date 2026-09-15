"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";

interface PromptExample {
  id: string;
  userPrompt: string;
  actionBadge: string;
  actionTitle: string;
  actionSubtitle: string;
  tag: string;
}

const PROMPT_EXAMPLES: PromptExample[] = [
  {
    id: "watchlist",
    userPrompt: "add dune part two to my watchlist",
    actionBadge: "✓ Added to Plan to Watch",
    actionTitle: "Dune: Part Two",
    actionSubtitle: "movie · TMDB sync",
    tag: "MEDIA API",
  },
  {
    id: "expense",
    userPrompt: "spent ₹450 on lunch at Blue Tokai",
    actionBadge: "✓ Logged ₹450.00",
    actionTitle: "Food & Dining",
    actionSubtitle: "AES-256 encrypted · 42ms",
    tag: "EXPENSES API",
  },
];

export function AiAgentShowcase() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const activeExample = PROMPT_EXAMPLES[activeTab];

  return (
    <section
      id="ai-agent"
      className="relative z-10 border-t border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5]/80 dark:bg-[#141518]/80 py-20 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        
        {/* Section Top Header Strip */}
        <div className="flex items-center justify-between border-b border-[#DDD5CB] dark:border-[#25272E] pb-4 mb-14 md:mb-20">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#9E5D48] dark:text-[#E07A5F]">
              ⌜ 02 // OPENAPI 3.1 &amp; AI AGENTS ⌟
            </span>
            <span className="text-[#DDD5CB] dark:text-[#25272E]">&bull;</span>
            <span className="font-mono text-xs text-[#9C9288]">AGENT INTERFACE SPECIFICATION</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#D99419]">
            <span>SCHEMA: /api/openapi.json</span>
          </div>
        </div>

        {/* 2-Column Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Headline, Description & Features */}
          <div className="lg:col-span-6 flex flex-col items-start">
            
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-3 py-1 font-mono text-xs tracking-wider text-[#9E5D48] dark:text-[#E07A5F] uppercase mb-6 rounded-sm shadow-2xs">
              <span>🤖</span>
              <span>OPENAPI 3.1 &amp; AI AGENTS</span>
            </div>

            {/* Headline matching screenshot */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#26211F] dark:text-[#F4F5F7] leading-[1.1] mb-6">
              Your data, your{" "}
              <span className="font-serif italic font-normal text-[#9E5D48] dark:text-[#E07A5F]">
                AI agent.
              </span>
            </h2>

            {/* Explanatory Paragraph */}
            <p className="text-sm sm:text-base leading-relaxed text-[#6D635C] dark:text-[#9BA1B0] mb-8 max-w-xl">
              Every API route in Continuum exposes a clean, standard OpenAPI 3.1
              specification. Plug the schema directly into custom ChatGPT Actions, Claude,
              Groq function calling, or MCP tool servers to interact with your data in plain
              English.
            </p>

            {/* Key Bullet Points */}
            <ul className="flex flex-col gap-3.5 text-xs sm:text-sm text-[#26211F] dark:text-[#F4F5F7] mb-9 font-medium">
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>Works natively with custom ChatGPT Actions (Custom GPTs)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>
                  Log expenses, add movies to watchlists, or ask for portfolio totals via natural language
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>Ready for agent frameworks (Dify, Flowise, LangChain, MCP sidecars)</span>
              </li>
            </ul>

            {/* CTA Button */}
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="/assistant"
                className="inline-flex items-center gap-2 rounded-sm bg-[#1C1B18] dark:bg-[#F4F5F7] px-5 py-3 font-mono text-xs font-semibold text-[#FAF8F5] dark:text-[#0C0D0E] uppercase tracking-wider transition-all duration-150 hover:opacity-90 shadow-xs cursor-pointer no-underline"
              >
                <span>View Assistant Setup Guide</span>
                <span>&rarr;</span>
              </a>

              <a
                href="/api/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-4 py-3 font-mono text-xs font-semibold text-[#6D635C] dark:text-[#9BA1B0] hover:text-[#9E5D48] hover:border-[#9E5D48] transition-colors no-underline uppercase tracking-wider"
              >
                <span>OpenAPI JSON</span>
                <span className="text-[10px] text-[#D99419]">↗</span>
              </a>
            </div>

          </div>

          {/* Right Column: Architectural Mock Terminal / Chat UI from Screenshot */}
          <div className="lg:col-span-6 relative">
            
            {/* Outer Architectural Container Card */}
            <div className="relative rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-6 sm:p-8 shadow-sm">
              
              {/* Corner Ochre Tick Marks */}
              <span className="absolute top-2.5 left-2.5 font-mono text-[11px] text-[#D99419] select-none">⌜</span>
              <span className="absolute top-2.5 right-2.5 font-mono text-[11px] text-[#D99419] select-none">⌝</span>
              <span className="absolute bottom-2.5 left-2.5 font-mono text-[11px] text-[#D99419] select-none">⌞</span>
              <span className="absolute bottom-2.5 right-2.5 font-mono text-[11px] text-[#D99419] select-none">⌟</span>

              {/* Chat Window Frame Header */}
              <div className="flex items-center justify-between border-b border-[#DDD5CB] dark:border-[#25272E] pb-3.5 mb-6">
                {/* Traffic light dots */}
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                </div>

                {/* Center Title */}
                <div className="font-mono text-[11px] font-semibold tracking-wider text-[#6D635C] dark:text-[#9BA1B0] uppercase">
                  CHATGPT &bull; CONTINUUM ACTION API
                </div>

                {/* Right Spec Version Pill */}
                <div className="font-mono text-[9px] text-[#D99419] border border-[#DDD5CB] dark:border-[#25272E] px-1.5 py-0.5 rounded-xs bg-[#FAF8F5] dark:bg-[#18191D]">
                  v1.2
                </div>
              </div>

              {/* Interactive Chat Canvas Body */}
              <div className="flex flex-col justify-between min-h-[260px] sm:min-h-[290px]">
                
                {/* Upper Prompt Selector Tabs */}
                <div className="flex items-center gap-2 mb-4 font-mono text-[10px]">
                  <span className="text-[#9C9288] uppercase">DEMO PROMPT:</span>
                  <button
                    onClick={() => setActiveTab(0)}
                    className={`px-2 py-0.5 rounded-xs transition-all cursor-pointer ${
                      activeTab === 0
                        ? "bg-[#9E5D48] text-[#FAF8F5] font-bold"
                        : "border border-[#DDD5CB] dark:border-[#25272E] text-[#6D635C] dark:text-[#9BA1B0] hover:border-[#9E5D48]"
                    }`}
                  >
                    WATCHLIST
                  </button>
                  <button
                    onClick={() => setActiveTab(1)}
                    className={`px-2 py-0.5 rounded-xs transition-all cursor-pointer ${
                      activeTab === 1
                        ? "bg-[#9E5D48] text-[#FAF8F5] font-bold"
                        : "border border-[#DDD5CB] dark:border-[#25272E] text-[#6D635C] dark:text-[#9BA1B0] hover:border-[#9E5D48]"
                    }`}
                  >
                    EXPENSE
                  </button>
                </div>

                {/* Simulated Conversation Flow */}
                <div className="flex flex-col gap-6 my-auto">
                  
                  {/* User Bubble (Right) */}
                  <div className="flex justify-end">
                    <div className="rounded-lg bg-[#1C1B18] dark:bg-[#F4F5F7] px-4 py-2.5 text-xs sm:text-sm font-medium text-[#FAF8F5] dark:text-[#0C0D0E] shadow-xs max-w-[85%] font-sans">
                      {activeExample.userPrompt}
                    </div>
                  </div>

                  {/* Assistant / Action Response Card (Left) */}
                  <div className="flex justify-start">
                    <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 px-4 py-3 shadow-xs max-w-[85%]">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <span>{activeExample.actionBadge}</span>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-emerald-900/80 dark:text-emerald-200/90">
                        {activeExample.actionTitle} &bull; {activeExample.actionSubtitle}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Baseline CAD Reference Tag */}
                <div className="mt-6 pt-3 border-t border-dashed border-[#DDD5CB] dark:border-[#25272E] flex items-center justify-between font-mono text-[9px] text-[#9C9288] uppercase">
                  <span>SPEC // {activeExample.tag}</span>
                  <span className="text-[#D99419]">HTTP/2 · 200 OK</span>
                </div>

              </div>

            </div>

            {/* Bottom-Right Crosshair Guide Marker */}
            <div className="absolute -bottom-5 -right-2 hidden sm:flex items-center gap-2 font-mono text-[9px] text-[#9C9288]/80 select-none">
              <div className="relative w-4 h-4 flex items-center justify-center">
                <div className="absolute w-4 h-px bg-[#9C9288]/60" />
                <div className="absolute h-4 w-px bg-[#9C9288]/60" />
              </div>
              <span>X 24.120 Y 08.450</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
