"use client";

import React, { useState } from "react";
import {
  Check,
  Menu,
  SquarePen,
  Plus,
  Mic,
  Headphones,
  Sparkles,
  Wifi,
  Battery,
  Signal,
  ChevronDown,
  Film,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";

interface PromptExample {
  id: string;
  tabLabel: string;
  userPrompt: string;
  apiOperation: string;
  apiPath: string;
  actionBadge: string;
  actionTitle: string;
  actionSubtitle: string;
  meta: string;
  cardType: "watchlist" | "expense" | "portfolio";
  tag: string;
}

const PROMPT_EXAMPLES: PromptExample[] = [
  {
    id: "watchlist",
    tabLabel: "01 // WATCHLIST",
    userPrompt: "add dune part two to my watchlist",
    apiOperation: "POST /api/watchlist",
    apiPath: "addWatchlistItem",
    actionBadge: "Added to Plan to Watch",
    actionTitle: "Dune: Part Two (2024)",
    actionSubtitle: "Sci-Fi / Adventure · 2h 46m",
    meta: "Synced with TMDB & Trakt",
    cardType: "watchlist",
    tag: "MEDIA API",
  },
  {
    id: "expense",
    tabLabel: "02 // EXPENSES",
    userPrompt: "spent ₹450 on lunch at Blue Tokai",
    apiOperation: "POST /api/expenses",
    apiPath: "createExpenseRecord",
    actionBadge: "Encrypted & Logged",
    actionTitle: "₹450.00",
    actionSubtitle: "Food & Dining · Blue Tokai",
    meta: "AES-256-GCM client encrypted · 38ms",
    cardType: "expense",
    tag: "EXPENSES API",
  },
  {
    id: "portfolio",
    tabLabel: "03 // PORTFOLIO",
    userPrompt: "how is my portfolio doing today?",
    apiOperation: "GET /api/portfolio",
    apiPath: "getPortfolioValuation",
    actionBadge: "Real-Time Valuation",
    actionTitle: "₹14,82,650.00",
    actionSubtitle: "+₹18,420 (+1.26%) today",
    meta: "Live NSE & AMFI mutual funds sync",
    cardType: "portfolio",
    tag: "FINANCE API",
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

          {/* Right Column: Realistic Mobile ChatGPT Vector on Architectural Continuum Stage */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
            {/* Outer Architectural Stage Card */}
            <div className="relative w-full max-w-[420px] rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-5 sm:p-7 shadow-sm">
              {/* Corner Ochre Tick Marks */}
              <span className="absolute top-2.5 left-2.5 font-mono text-[11px] text-[#D99419] select-none">⌜</span>
              <span className="absolute top-2.5 right-2.5 font-mono text-[11px] text-[#D99419] select-none">⌝</span>
              <span className="absolute bottom-2.5 left-2.5 font-mono text-[11px] text-[#D99419] select-none">⌞</span>
              <span className="absolute bottom-2.5 right-2.5 font-mono text-[11px] text-[#D99419] select-none">⌟</span>

              {/* Architectural Top Bar with Segmented Prompt Tabs */}
              <div className="flex flex-col gap-2.5 pb-4 mb-4 border-b border-[#DDD5CB] dark:border-[#25272E]">
                <div className="flex items-center justify-between font-mono text-[10px] text-[#9C9288] uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span>AGENT INTERACTION PROTOCOL</span>
                  </span>
                  <span className="text-[#D99419]">MOBILE CHATGPT</span>
                </div>

                {/* Segmented Architectural Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#F3EFEA] dark:bg-[#121316]">
                  {PROMPT_EXAMPLES.map((ex, idx) => (
                    <button
                      key={ex.id}
                      onClick={() => setActiveTab(idx)}
                      className={`py-1.5 px-1.5 text-[10px] font-mono tracking-wider uppercase rounded-xs transition-all duration-150 cursor-pointer text-center truncate ${
                        activeTab === idx
                          ? "bg-[#9E5D48] dark:bg-[#E07A5F] text-[#FAF8F5] dark:text-[#0C0D0E] font-bold shadow-2xs"
                          : "text-[#6D635C] dark:text-[#9BA1B0] hover:text-[#26211F] dark:hover:text-[#F4F5F7] bg-transparent border-0"
                      }`}
                    >
                      {ex.tabLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Realistic Mobile ChatGPT Vector Frame */}
              <div className="mx-auto w-full max-w-[310px] sm:max-w-[325px] relative">
                {/* Physical Side Buttons on Outer Edge */}
                <div className="absolute -left-[5px] top-20 w-[3px] h-7 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-l-xs" />
                <div className="absolute -left-[5px] top-30 w-[3px] h-10 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-l-xs" />
                <div className="absolute -left-[5px] top-42 w-[3px] h-10 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-l-xs" />
                <div className="absolute -right-[5px] top-28 w-[3px] h-14 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-r-xs" />

                {/* Phone Chassis */}
                <div className="rounded-[40px] p-[9px] bg-gradient-to-b from-[#2E2A27] via-[#1E1C1A] to-[#121110] dark:from-[#2B2C33] dark:via-[#191A1E] dark:to-[#0D0E10] shadow-2xl ring-1 ring-black/20 dark:ring-white/10">
                  {/* Smartphone Screen Inner Bezel */}
                  <div className="rounded-[32px] overflow-hidden bg-[#FFFFFF] dark:bg-[#111215] border border-[#E7E2DA] dark:border-[#22242B] flex flex-col justify-between shadow-inner text-[#1C1B18] dark:text-[#F4F5F7] min-h-[460px]">
                    {/* Top Notch / Dynamic Island & Status Bar */}
                    <div className="pt-2 px-5 bg-inherit z-10">
                      {/* Dynamic Island */}
                      <div className="relative w-24 h-5 bg-black rounded-full mx-auto flex items-center justify-between px-2 shadow-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] border border-[#222] flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-[#0a2540]" />
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0F2D1A]" />
                      </div>

                      {/* iOS Status Bar */}
                      <div className="flex items-center justify-between mt-1 text-[10px] font-semibold tracking-tight text-[#6D635C] dark:text-[#8E95A5]">
                        <span>9:41</span>
                        <div className="flex items-center gap-1.5">
                          <Signal size={10} strokeWidth={2.5} />
                          <Wifi size={10} strokeWidth={2.5} />
                          <div className="flex items-center gap-0.5">
                            <span className="text-[9px]">84%</span>
                            <Battery size={11} strokeWidth={2.2} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ChatGPT App Header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#EFECE6] dark:border-[#1E2026] mt-1">
                      <div className="p-1 text-[#6D635C] dark:text-[#9BA1B0]">
                        <Menu size={15} />
                      </div>

                      {/* Model & Custom GPT Pill */}
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3EFEA] dark:bg-[#1A1B20] border border-[#E5DFD7] dark:border-[#262830]">
                        <div className="w-4 h-4 rounded-full bg-[#9E5D48] dark:bg-[#E07A5F] flex items-center justify-center text-white">
                          <LogoMark size={10} color="#FFFFFF" />
                        </div>
                        <span className="text-[11px] font-semibold text-[#26211F] dark:text-[#F4F5F7]">
                          Continuum
                        </span>
                        <ChevronDown size={11} className="text-[#9C9288]" />
                      </div>

                      <div className="p-1 text-[#6D635C] dark:text-[#9BA1B0]">
                        <SquarePen size={14} />
                      </div>
                    </div>

                    {/* Chat Messages Timeline */}
                    <div className="flex-1 p-3.5 flex flex-col gap-3 justify-start overflow-hidden">
                      {/* Today timestamp */}
                      <div className="text-center my-0.5">
                        <span className="text-[9px] font-mono uppercase text-[#A39B92] dark:text-[#6C7280]">
                          Today · 9:41 AM
                        </span>
                      </div>

                      {/* User Message Bubble */}
                      <div className="flex justify-end">
                        <div className="rounded-2xl rounded-br-xs bg-[#1C1B18] dark:bg-[#2A2B32] text-[#FAF8F5] dark:text-[#F4F5F7] px-3.5 py-2 text-[12px] font-medium max-w-[85%] shadow-xs leading-snug">
                          {activeExample.userPrompt}
                        </div>
                      </div>

                      {/* Assistant Response Message */}
                      <div className="flex flex-col gap-2 items-start mt-1">
                        {/* ChatGPT Action Tool Call Pill */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F3EFEA] dark:bg-[#191A20] border border-[#E0DACF] dark:border-[#252833] text-[10px] text-[#6D635C] dark:text-[#9BA1B0] font-mono">
                          <Sparkles size={11} className="text-[#D99419]" />
                          <span className="font-semibold text-[#26211F] dark:text-[#E2E4E9]">
                            Talked to Continuum
                          </span>
                          <span className="text-[#A39B92] dark:text-[#6C7280]">•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {activeExample.apiPath}
                          </span>
                        </div>

                        {/* Main Response Rich Card */}
                        <div className="w-full rounded-xl border border-[#DDD5CB] dark:border-[#282B35] bg-[#FAF8F5] dark:bg-[#181920] p-3 shadow-xs">
                          {/* Status line */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              <Check size={10} strokeWidth={3} />
                              <span>{activeExample.actionBadge}</span>
                            </span>
                            <span className="font-mono text-[9px] text-[#A39B92] dark:text-[#6C7280]">
                              200 OK
                            </span>
                          </div>

                          {/* Content based on cardType */}
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#EFEBE4] dark:bg-[#22242D] border border-[#DDD5CB] dark:border-[#2E313D] flex items-center justify-center shrink-0 text-[#9E5D48] dark:text-[#E07A5F]">
                              {activeExample.cardType === "watchlist" && <Film size={15} />}
                              {activeExample.cardType === "expense" && <Receipt size={15} />}
                              {activeExample.cardType === "portfolio" && <TrendingUp size={15} />}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-bold text-[#26211F] dark:text-[#F4F5F7] truncate leading-tight">
                                {activeExample.actionTitle}
                              </span>
                              <span className="text-[11px] text-[#6D635C] dark:text-[#9BA1B0] leading-tight mt-0.5">
                                {activeExample.actionSubtitle}
                              </span>
                            </div>
                          </div>

                          {/* Footer metadata */}
                          <div className="mt-2.5 pt-2 border-t border-[#EFECE6] dark:border-[#23252E] flex items-center justify-between text-[9px] font-mono text-[#A39B92] dark:text-[#6C7280]">
                            <span>{activeExample.meta}</span>
                            <span className="text-[#D99419]">{activeExample.tag}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ChatGPT Bottom Mobile Input Bar */}
                    <div className="p-2.5 bg-inherit border-t border-[#EFECE6] dark:border-[#1E2026]">
                      <div className="flex items-center gap-2">
                        {/* Plus button */}
                        <div className="w-7 h-7 rounded-full bg-[#F0ECE4] dark:bg-[#1E2026] text-[#6D635C] dark:text-[#9BA1B0] flex items-center justify-center shrink-0">
                          <Plus size={14} />
                        </div>
                        {/* Input pill */}
                        <div className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-full bg-[#F3EFEA] dark:bg-[#1A1B20] border border-[#E5DFD7] dark:border-[#262830] text-[11px] text-[#A39B92] dark:text-[#6C7280]">
                          <span>Message Continuum...</span>
                          <Mic size={13} className="text-[#6D635C] dark:text-[#9BA1B0]" />
                        </div>
                        {/* Voice mode circle */}
                        <div className="w-7 h-7 rounded-full bg-[#1C1B18] dark:bg-[#F4F5F7] text-[#FAF8F5] dark:text-[#0C0D0E] flex items-center justify-center shrink-0 shadow-xs">
                          <Headphones size={13} />
                        </div>
                      </div>

                      {/* iOS Home Indicator Bar */}
                      <div className="w-24 h-1 bg-[#26211F]/20 dark:bg-[#F4F5F7]/25 rounded-full mx-auto mt-2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Baseline CAD Reference Tag */}
              <div className="mt-4 pt-3 border-t border-dashed border-[#DDD5CB] dark:border-[#25272E] flex items-center justify-between font-mono text-[9px] text-[#9C9288] uppercase">
                <span>{activeExample.apiOperation}</span>
                <span className="text-[#D99419]">HTTP/2 · SSL TLS 1.3</span>
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

