"use client";

import React from "react";
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
  Receipt,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";

export function AiAgentShowcase() {
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

            {/* Headline with lighter, editorial font weight */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-[#26211F] dark:text-[#F4F5F7] leading-[1.15] mb-6">
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

          {/* Right Column: Realistic Mobile ChatGPT Vector directly shown (no outer box) */}
          <div className="lg:col-span-6 flex items-center justify-center relative py-4">
            {/* Subtle ambient glow behind phone for depth */}
            <div className="absolute w-64 h-80 bg-gradient-to-tr from-[#9E5D48]/15 via-[#D99419]/10 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />

            {/* Realistic Mobile ChatGPT Vector Frame */}
            <div className="w-full max-w-[315px] sm:max-w-[335px] relative">
              {/* Physical Side Buttons on Outer Edge */}
              <div className="absolute -left-[5px] top-20 w-[3px] h-7 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-l-xs" />
              <div className="absolute -left-[5px] top-30 w-[3px] h-10 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-l-xs" />
              <div className="absolute -left-[5px] top-42 w-[3px] h-10 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-l-xs" />
              <div className="absolute -right-[5px] top-28 w-[3px] h-14 bg-[#B8AFA6] dark:bg-[#3E414B] rounded-r-xs" />

              {/* Phone Chassis */}
              <div className="rounded-[42px] p-[10px] bg-gradient-to-b from-[#2E2A27] via-[#1E1C1A] to-[#121110] dark:from-[#2B2C33] dark:via-[#191A1E] dark:to-[#0D0E10] shadow-2xl ring-1 ring-black/20 dark:ring-white/10">
                {/* Smartphone Screen Inner Bezel */}
                <div className="rounded-[32px] overflow-hidden bg-[#FFFFFF] dark:bg-[#111215] border border-[#E7E2DA] dark:border-[#22242B] flex flex-col justify-between shadow-inner text-[#1C1B18] dark:text-[#F4F5F7] min-h-[470px]">
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

                  {/* Chat Messages Timeline: Clean Expense Logging */}
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
                        spent ₹450 on lunch at Blue Tokai
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
                          createExpenseRecord
                        </span>
                      </div>

                      {/* Expense Confirmation Card */}
                      <div className="w-full rounded-xl border border-[#DDD5CB] dark:border-[#282B35] bg-[#FAF8F5] dark:bg-[#181920] p-3 shadow-xs">
                        {/* Status line */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            <Check size={10} strokeWidth={3} />
                            <span>Encrypted &amp; Logged</span>
                          </span>
                          <span className="font-mono text-[9px] text-[#A39B92] dark:text-[#6C7280]">
                            200 OK
                          </span>
                        </div>

                        {/* Expense Card Body */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#EFEBE4] dark:bg-[#22242D] border border-[#DDD5CB] dark:border-[#2E313D] flex items-center justify-center shrink-0 text-[#9E5D48] dark:text-[#E07A5F]">
                            <Receipt size={15} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-bold text-[#26211F] dark:text-[#F4F5F7] truncate leading-tight">
                              ₹450.00
                            </span>
                            <span className="text-[11px] text-[#6D635C] dark:text-[#9BA1B0] leading-tight mt-0.5">
                              Food &amp; Dining · Blue Tokai
                            </span>
                          </div>
                        </div>

                        {/* Footer metadata */}
                        <div className="mt-2.5 pt-2 border-t border-[#EFECE6] dark:border-[#23252E] flex items-center justify-between text-[9px] font-mono text-[#A39B92] dark:text-[#6C7280]">
                          <span>AES-256-GCM client encrypted · 38ms</span>
                          <span className="text-[#D99419]">EXPENSES API</span>
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
          </div>
        </div>
      </div>
    </section>
  );
}

