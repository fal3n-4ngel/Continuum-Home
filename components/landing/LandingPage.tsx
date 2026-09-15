"use client";

import React, { useEffect, useState } from "react";
import { AUTHOR, SITE_NAME } from "@/lib/utils";
import { LogoMark } from "@/components/Logo";
import { ArchitectureFlowDiagram } from "@/components/landing/ArchitectureFlowDiagram";
import { FeaturesShowcase } from "@/components/landing/FeaturesShowcase";
import { AiAgentShowcase } from "@/components/landing/AiAgentShowcase";
import { Sun, Moon, Terminal, Shield, Lock, ExternalLink, ChevronDown, Check, ArrowRight } from "lucide-react";

interface LandingPageProps {
  onLogin: () => void;
  authError?: string;
  firebaseAuthReady: boolean;
}





const FAQ_ITEMS: { question: string; answer: string; ref: string }[] = [
  {
    ref: "SPEC-01",
    question: "Is Continuum completely free and self-hostable?",
    answer:
      "Yes. Continuum is 100% open-source under the MIT license. You can deploy it to your own Vercel account linked to a Google Firebase free-tier project with zero fees and no usage paywalls.",
  },
  {
    ref: "SPEC-02",
    question: "How is personal financial data encrypted?",
    answer:
      "Financial entries (amounts, categories, titles, asset allocations) are encrypted at rest with server-side AES-256-GCM using a 12-byte random IV. In-memory and Redis caches store ciphertext blobs only; decryption happens strictly per authorized request.",
  },
  {
    ref: "SPEC-03",
    question: "How does the OpenAI / ChatGPT Custom GPT integration work?",
    answer:
      "Continuum automatically generates a compliant OpenAPI 3.1 specification at /api/openapi.json. You configure ChatGPT Actions or Claude with your authenticated token, enabling you to log expenses or update queues via natural language.",
  },
  {
    ref: "SPEC-04",
    question: "Can I import and export my existing records?",
    answer:
      "Yes. Continuum supports complete CSV and JSON import/export for expenses and subscriptions, alongside two-way watch status synchronization with AniList, Trakt.tv, and Letterboxd archives.",
  },
  {
    ref: "SPEC-05",
    question: "What platforms and browsers are supported?",
    answer:
      "Continuum is designed as a modern Progressive Web App (PWA) that installs seamlessly on macOS, iOS Safari, Android Chrome, Windows, and Linux desktops with offline fallback.",
  },
];

export default function LandingPage({
  onLogin,
  authError,
  firebaseAuthReady,
}: LandingPageProps) {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("landing_theme") : null;
    const shouldBeDark = saved === "continuum-dark";
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "continuum-dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "continuum");
    }
  }, []);

  const toggleLandingTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const themeName = nextDark ? "continuum-dark" : "continuum";
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    document.documentElement.setAttribute("data-theme", themeName);
    try {
      sessionStorage.setItem("landing_theme", themeName);
    } catch {}
  };

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.userCount === "number" && data.userCount > 0) {
          setUserCount(data.userCount);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F3EFEA] dark:bg-[#0C0D0E] text-[#26211F] dark:text-[#F4F5F7] selection:bg-[#D99419]/20 selection:text-[#9E5D48] font-sans antialiased">
      
      {/* Background Architectural Subtle Grid */}
      <div className="pointer-events-none fixed inset-0 z-0 architectural-grid opacity-40" />

      {/* Modern Product Header */}
      <header className="sticky top-0 z-50 border-b border-[#DDD5CB] dark:border-[#25272E] bg-[#F3EFEA]/90 dark:bg-[#0C0D0E]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          
          {/* Logo & Product Name */}
          <a href="/" className="group flex items-center gap-2.5 no-underline">
            <LogoMark size={26} className="text-[#1C1B18] dark:text-[#F4F5F7] transition-transform duration-200 group-hover:scale-105" />
            <span className="font-semibold text-lg tracking-tight text-[#1C1B18] dark:text-[#F4F5F7]">
              Continuum
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium uppercase tracking-wider text-[#6D635C] dark:text-[#9BA1B0]">
            <a href="#architecture" className="transition-colors hover:text-[#9E5D48] no-underline">
              Architecture
            </a>
            <a href="#ai-agent" className="transition-colors hover:text-[#9E5D48] no-underline">
              AI Agent
            </a>
            <button onClick={onLogin} className="transition-colors hover:text-[#9E5D48] bg-transparent border-none p-0 uppercase tracking-wider text-xs font-medium text-[#6D635C] dark:text-[#9BA1B0] cursor-pointer">
              Dashboard
            </button>
            <a href="#self-host" className="transition-colors hover:text-[#9E5D48] no-underline">
              Self-Host
            </a>
            <a href="#pricing" className="transition-colors hover:text-[#9E5D48] no-underline">
              Pricing
            </a>
            <a
              href="https://github.com/fal3n-4ngel/Continuum-Home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-[#9E5D48] no-underline text-[#D99419]"
            >
              <span>★ Star on GitHub</span>
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLandingTheme}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] text-[#6D635C] dark:text-[#9BA1B0] transition-colors hover:border-[#9E5D48] hover:text-[#9E5D48]"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={onLogin}
              disabled={!firebaseAuthReady}
              className="flex items-center gap-2 rounded-sm bg-[#1C1B18] dark:bg-[#F4F5F7] px-4 py-2 text-xs font-semibold text-[#FAF8F5] dark:text-[#0C0D0E] transition-all duration-150 hover:opacity-90 disabled:opacity-50 shadow-xs uppercase tracking-wider font-mono"
            >
              <span>Try Continuum</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section: Clean Architectural Product Hero Matching Reference Layout */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 sm:px-8 flex flex-col items-center justify-center pt-16 pb-12 text-center min-h-screen">
        
        {/* Architectural Tag Badge */}
        <div className="border border-[#DDD5CB] dark:border-[#25272E] px-3.5 py-1 font-mono text-[10.5px] tracking-widest text-[#9E5D48] dark:text-[#E07A5F] uppercase mb-5 bg-[#FAF8F5] dark:bg-[#18191D] rounded-sm shadow-2xs">
          ⌜ SELF-HOSTABLE · OPEN SOURCE · AI-READY ⌟
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[#26211F] dark:text-[#F4F5F7] leading-[1.1] mb-4">
       
          <span className="font-serif italic font-normal text-[#9E5D48] dark:text-[#E07A5F]">
            A dashboard for you. An API for your AI.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-base sm:text-lg text-[#6D635C] dark:text-[#9BA1B0] max-w-2xl mx-auto leading-relaxed">
          A self-hostable system for your daily expenses, investments, media watchlists, and book library &mdash; with an API designed for both humans and AI agents.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <button
            onClick={onLogin}
            disabled={!firebaseAuthReady}
            className="flex items-center gap-2 rounded-sm border border-[#9E5D48] bg-[#9E5D48] px-7 py-3 font-mono text-xs font-semibold tracking-wider text-[#FAF8F5] uppercase transition-all duration-150 hover:bg-[#854A37] shadow-xs disabled:opacity-50"
          >
            <span>Try Continuum &rarr;</span>
          </button>

          <a
            href="https://github.com/fal3n-4ngel/Continuum-Home"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-6 py-3 font-mono text-xs font-semibold tracking-wider text-[#26211F] dark:text-[#F4F5F7] uppercase no-underline transition-all duration-150 hover:border-[#9E5D48] shadow-2xs"
          >
            <span className="text-[#D99419]">★</span>
            <span>Star on GitHub</span>
          </a>
        </div>

        {/* Live Active Nodes Counter */}
        {userCount !== null && (
          <div className="mt-5 flex items-center justify-center gap-2 font-mono text-[11px] text-[#9C9288]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D99419]" />
            <span><strong className="font-semibold text-[#1C1B18] dark:text-[#F4F5F7]">{userCount}</strong> active deployments running worldwide</span>
          </div>
        )}

        {authError && (
          <div className="mt-4 inline-block rounded-sm border border-red-400 bg-red-50 dark:bg-red-950/40 p-2 font-mono text-xs text-red-600">
            {authError}
          </div>
        )}

        {/* Focused Hero Category Badges */}
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-3.5 py-1.5 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] shadow-2xs">
            🤖 AI Endpoints (ChatGPT &amp; Claude)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-3.5 py-1.5 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] shadow-2xs">
            💸 Expense &amp; Subscription Ledger
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-3.5 py-1.5 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] shadow-2xs">
            📈 Investments &amp; Live Quotes
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] px-3.5 py-1.5 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] shadow-2xs">
            🎬 Media &amp; Book Library
          </span>
        </div>

        {/* Architecture Diagram: Direct Component under Hero Matching Reference */}
        <div id="architecture" className="mt-10 w-full">
          <ArchitectureFlowDiagram />
        </div>

      </section>

      {/* Features / Capabilities Showcase (Ecolinear Style with Meaningful Vector Schematics) */}
      <FeaturesShowcase />

      {/* OpenAPI 3.1 & Autonomous AI Agent Showcase (Your data, your AI agent) */}
      <AiAgentShowcase />

      {/* PRICING & PAYMENT SECTION */}
      <section
        id="pricing"
        className="relative z-10 border-t border-b border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5]/80 dark:bg-[#141518]/80 px-6 py-20 text-center"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 inline-block border border-[#DDD5CB] dark:border-[#25272E] px-3 py-0.5 font-mono text-[10px] tracking-widest text-[#9E5D48] uppercase bg-[#FAF8F5] dark:bg-[#18191D]">
            ⌜ 03 // PRICING &amp; PAYMENT ⌟
          </div>
          
          <h2 className="mb-3 text-3xl sm:text-5xl font-bold tracking-tight text-[#9E5D48] dark:text-[#E07A5F]">
            Pick Your Setup.<br />
            <span className="text-[#26211F] dark:text-[#F4F5F7]">
              Transparent Positioning.
            </span>
          </h2>
          
          <p className="mx-auto mb-12 max-w-xl text-sm sm:text-base leading-relaxed text-[#6D635C] dark:text-[#9BA1B0]">
            Zero feature gates on self-hosting. Use the hosted instance for free, self-deploy for full privacy, or support ongoing open-source development.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto items-stretch">
            
            {/* TIER 1: Free Cloud */}
            <div className="relative flex flex-col justify-between rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419]">⌜</span>
              <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419]">⌝</span>
              <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419]">⌞</span>
              <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419]">⌟</span>

              <div>
                <div className="font-mono text-4xl sm:text-5xl font-light text-[#9E5D48]/30 select-none mb-1">
                  01
                </div>
                <p className="text-xl font-bold tracking-tight text-[#9E5D48] dark:text-[#E07A5F]">
                  Free Cloud
                </p>
                <p className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#26211F] dark:text-[#F4F5F7]">
                  $0{" "}
                  <span className="font-mono text-xs font-normal tracking-normal text-[#9C9288]">
                    / forever
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-[#6D635C] dark:text-[#9BA1B0]">
                  Sign in instantly to use the shared hosted instance. Access core tracking modules with zero server setup.
                </p>
                
                <div className="my-5 h-px bg-[#DDD5CB] dark:bg-[#25272E]" />
                
                <ul className="flex flex-col gap-2 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Instant access, zero server setup</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Expense ledger &amp; subscriptions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Watchlists &amp; Book library</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>AES-256 DB Encryption at rest</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Custom GPT &amp; AI Agent API</span>
                  </li>
                </ul>

                <div className="mt-4 font-mono text-[10px] text-[#9C9288] uppercase">
                  REF SPEC: HOSTED-CLOUD-V1
                </div>
              </div>

              <div className="mt-8">
                {authError && (
                  <div className="mb-3 rounded-sm border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 font-mono text-xs text-rose-600">
                    {authError}
                  </div>
                )}
                <button
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#F3EFEA] dark:bg-[#0C0D0E] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#1C1B18] dark:text-[#F4F5F7] transition-all hover:border-[#9E5D48] disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onLogin}
                  disabled={!firebaseAuthReady}
                >
                  Sign in with Google &rarr;
                </button>
              </div>
            </div>

            {/* TIER 2: Self-Hostable (Featured Developer) */}
            <div className="relative flex flex-col justify-between rounded-sm border-2 border-[#9E5D48] dark:border-[#E07A5F] bg-[#FAF8F5] dark:bg-[#18191D] p-7 shadow-md transition-all duration-200 hover:-translate-y-1">
              <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419]">⌜</span>
              <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419]">⌝</span>
              <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419]">⌞</span>
              <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419]">⌟</span>

              <div>
                <div className="font-mono text-4xl sm:text-5xl font-light text-[#9E5D48]/30 select-none mb-1">
                  02
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-bold tracking-tight text-[#9E5D48] dark:text-[#E07A5F]">
                    Self-Hostable
                  </p>
                  <span className="font-mono text-[9px] font-bold text-[#D99419] uppercase">
                    RECOMMENDED
                  </span>
                </div>
                <p className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#26211F] dark:text-[#F4F5F7]">
                  $0{" "}
                  <span className="font-mono text-xs font-normal tracking-normal text-[#9C9288]">
                    / agpl-3.0
                  </span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-[#6D635C] dark:text-[#9BA1B0]">
                  Deploy to Vercel + Firebase in ~5 minutes. 100% free with all features fully unlocked in your private database.
                </p>
                
                <div className="my-5 h-px bg-[#DDD5CB] dark:bg-[#25272E]" />
                
                <ul className="flex flex-col gap-2 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>100% features fully unlocked</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Private Firebase &amp; data sovereignty</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Financial Health Pay-Cycles &amp; AI Chat</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>MIT / AGPL open-source stack</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Zero rate limits or resource sharing</span>
                  </li>
                </ul>

                <div className="mt-4 font-mono text-[10px] text-[#9C9288] uppercase">
                  REF SPEC: AGPL-SOVEREIGN-V1
                </div>
              </div>

              <div className="mt-8">
                <a
                  href="https://github.com/fal3n-4ngel/Continuum-Home#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-[#9E5D48] hover:bg-[#854A37] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#FAF8F5] no-underline transition-all shadow-sm"
                >
                  View Self-Host Guide &rarr;
                </a>
              </div>
            </div>

            {/* TIER 3: Supporter Tier */}
            <div className="relative flex flex-col justify-between rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
              <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419]">⌜</span>
              <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419]">⌝</span>
              <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419]">⌞</span>
              <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419]">⌟</span>

              <div>
                <div className="font-mono text-4xl sm:text-5xl font-light text-[#9E5D48]/30 select-none mb-1">
                  03
                </div>
                <p className="text-xl font-bold tracking-tight text-[#9E5D48] dark:text-[#E07A5F]">
                  Supporter Tier
                </p>
                <p className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#26211F] dark:text-[#F4F5F7]">
                  $1{" "}
                  <span className="font-mono text-xs font-normal tracking-normal text-[#9C9288]">
                    / month
                  </span>
                </p>
                <p className="font-mono text-[10.5px] text-[#9E5D48] mt-0.5">
                  or $25 lifetime support payment
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-[#6D635C] dark:text-[#9BA1B0]">
                  Support development of Continuum while unlocking hosted Financial Health tools and early feature previews.
                </p>
                
                <div className="my-5 h-px bg-[#DDD5CB] dark:bg-[#25272E]" />
                
                <ul className="flex flex-col gap-2 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7]">
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Everything in Free Cloud</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Financial Health Tab (Pay-cycles)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Kiroku AI Assistant integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Supporter profile badge &amp; highlight</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#D99419]">&bull;</span>
                    <span>Direct feedback &amp; feature priority</span>
                  </li>
                </ul>

                <div className="mt-4 font-mono text-[10px] text-[#9C9288] uppercase">
                  REF SPEC: DEV-SUPPORTER-V1
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={onLogin}
                  disabled={!firebaseAuthReady}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#F3EFEA] dark:bg-[#0C0D0E] px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#1C1B18] dark:text-[#F4F5F7] transition-all hover:border-[#9E5D48] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Become a Supporter &rarr;
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Deployment Section */}
      <section id="self-host" className="relative z-10 border-t border-[#DDD5CB] dark:border-[#25272E] bg-[#F3EFEA] dark:bg-[#0C0D0E] py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-block border border-[#DDD5CB] dark:border-[#25272E] px-3 py-0.5 font-mono text-[10px] tracking-widest text-[#9E5D48] uppercase mb-4 bg-[#FAF8F5] dark:bg-[#18191D]">
              ⌜ 04 // DEPLOYMENT GUIDE ⌟
            </div>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1C1B18] dark:text-[#F4F5F7]">
              Zero Coding Required. 5-Minute Deploy.
            </h2>
            <p className="mt-2 text-sm text-[#6D635C] dark:text-[#9BA1B0]">
              Run your personal instance forever on Vercel and Firebase free tiers with zero monthly infrastructure bills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-6 flex flex-col justify-between">
              <div>
                <div className="font-mono text-3xl font-light text-[#9E5D48] mb-2">01</div>
                <div className="font-mono text-sm font-semibold uppercase text-[#1C1B18] dark:text-[#F4F5F7]">Fork Repository</div>
                <p className="mt-2 text-xs text-[#6D635C] dark:text-[#9BA1B0] leading-relaxed">
                  Fork the open-source repository on GitHub to your account to retain full code sovereignty and automated release updates.
                </p>
              </div>
              <div className="mt-6 border-t border-dashed border-[#DDD5CB] dark:border-[#25272E] pt-3 font-mono text-[10px] text-[#9C9288]">
                GITHUB.COM/FAL3N-4NGEL/CONTINUUM
              </div>
            </div>

            {/* Step 2 */}
            <div className="border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-6 flex flex-col justify-between">
              <div>
                <div className="font-mono text-3xl font-light text-[#D99419] mb-2">02</div>
                <div className="font-mono text-sm font-semibold uppercase text-[#1C1B18] dark:text-[#F4F5F7]">Create Firebase Project</div>
                <p className="mt-2 text-xs text-[#6D635C] dark:text-[#9BA1B0] leading-relaxed">
                  Create a free Google Cloud / Firebase project with Google Auth and Cloud Firestore enabled. Your data never touches shared servers.
                </p>
              </div>
              <div className="mt-6 border-t border-dashed border-[#DDD5CB] dark:border-[#25272E] pt-3 font-mono text-[10px] text-[#9C9288]">
                FREE SPARK TIER (100% SUFFICIENT)
              </div>
            </div>

            {/* Step 3 */}
            <div className="border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-6 flex flex-col justify-between">
              <div>
                <div className="font-mono text-3xl font-light text-[#9E5D48] mb-2">03</div>
                <div className="font-mono text-sm font-semibold uppercase text-[#1C1B18] dark:text-[#F4F5F7]">Deploy to Vercel</div>
                <p className="mt-2 text-xs text-[#6D635C] dark:text-[#9BA1B0] leading-relaxed">
                  Import your repository on Vercel, paste your Firebase environment variables, generate an AES key, and go live on your custom domain.
                </p>
              </div>
              <div className="mt-6 border-t border-dashed border-[#DDD5CB] dark:border-[#25272E] pt-3 font-mono text-[10px] text-[#9C9288]">
                VERCEL HOBBY TIER (ZERO COST)
              </div>
            </div>

          </div>

          <div className="mt-10 text-center">
            <a
              href="https://github.com/fal3n-4ngel/Continuum-Home#getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-[#9E5D48] bg-[#9E5D48] px-6 py-3 font-mono text-xs font-semibold tracking-wider text-[#FAF8F5] uppercase no-underline transition-all hover:bg-[#854A37]"
            >
              <span>VIEW FULL DEPLOYMENT MANUAL</span>
              <ExternalLink size={12} />
            </a>
          </div>

        </div>
      </section>

      {/* Technical FAQ Section */}
      <section id="faq" className="relative z-10 border-t border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5]/60 dark:bg-[#141518]/60 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-block border border-[#DDD5CB] dark:border-[#25272E] px-3 py-0.5 font-mono text-[10px] tracking-widest text-[#9E5D48] uppercase mb-4 bg-[#FAF8F5] dark:bg-[#18191D]">
              ⌜ 05 // FREQUENTLY ASKED QUESTIONS ⌟
            </div>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1C1B18] dark:text-[#F4F5F7]">
              Frequently Clarified Inquiries
            </h2>
          </div>

          <div className="divide-y divide-[#DDD5CB] dark:divide-[#25272E] border-y border-[#DDD5CB] dark:border-[#25272E]">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left font-mono text-sm font-semibold tracking-tight text-[#1C1B18] dark:text-[#F4F5F7] hover:text-[#9E5D48] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-[10px] text-[#9E5D48]">{item.ref}</span>
                      <span>{item.question}</span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-[#9C9288] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#9E5D48]" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-3 pl-8 text-xs leading-relaxed text-[#6D635C] dark:text-[#9BA1B0] animate-[fadeIn_0.2s_ease-out]">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Modern Product Footer */}
      <footer className="relative z-10 border-t border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#141518] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-[#DDD5CB] dark:border-[#25272E]">
            
            <div className="flex items-center gap-3">
              <LogoMark size={24} className="text-[#1C1B18] dark:text-[#F4F5F7]" />
              <div className="flex flex-col">
                <span className="font-semibold text-base tracking-tight text-[#1C1B18] dark:text-[#F4F5F7]">
                  Continuum
                </span>
                <span className="font-mono text-[10px] tracking-wider text-[#9C9288] uppercase">
                  Personal Life Operating System · Open Source MIT
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-medium uppercase text-[#6D635C] dark:text-[#9BA1B0]">
              <a href="#architecture" className="hover:text-[#1C1B18] dark:hover:text-[#F4F5F7] no-underline">Architecture</a>
              <a href="#capabilities" className="hover:text-[#1C1B18] dark:hover:text-[#F4F5F7] no-underline">Features</a>
              <a href="#pricing" className="hover:text-[#1C1B18] dark:hover:text-[#F4F5F7] no-underline">Pricing</a>
              <a href="#self-host" className="hover:text-[#1C1B18] dark:hover:text-[#F4F5F7] no-underline">Deploy</a>
              <a href="https://github.com/fal3n-4ngel/Continuum-Home" target="_blank" rel="noopener noreferrer" className="hover:text-[#1C1B18] dark:hover:text-[#F4F5F7] no-underline">GitHub</a>
              <a href="/privacy" className="hover:text-[#1C1B18] dark:hover:text-[#F4F5F7] no-underline">Privacy</a>
            </div>

          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10.5px] text-[#9C9288] uppercase">
            <div>
              Engineered by <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer" className="text-[#1C1B18] dark:text-[#F4F5F7] font-semibold hover:underline">{AUTHOR.name}</a> (@{AUTHOR.githubHandle})
            </div>
            <div>
              Continuum Home &bull; MIT Licensed
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
