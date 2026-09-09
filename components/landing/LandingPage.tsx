"use client";

import React, { useEffect, useState } from "react";
import { AUTHOR, SITE_NAME } from "@/lib/utils";
import { LogoMark as BentoLogo } from "@/components/Logo";

interface LandingPageProps {
  onLogin: () => void;
  authError?: string;
  firebaseAuthReady: boolean;
}

const CLOCK_ZONES: { label: string; region: string; zone: string }[] = [
  {
    label: "Local",
    region: "Your device",
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  { label: "IST", region: "India", zone: "Asia/Kolkata" },
  { label: "UTC", region: "Universal", zone: "UTC" },
];

function useTicker() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const id = setInterval(update, 1000);
    const kick = setTimeout(update, 0);
    return () => {
      clearInterval(id);
      clearTimeout(kick);
    };
  }, []);
  return now;
}

const GPT_EXAMPLES: { user: string; replyMain: string; replyDetail: string }[] =
  [
    {
      user: "spent ₹450 on lunch today",
      replyMain: "✅ Logged ₹450 to Food",
      replyDetail: "“Lunch today” · just now",
    },
    {
      user: "add dune part two to my watchlist",
      replyMain: "✅ Added to Plan to Watch",
      replyDetail: "Dune: Part Two · movie",
    },
    {
      user: "how much did I spend this week?",
      replyMain: "₹3,240 spent this week",
      replyDetail: "Mostly Food (₹1,850) & Transport (₹640)",
    },
    {
      user: "what is my current portfolio value?",
      replyMain: "₹18,42,500 total assets",
      replyDetail: "Equities + Mutual Funds + FDs",
    },
  ];

function ChatDemo() {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState<"user" | "typing" | "reply">("user");

  useEffect(() => {
    const delay = phase === "user" ? 900 : phase === "typing" ? 1100 : 2400;
    const timeout = setTimeout(() => {
      if (phase === "user") setPhase("typing");
      else if (phase === "typing") setPhase("reply");
      else {
        setExampleIndex((i) => (i + 1) % GPT_EXAMPLES.length);
        setPhase("user");
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [phase]);

  const example = GPT_EXAMPLES[exampleIndex];

  return (
    <div className="flex h-full w-full flex-col justify-end gap-2.5">
      <div
        className="max-w-[85%] animate-[bubbleIn_0.28s_cubic-bezier(0.16,1,0.3,1)_both] self-end rounded-[15px] rounded-br-[4px] bg-[#1c1b18] px-[15px] py-[11px] text-[12.5px] leading-[1.5] text-white shadow-sm"
        key={`u-${exampleIndex}`}
      >
        {example.user}
      </div>
      {phase === "typing" && (
        <div className="flex animate-[bubbleIn_0.28s_cubic-bezier(0.16,1,0.3,1)_both] items-center gap-1 self-start rounded-[15px] rounded-bl-[4px] border border-border-subtle bg-bg-secondary px-[15px] py-[13px] shadow-sm">
          <span className="h-[5px] w-[5px] animate-[chatDotBounce_1s_infinite_ease-in-out_both] rounded-full bg-text-muted" />
          <span className="h-[5px] w-[5px] animate-[chatDotBounce_1s_infinite_ease-in-out_both] rounded-full bg-text-muted [animation-delay:0.15s]" />
          <span className="h-[5px] w-[5px] animate-[chatDotBounce_1s_infinite_ease-in-out_both] rounded-full bg-text-muted [animation-delay:0.3s]" />
        </div>
      )}
      {phase === "reply" && (
        <div
          className="max-w-[85%] animate-[bubbleIn_0.28s_cubic-bezier(0.16,1,0.3,1)_both] self-start rounded-[15px] rounded-bl-[4px] border border-[#bbf7d0] dark:border-emerald-800/40 bg-[#f0fdf4] dark:bg-emerald-950/40 px-[15px] py-[11px] text-[12.5px] leading-[1.5] text-[#14532d] dark:text-emerald-300 shadow-sm"
          key={`a-${exampleIndex}`}
        >
          <div className="font-bold flex items-center gap-1.5">{example.replyMain}</div>
          <div className="mt-[3px] text-[11px] text-[#15803d] dark:text-emerald-400 opacity-85">
            {example.replyDetail}
          </div>
        </div>
      )}
    </div>
  );
}

function LiveClockStrip() {
  const now = useTicker();
  return (
    <div className="mt-1 flex max-[900px]:flex-wrap max-[900px]:gap-y-4">
      {CLOCK_ZONES.map((z, idx) => (
        <div
          className={`flex flex-col gap-[3px] border-l border-border-subtle px-7 first:border-l-0 first:pl-0 max-[900px]:flex-[1_1_40%] max-[900px]:border-l-0 max-[900px]:pr-5 max-[900px]:pl-0 ${idx === 1 ? "max-[900px]:!border-l max-[900px]:!border-border-subtle max-[900px]:!pl-5" : ""}`}
          key={z.zone}
        >
          <span className="font-mono text-[17px] font-semibold tracking-[0.5px] text-text-primary [font-variant-numeric:tabular-nums]">
            {now
              ? new Intl.DateTimeFormat("en-GB", {
                  timeZone: z.zone,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                }).format(now)
              : "--:--:--"}
          </span>
          <span className="text-xs font-semibold text-text-secondary">
            {z.label}
          </span>
          <span className="font-mono text-[9.5px] tracking-[0.8px] text-text-muted uppercase">
            {z.region}
          </span>
        </div>
      ))}
    </div>
  );
}

interface DiagramPoint {
  x: number;
  y: number;
}

interface DiagramCoords {
  c1_1_r: DiagramPoint;
  c1_2_r: DiagramPoint;
  c2_1_l: DiagramPoint;
  c2_2_l: DiagramPoint;
  c2_3_l: DiagramPoint;
  c2_1_r: DiagramPoint;
  c2_2_r: DiagramPoint;
  c2_3_r: DiagramPoint;
  hub_l: DiagramPoint;
  hub_r: DiagramPoint;
  c4_1_l: DiagramPoint;
  c4_2_l: DiagramPoint;
}

const HERO_REVEAL = "animate-[heroFadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_both]";
const HERO_BADGE =
  "mb-6 inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-[1.5px] text-text-secondary uppercase shadow-xs";
const HERO_TITLE =
  "mb-5 text-[56px] leading-[1.05] font-bold tracking-[-2.4px] text-text-primary max-[900px]:text-[38px] max-[900px]:tracking-[-1.6px] max-[480px]:text-[30px] max-[480px]:tracking-[-1.2px]";
const SERIF_ITALIC_STYLE: React.CSSProperties = {
  fontFamily: "'Playfair Display', Georgia, serif",
};
const HERO_CTA_PRIMARY =
  "flex cursor-pointer items-center gap-2 rounded-full border-none bg-text-primary px-7 py-[13px] text-sm font-semibold text-bg-card no-underline transition-all duration-200 hover:-translate-y-px hover:opacity-90 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";
const STEP_DESC = "text-[13px] leading-[1.55] text-text-secondary";

const DIAGRAM_NODE =
  "flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-card px-3.5 py-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover";
const NODE_ICON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px] shadow-xs";
const FEATURE_NUM =
  "block font-mono text-[10.5px] font-bold tracking-[1px] text-text-muted uppercase";
const BROWSER_DOT = "h-2.5 w-2.5 rounded-full";
const FOOTER_LINK_ITEM =
  "inline-flex cursor-pointer items-center gap-1 text-[13px] text-text-secondary no-underline transition-colors duration-150 hover:text-text-primary";
const FOOTER_COL_LABEL =
  "mb-4 block font-mono text-[10px] font-semibold tracking-wider text-text-muted uppercase";
const FI_YES = "shrink-0 text-[13px] text-[#22c55e]";

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Is Continuum free?",
    answer:
      "Yes. The self-hostable version is free forever — deploy your own copy on Vercel + Firebase's free tiers with zero feature gates. The cloud-hosted standard version is also free to use.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "In your private Firebase Firestore database (if self hosted), never a shared database. Sensitive fields like expense amounts and portfolio notes are encrypted at rest with AES-256-GCM.",
  },
  {
    question: "How does the AI agent & ChatGPT integration work?",
    answer:
      "Every route in Continuum exposes a standard OpenAPI 3.1 schema (/api/openapi.json). You can plug this schema directly into ChatGPT Custom GPT Actions, Claude, Gemini function calling, or MCP tool servers to log expenses, check balances, or update watchlists in plain English.",
  },
  {
    question: "Do I need coding experience to self-host?",
    answer:
      "No coding is required. Fork the GitHub repo, click 'Deploy to Vercel', create a free Firebase project, and paste your API keys. Setup takes approximately 5 minutes.",
  },
  {
    question: "Can I import my existing data?",
    answer:
      "Yes! CSV import/export is supported for expenses and subscriptions, and full watchlist sync is available for AniList, Trakt, and Letterboxd RSS/CSV exports.",
  },
];

export default function LandingPage({
  onLogin,
  authError,
  firebaseAuthReady,
}: LandingPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [coords, setCoords] = useState<DiagramCoords | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [activeDashTab, setActiveDashTab] = useState<"finance" | "media" | "investments" | "books">("finance");

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

  useEffect(() => {
    const updateCoords = () => {
      const container = document.getElementById("dg-container");
      if (!container) return;
      const cRect = container.getBoundingClientRect();

      const getR = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.right - cRect.left,
          y: r.top + r.height / 2 - cRect.top,
        };
      };

      const getL = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return {
          x: r.left - cRect.left,
          y: r.top + r.height / 2 - cRect.top,
        };
      };

      const c1_1_r = getR("dg-c1-n1");
      const c1_2_r = getR("dg-c1-n2");
      const c2_1_l = getL("dg-c2-n1");
      const c2_2_l = getL("dg-c2-n2");
      const c2_3_l = getL("dg-c2-n3");

      const c2_1_r = getR("dg-c2-n1");
      const c2_2_r = getR("dg-c2-n2");
      const c2_3_r = getR("dg-c2-n3");
      const hub_l = getL("dg-hub");
      const hub_r = getR("dg-hub");

      const c4_1_l = getL("dg-c4-n1");
      const c4_2_l = getL("dg-c4-n2");

      setCoords({
        c1_1_r,
        c1_2_r,
        c2_1_l,
        c2_2_l,
        c2_3_l,
        c2_1_r,
        c2_2_r,
        c2_3_r,
        hub_l,
        hub_r,
        c4_1_l,
        c4_2_l,
      });
    };

    const timer = setTimeout(updateCoords, 250);
    window.addEventListener("resize", updateCoords);

    const container = document.getElementById("dg-container");
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateCoords);
      observer.observe(container);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateCoords);
      if (observer) observer.disconnect();
    };
  }, []);

  const drawCurve = (p1: DiagramPoint, p2: DiagramPoint) => {
    const midX = (p1.x + p2.x) / 2;
    return `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-primary font-body text-text-primary">
      <style>{`
        @keyframes spin-clockwise { to { transform: rotate(360deg); } }
        @keyframes heroFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes drawerSlideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bubbleIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes chatDotBounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-3px); opacity: 1; } }
        @keyframes flowDash { to { stroke-dashoffset: -20; } }
      `}</style>

      <header className="sticky top-0 z-[1000] mx-auto flex max-w-[1300px] items-center justify-between border-b border-border-subtle/60 bg-bg-primary/92 px-20 py-4.5 backdrop-blur-[10px] max-[900px]:px-6 max-[900px]:py-3.5">
        <a
          href="#"
          className="flex items-center gap-[9px] text-[18px] font-medium tracking-tight text-text-primary no-underline"
        >
          <BentoLogo size={22} color="var(--text-primary)" />
          <span>{SITE_NAME}</span>
        </a>
        <nav className="flex items-center gap-7 max-[900px]:hidden">
          <a
            href="#how-it-works"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            Architecture
          </a>
          <a
            href="#ai"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            AI Agent
          </a>
          <a
            href="#dashboard"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            Dashboard
          </a>
          <a
            href="#setup"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            Self-Host
          </a>
          <a
            href="#pricing"
            className="text-[13px] font-medium text-[#6e6c64] no-underline transition-colors duration-200 hover:text-[#1c1b18]"
          >
            Pricing
          </a>
          <a
            href="https://github.com/fal3n-4ngel/Continuum-Home"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-[#d6d3c9] bg-[#f4f1ea] px-3.5 py-1 text-xs font-semibold text-[#1c1b18] no-underline transition-all duration-200 hover:border-[#1c1b18] hover:bg-white"
          >
            <span>⭐️ Star on GitHub</span>
          </a>
        </nav>
        <div className="flex items-center gap-2.5">
          <button
            className="hidden md:flex cursor-pointer items-center gap-2 rounded-full border-none bg-[#1c1b18] px-[22px] py-2.5 text-[13px] font-semibold text-white transition-[transform,background-color] duration-200 hover:-translate-y-px hover:bg-[#31302b] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55"
            onClick={onLogin}
            disabled={!firebaseAuthReady}
          >
            <span>Try Continuum</span>
            <span>→</span>
          </button>
          <button
            className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#e5e3db] bg-transparent text-[#1c1b18] max-[900px]:flex"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {mobileNavOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
        <nav
          className={`hidden ${mobileNavOpen ? "max-[900px]:flex" : ""} max-[900px]:animate-[drawerSlideDown_0.2s_ease-out_both] max-[900px]:fixed max-[900px]:top-[65px] max-[900px]:right-4 max-[900px]:left-4 max-[900px]:z-[999] max-[900px]:flex-col max-[900px]:rounded-2xl max-[900px]:border max-[900px]:border-[#e5e3db] max-[900px]:bg-white max-[900px]:p-2.5 max-[900px]:shadow-[0_16px_40px_-12px_rgba(28,27,24,0.18)]`}
        >
          <a
            href="#how-it-works"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            Architecture
          </a>
          <a
            href="#ai"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            AI Agent Integration
          </a>
          <a
            href="#dashboard"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            Dashboard UI
          </a>
          <a
            href="#setup"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            Self-Host
          </a>
          <a
            href="#pricing"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            Pricing
          </a>
          <a
            href="https://github.com/fal3n-4ngel/Continuum-Home"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-[9px] px-3.5 py-[13px] text-sm font-medium text-[#6e6c64] no-underline hover:bg-[#f4f3ec]"
            onClick={() => setMobileNavOpen(false)}
          >
            ⭐️ Star on GitHub ↗
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 pt-[70px] pb-[30px] text-center max-[480px]:px-4 max-[480px]:pt-[50px] max-[480px]:pb-6">
        <div className={`flex flex-col items-center gap-3 ${HERO_REVEAL} [animation-delay:0.02s]`}>
          <span className={HERO_BADGE}>
            <BentoLogo size={12} color="#6e6c64" />
            SELF-HOSTABLE · OPEN SOURCE · AI-READY
          </span>
        </div>

        <h1 className={`${HERO_TITLE} ${HERO_REVEAL} [animation-delay:0.08s]`}>
          One place. Everything you track.
          <br />
          <span className="font-normal italic text-[#6e6c64]" style={SERIF_ITALIC_STYLE}>
            A dashboard for you. An API for your AI.
          </span>
        </h1>
        <p
          className={`mx-auto mb-6 max-w-[620px] text-base leading-[1.65] text-[#6e6c64] ${HERO_REVEAL} [animation-delay:0.14s]`}
        >
          A self-hostable system for your daily expenses, investments, media watchlists, and book library — with an API designed for both humans and AI agents.
        </p>
        <div
          className={`flex flex-wrap justify-center gap-3.5 ${HERO_REVEAL} [animation-delay:0.2s]`}
        >
          <button
            className={HERO_CTA_PRIMARY}
            onClick={onLogin}
            disabled={!firebaseAuthReady}
          >
            Try Continuum →
          </button>
          <a
            href="https://github.com/fal3n-4ngel/Continuum-Home"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border-[1.5px] border-[#d1cfc7] bg-white px-7 py-[13px] text-sm font-semibold text-[#1c1b18] no-underline transition-all duration-200 hover:border-[#1c1b18] hover:shadow-xs"
          >
            <span>⭐️ Star on GitHub</span>
          </a>
        </div>
        {userCount !== null && (
          <p
            className={`mt-4 text-[12.5px] text-[#9c9a92] ${HERO_REVEAL} [animation-delay:0.23s]`}
          >
            <strong className="font-semibold text-[#6e6c64]">{userCount}</strong>{" "}
            {userCount === 1 ? "person is" : "people are"} actively using Continuum
          </p>
        )}

        <div
          className={`mt-7 flex flex-wrap justify-center gap-2.5 ${HERO_REVEAL} [animation-delay:0.26s]`}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-4 py-1.5 text-[12px] font-semibold text-[#1d4ed8]">
            🤖 AI Endpoints (ChatGPT &amp; Claude)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-4 py-1.5 text-[12px] font-medium text-text-primary">
            💸 Expense &amp; Subscription Ledger
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-4 py-1.5 text-[12px] font-medium text-text-primary">
            📈 Investments &amp; Live Quotes
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-4 py-1.5 text-[12px] font-medium text-text-primary">
            🎬 Media &amp; Book Library
          </span>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-[1150px] px-6 pt-2 pb-[60px] text-center max-[480px]:px-4 max-[480px]:pb-10"
      >
        <div
          className="max-[768px]:px-2 max-[768px]:py-[10px]"
          id="dg-container"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-card p-8 shadow-subtle [background-image:radial-gradient(var(--border-subtle)_1px,transparent_1px)] [background-size:24px_24px]">

            <div className="mb-6 flex items-center justify-between border-b border-border-subtle pb-4 max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-2">
              <div className="flex items-center gap-2 text-left">
                <span className="flex h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="font-mono text-[11px] font-bold tracking-wider text-text-secondary uppercase">
                  SYSTEM ARCHITECTURE FLOW
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                <span>REST / OpenAPI 3.1</span>
                <span>·</span>
                <span className="rounded bg-bg-secondary px-2 py-0.5 font-bold text-text-primary">AES-256 ENCRYPTED</span>
              </div>
            </div>

            <div className="block max-[768px]:hidden">
              <div className="mb-4 grid grid-cols-[230px_240px_140px_240px] justify-between text-left border-b border-border-subtle pb-2">
                <span className={FEATURE_NUM}>1. INCOMING DATA</span>
                <span className={FEATURE_NUM}>2. CONTINUUM ENGINE</span>
                <span className={`${FEATURE_NUM} text-center`}>3. API HUB</span>
                <span className={FEATURE_NUM}>4. CLIENT INTERFACES</span>
              </div>

              {coords && (
                <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full max-[900px]:hidden">
                  <path
                    d={drawCurve(coords.c1_1_r, coords.c2_1_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={drawCurve(coords.c1_1_r, coords.c2_2_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={drawCurve(coords.c1_2_r, coords.c2_3_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />

                  <path
                    d={drawCurve(coords.c2_1_r, coords.hub_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={drawCurve(coords.c2_2_r, coords.hub_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={drawCurve(coords.c2_3_r, coords.hub_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />

                  <path
                    d={drawCurve(coords.hub_r, coords.c4_1_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                  <path
                    d={drawCurve(coords.hub_r, coords.c4_2_l)}
                    stroke="#3b82f6"
                    strokeWidth="1.75"
                    strokeDasharray="5 5"
                    fill="none"
                    className="animate-[flowDash_1.2s_linear_infinite]"
                  />
                </svg>
              )}

              <div className="relative z-[2] grid grid-cols-[230px_240px_140px_240px] justify-between items-center h-[290px] text-left">
                <div className="flex flex-col justify-around h-full py-2">
                  <div className={DIAGRAM_NODE} id="dg-c1-n1">
                    <div className={`${NODE_ICON} bg-[#ede9fe]`}>☁️</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-text-primary whitespace-nowrap">External Sync</span>
                        <span className="shrink-0 rounded bg-[#f3e8ff] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#6b21a8]">API</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#6e6c64]">Trakt &amp; AniList APIs</div>
                    </div>
                  </div>

                  <div className={DIAGRAM_NODE} id="dg-c1-n2">
                    <div className={`${NODE_ICON} bg-[#fef9c3]`}>✍️</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-text-primary whitespace-nowrap">Local Entries</span>
                        <span className="shrink-0 rounded bg-[#fef08a] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#854d0e]">USER</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#6e6c64]">Expenses, logs &amp; notes</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between h-full py-1">
                  <div className={DIAGRAM_NODE} id="dg-c2-n1">
                    <div className={`${NODE_ICON} bg-[#e39282]/20`}>📊</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-text-primary whitespace-nowrap">Expense Analytics</span>
                        <span className="shrink-0 rounded bg-[#fee2e2] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#991b1b]">AES-256</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#6e6c64]">Salary cycles &amp; Encryption</div>
                    </div>
                  </div>

                  <div className={DIAGRAM_NODE} id="dg-c2-n2">
                    <div className={`${NODE_ICON} bg-[#dbeafe]`}>🎬</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-text-primary whitespace-nowrap">Media Sync Engine</span>
                        <span className="shrink-0 rounded bg-[#dbeafe] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#1e40af]">OAUTH</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#6e6c64]">Trakt &amp; AniList updates</div>
                    </div>
                  </div>

                  <div className={DIAGRAM_NODE} id="dg-c2-n3">
                    <div className={`${NODE_ICON} bg-[#f0fdf4]`}>📚</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-text-primary whitespace-nowrap">Reading Library</span>
                        <span className="shrink-0 rounded bg-[#dcfce7] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#15803d]">CATALOG</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#6e6c64]">OpenLibrary cataloging</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center h-full">
                  <div
                    className="relative flex h-[86px] w-[86px] flex-col items-center justify-center gap-[3px] rounded-[22px] bg-[#1c1b18] text-white shadow-[0_10px_30px_rgba(28,27,24,0.22)]"
                    id="dg-hub"
                  >
                    <div className="absolute -inset-2 animate-[spin-clockwise_25s_linear_infinite] rounded-[26px] border-[1.5px] border-dashed border-[rgba(28,27,24,0.25)]" />
                    <BentoLogo size={24} color="#ffffff" />
                    <span className="font-mono text-[8.5px] font-bold tracking-[1px] text-white uppercase">
                      HUB CORE
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-around h-full py-2">
                  <div className={DIAGRAM_NODE} id="dg-c4-n1">
                    <div className={`${NODE_ICON} bg-[#d1b89a]/30`}>📱</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-text-primary whitespace-nowrap">Dashboard Canvas</span>
                        <span className="shrink-0 rounded bg-[#f4f3ec] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#6e6c64]">WEB UI</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#6e6c64]">For Human Users</div>
                    </div>
                  </div>

                  <div
                    className={`${DIAGRAM_NODE} border-[1.5px] border-[#3b82f6] shadow-[0_4px_14px_rgba(59,130,246,0.12)]`}
                    id="dg-c4-n2"
                  >
                    <div className={`${NODE_ICON} bg-[#3b82f6] text-white shadow-xs`}>
                      🤖
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-text-primary whitespace-nowrap">OpenAPI Endpoints</span>
                        <span className="shrink-0 rounded bg-[#eff6ff] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#1d4ed8]">AI READY</span>
                      </div>
                      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#6e6c64]">For ChatGPT &amp; AI Agents</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-[2] hidden max-[768px]:flex max-[768px]:flex-col max-[768px]:items-center max-[768px]:gap-4">
              <div className="flex w-full flex-col items-center gap-2">
                <span className={FEATURE_NUM}>1. INCOMING DATA</span>
                <div className="flex w-full gap-2 [&>*]:min-w-0 [&>*]:flex-1">
                  <div className={DIAGRAM_NODE}>
                    <span className="text-[11px] font-bold text-[#1c1b18]">☁️ APIs</span>
                  </div>
                  <div className={DIAGRAM_NODE}>
                    <span className="text-[11px] font-bold text-[#1c1b18]">✍️ Local</span>
                  </div>
                </div>
              </div>
              <div className="h-5 w-0.5 [background:repeating-linear-gradient(to_bottom,#c4c2ba,#c4c2ba_3px,transparent_3px,transparent_6px)]" />
              <div className="flex w-full flex-col items-center gap-2">
                <span className={FEATURE_NUM}>2. CONTINUUM ENGINE</span>
                <div className="relative flex h-[76px] w-[76px] flex-col items-center justify-center rounded-[20px] bg-[#1c1b18] text-white shadow-md">
                  <BentoLogo size={22} color="#ffffff" />
                  <span className="font-mono text-[8px] font-bold uppercase tracking-wider">HUB CORE</span>
                </div>
              </div>
              <div className="h-5 w-0.5 [background:repeating-linear-gradient(to_bottom,#c4c2ba,#c4c2ba_3px,transparent_3px,transparent_6px)]" />
              <div className="flex w-full flex-col items-center gap-2">
                <span className={FEATURE_NUM}>4. CLIENT INTERFACES</span>
                <div className="flex w-full gap-2 [&>*]:min-w-0 [&>*]:flex-1">
                  <div className={DIAGRAM_NODE}>
                    <span className="text-[11px] font-bold text-[#1c1b18]">📱 Web UI</span>
                  </div>
                  <div className={`${DIAGRAM_NODE} border border-[#3b82f6]`}>
                    <span className="text-[11px] font-bold text-[#1d4ed8]">🤖 AI Endpoints</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section
        id="ai"
        className="border-t border-b border-border-subtle bg-bg-secondary px-6 py-[80px]"
      >
        <div className="mx-auto grid max-w-[1100px] grid-cols-[1.1fr_1fr] items-center gap-[50px] max-[900px]:grid-cols-1 max-[900px]:gap-10">
          <div>
            <span className={`${HERO_BADGE} mb-5 bg-bg-card`}>
              🤖 OpenAPI 3.1 &amp; AI Agents
            </span>
            <h2 className={`${HERO_TITLE} mb-4 text-left text-[38px] max-[480px]:text-[28px]`}>

              <span className="font-normal italic text-text-secondary" style={SERIF_ITALIC_STYLE}>
                Your data, your AI agent.
              </span>
            </h2>
            <p className={`${STEP_DESC} mb-6 max-w-[460px] text-sm`}>
              Every API route in Continuum exposes a clean, standard OpenAPI 3.1 specification. Plug the schema directly into custom ChatGPT Actions, Claude, Gemini function calling, or MCP tool servers to interact with your data in plain English.
            </p>

            <ul className="mb-7 flex list-none flex-col gap-3 p-0">
              <li className="flex items-start gap-3 text-sm leading-[1.5] text-text-primary">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[11px] text-white">
                  ✓
                </span>
                Works natively with custom ChatGPT Actions (Custom GPTs)
              </li>
              <li className="flex items-start gap-3 text-sm leading-[1.5] text-text-primary">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[11px] text-white">
                  ✓
                </span>
                Log expenses, add movies to watchlists, or ask for portfolio totals via natural language
              </li>
              <li className="flex items-start gap-3 text-sm leading-[1.5] text-text-primary">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[11px] text-white">
                  ✓
                </span>
                Ready for agent frameworks (Dify, Flowise, LangChain, MCP sidecars)
              </li>
            </ul>
            <a href="/assistant" className={`${HERO_CTA_PRIMARY} inline-flex`}>
              View Assistant Setup Guide
              <span>→</span>
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-subtle">
            <div className="flex h-9 items-center justify-between border-b border-border-subtle bg-bg-primary/50 px-4">
              <div className="flex items-center gap-1.5">
                <div className={`${BROWSER_DOT} bg-[#ff5f56]`} />
                <div className={`${BROWSER_DOT} bg-[#ffbd2e]`} />
                <div className={`${BROWSER_DOT} bg-[#27c93f]`} />
              </div>
              <span className="font-mono text-[10.5px] font-semibold tracking-wider text-text-muted uppercase">
                ChatGPT · Continuum Action API
              </span>
              <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-text-secondary">
                v1.2
              </span>
            </div>
            <div className="flex h-[310px] items-end gap-3 bg-bg-card p-5">
              <ChatDemo />
            </div>
          </div>
        </div>
      </section>

      <section
        id="dashboard"
        className="mx-auto max-w-[1100px] px-6 py-[80px] text-center"
      >
        <span className={HERO_BADGE}>Unified Workspace</span>
        <h2 className={`${HERO_TITLE} mb-3 text-[42px] max-[480px]:text-[30px]`}>
          One dashboard.
          <br />
          <span className="font-normal italic text-[#6e6c64]" style={SERIF_ITALIC_STYLE}>
            Everything connected.
          </span>
        </h2>
        <p className="mx-auto mb-10 max-w-[580px] text-base leading-[1.6] text-[#6e6c64]">
          A clean editorial interface designed for daily use. Track custom salary cycles, anime &amp; movie watchlists, book reading progress, and stock quotes without app fatigue.
        </p>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveDashTab("finance")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeDashTab === "finance"
                ? "bg-[#1c1b18] text-white shadow-xs"
                : "border border-[#e5e3db] bg-white text-[#6e6c64] hover:border-[#1c1b18]"
            }`}
          >
            💸 Finance &amp; Salary Cycles
          </button>
          <button
            onClick={() => setActiveDashTab("media")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeDashTab === "media"
                ? "bg-[#1c1b18] text-white shadow-xs"
                : "border border-[#e5e3db] bg-white text-[#6e6c64] hover:border-[#1c1b18]"
            }`}
          >
            🎬 Media Watchlist &amp; Sync
          </button>
          <button
            onClick={() => setActiveDashTab("investments")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeDashTab === "investments"
                ? "bg-[#1c1b18] text-white shadow-xs"
                : "border border-[#e5e3db] bg-white text-[#6e6c64] hover:border-[#1c1b18]"
            }`}
          >
            📈 Portfolio &amp; Assets
          </button>
          <button
            onClick={() => setActiveDashTab("books")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeDashTab === "books"
                ? "bg-[#1c1b18] text-white shadow-xs"
                : "border border-[#e5e3db] bg-white text-[#6e6c64] hover:border-[#1c1b18]"
            }`}
          >
            📚 Book Library &amp; Notes
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e5e3db] bg-white shadow-[0_16px_36px_-10px_rgba(28,27,24,0.08)]">
          <div className="flex h-10 items-center justify-between border-b border-[#e5e3db] bg-[#f4f3ec] px-4">
            <div className="flex items-center gap-2">
              <div className={`${BROWSER_DOT} bg-[#ff5f56]`} />
              <div className={`${BROWSER_DOT} bg-[#ffbd2e]`} />
              <div className={`${BROWSER_DOT} bg-[#27c93f]`} />
              <span className="ml-2 font-mono text-[11px] text-[#6e6c64]">continuum.home / dashboard</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-[#6e6c64]">
              <span className="rounded bg-[#e5e3db] px-2 py-0.5 font-mono text-[10px] text-[#1c1b18]">
                {activeDashTab.toUpperCase()} TAB ACTIVE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[190px_1fr] max-[768px]:grid-cols-1 text-left bg-[#f7f4ee]">

            <div className="flex flex-col justify-between border-r border-[#e7e3da] bg-[#f4f0ea] p-3.5 text-[11.5px] max-[768px]:hidden">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 px-2 py-1.5 font-semibold text-[#1c1b18] mb-3 border-b border-[#e7e3da]/70 pb-2.5">
                  <BentoLogo size={15} color="#1c1b18" />
                  <span className="font-bold text-[13px] tracking-tight">Continuum</span>
                </div>

                <button
                  onClick={() => setActiveDashTab("finance")}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium transition-colors cursor-pointer ${
                    activeDashTab === "finance"
                      ? "bg-[#eee8dd] font-bold text-[#1c1b18] shadow-xs"
                      : "text-[#6e6c64] hover:bg-[#e9e4d9]"
                  }`}
                >
                  <span>💸</span> <span>Expenses &amp; Subs</span>
                </button>
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#6e6c64] hover:bg-[#e9e4d9]">
                  <span>🩺</span> <span>Financial Health</span>
                </div>
                <button
                  onClick={() => setActiveDashTab("investments")}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium transition-colors cursor-pointer ${
                    activeDashTab === "investments"
                      ? "bg-[#eee8dd] font-bold text-[#1c1b18] shadow-xs"
                      : "text-[#6e6c64] hover:bg-[#e9e4d9]"
                  }`}
                >
                  <span>📈</span> <span>Investments</span>
                </button>
                <button
                  onClick={() => setActiveDashTab("media")}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium transition-colors cursor-pointer ${
                    activeDashTab === "media" || activeDashTab === "books"
                      ? "bg-[#eee8dd] font-bold text-[#1c1b18] shadow-xs"
                      : "text-[#6e6c64] hover:bg-[#e9e4d9]"
                  }`}
                >
                  <span>📚</span> <span>Library</span>
                </button>
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#6e6c64]">
                  <span>📊</span> <span>Reports</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#6e6c64]">
                  <span>🤖</span> <span>AI Agent</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 font-medium text-[#6e6c64]">
                  <span>⚙️</span> <span>Settings</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-[#e7e3da] text-[10px] text-[#6e6c64]">
                <span className="font-mono text-[9px] font-bold uppercase text-[#9c9a92] px-2">Integrations</span>
                <div className="flex items-center gap-1.5 px-2 text-[10.5px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
                  <span>Trakt &amp; AniList</span>
                </div>
                <div className="flex items-center justify-between px-2 pt-2 border-t border-[#e7e3da]/70">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-[#1c1b18] text-white flex items-center justify-center font-bold text-[9px]">A</div>
                    <span className="font-semibold text-[#1c1b18] truncate">User</span>
                  </div>
                  <span className="shrink-0 rounded bg-[#fef08a] px-1 py-0.2 font-mono text-[7.5px] font-bold text-[#854d0e]">PRO</span>
                </div>
              </div>
            </div>

            <div className="p-5 max-[480px]:p-3 bg-[#f7f4ee] h-[510px] overflow-y-auto">
              {activeDashTab === "finance" && (
                <div className="flex flex-col gap-4 font-body">
                  <div className="flex items-center justify-between border-b border-[#e5e1d8] pb-2.5 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-2">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-bold tracking-tight text-[#1c1b18] italic font-serif" style={SERIF_ITALIC_STYLE}>
                        Expenses Ledger
                      </h3>
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="rounded-lg bg-[#eee8dd] px-2.5 py-0.5 font-semibold text-[#1c1b18]">Ledger</span>
                        <span className="px-2.5 py-0.5 text-[#6e6c64]">Subscriptions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="font-mono text-[10.5px] text-[#6e6c64]">PAYDAY: <strong className="text-[#1c1b18]">25th of month</strong></span>
                      <span className="rounded-lg border border-[#e5e1d8] bg-white px-2.5 py-0.5 font-semibold text-[#1c1b18] shadow-xs">Current Pay Period ▾</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
                    <div className="rounded-xl border border-[#7ca4c7] bg-[#90b4d4] p-3 text-[#1c1b18]">
                      <span className="text-[9px] font-bold tracking-wider uppercase opacity-85">Total Spent</span>
                      <p className="mt-0.5 text-xl font-extrabold text-[#1c1b18]">₹22,349.2</p>
                      <span className="mt-0.5 block text-[9.5px] font-medium text-[#2c4760]">Last salary cycle</span>
                    </div>
                    <div className="rounded-xl border border-[#d6a83a] bg-[#e5b84c] p-3 text-[#1c1b18]">
                      <span className="text-[9px] font-bold tracking-wider uppercase opacity-85">Charges Logged</span>
                      <p className="mt-0.5 text-xl font-extrabold text-[#1c1b18]">44</p>
                      <span className="mt-0.5 block text-[9.5px] font-medium text-[#5e4713]">Transactions</span>
                    </div>
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#6e6c64]">Largest Charge</span>
                      <p className="mt-0.5 text-xl font-extrabold text-[#d96b5a]">₹5,000</p>
                      <span className="mt-0.5 block text-[9.5px] text-[#6e6c64]">Rent</span>
                    </div>
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#6e6c64]">Top Category</span>
                      <p className="mt-0.5 text-xl font-extrabold text-[#1c1b18]">Food</p>
                      <span className="mt-0.5 block text-[9.5px] text-[#6e6c64]">Highest share</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1.3fr_1fr] gap-3 max-[900px]:grid-cols-1">
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-[#f4f0ea] pb-2 mb-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1c1b18]">Analytics</h4>
                        <div className="flex rounded-lg border border-[#e5e1d8] bg-[#faf8f4] p-0.5 text-[9.5px] font-semibold">
                          <span className="rounded-md bg-[#262522] px-2 py-0.5 text-white">Category Distribution</span>
                          <span className="px-2 py-0.5 text-[#6e6c64]">Daily Trend</span>
                        </div>
                      </div>

                      <div className="flex h-24 items-end justify-between gap-1 pt-1">
                        {[
                          { cat: "FOOD", height: "88%", amt: "₹5.8k", color: "bg-[#b85c5c]" },
                          { cat: "TRANSPORT", height: "78%", amt: "₹5.3k", color: "bg-[#e09181]" },
                          { cat: "RENT", height: "70%", amt: "₹5.0k", color: "bg-[#1c1b18]" },
                          { cat: "MEDICAL", height: "40%", amt: "₹2.7k", color: "bg-[#706c62]" },
                          { cat: "ENT.", height: "22%", amt: "₹1.3k", color: "bg-[#c2bdae]" },
                          { cat: "CARE", height: "18%", amt: "₹1.1k", color: "bg-[#c2bdae]" },
                          { cat: "DRINKS", height: "12%", amt: "₹0.8k", color: "bg-[#706c62]" },
                          { cat: "GIFTS", height: "8%", amt: "₹0.5k", color: "bg-[#c2bdae]" },
                        ].map((bar) => (
                          <div className="flex flex-1 flex-col items-center justify-end h-full gap-0.5" key={bar.cat}>
                            <span className="font-mono text-[8px] font-bold text-[#6e6c64]">{bar.amt}</span>
                            <div className="w-full h-14 flex items-end justify-center">
                              <div
                                className={`w-full max-w-[20px] rounded-t-xs ${bar.color}`}
                                style={{ height: bar.height }}
                              />
                            </div>
                            <span className="font-mono text-[7px] font-bold text-[#9c9a92] truncate max-w-full">{bar.cat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3 shadow-xs flex flex-col justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#1c1b18] mb-2 border-b border-[#f4f0ea] pb-2">
                        📅 Upcoming Bills
                      </h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between rounded-lg border border-[#e5e1d8] bg-white p-2 text-xs shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#e0f2fe] text-xs">📺</span>
                            <div>
                              <p className="font-bold text-[#1c1b18] text-[11px]">Youtube <span className="font-mono text-[#1c1b18]">₹148</span></p>
                              <span className="inline-block rounded bg-[#fef2f2] px-1 py-0.2 text-[8.5px] font-bold text-[#dc2626]">Due 7 Sept · Monthly</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#dcfce7] text-[#15803d] font-bold text-[10px]">✓</span>
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#fee2e2] text-[#dc2626] font-bold text-[10px]">✕</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border border-[#e5e1d8] bg-white p-2 text-xs shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#f3e8ff] text-xs">🎵</span>
                            <div>
                              <p className="font-bold text-[#1c1b18] text-[11px]">Spotify <span className="font-mono text-[#1c1b18]">₹300</span></p>
                              <span className="text-[8.5px] text-[#6e6c64]">Due 13 Sept · Monthly</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#dcfce7] text-[#15803d] font-bold text-[10px]">✓</span>
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#fee2e2] text-[#dc2626] font-bold text-[10px]">✕</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[200px_1fr] gap-3 max-[900px]:grid-cols-1">
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3 text-xs flex flex-col gap-2 shadow-xs">
                      <span className="font-mono text-[9px] font-bold uppercase text-[#9c9a92]">Log Transaction</span>
                      <input className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-2.5 py-1 text-[11px] text-[#1c1b18]" placeholder="Description" defaultValue="Lunch biryani" />
                      <input className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-2.5 py-1 text-[11px] text-[#1c1b18]" placeholder="Amount (₹)" defaultValue="275" />
                      <select className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-2.5 py-1 text-[11px] text-[#1c1b18]">
                        <option>Food</option>
                        <option>Groceries</option>
                        <option>Rent</option>
                      </select>
                      <button className="mt-0.5 rounded-lg bg-[#1c1b18] py-1.5 text-[11px] font-bold text-white cursor-pointer">+ Add Transaction</button>
                    </div>

                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3 text-xs shadow-xs">
                      <div className="flex items-center justify-between border-b border-[#f4f0ea] pb-2 mb-2">
                        <span className="font-mono text-[9px] font-bold uppercase text-[#9c9a92]">Ledger Sheet</span>
                        <div className="flex gap-1">
                          <span className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-2 py-0.5 text-[9.5px] font-semibold text-[#1c1b18]">📥 Import</span>
                          <span className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-2 py-0.5 text-[9.5px] font-semibold text-[#1c1b18]">📤 Export</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_36px] items-center border-b border-[#f4f0ea] pb-1 font-mono text-[9px] text-[#9c9a92] uppercase">
                          <span>Description</span>
                          <span>Category</span>
                          <span>Date</span>
                          <span className="text-right">Amount</span>
                          <span className="text-center">Actions</span>
                        </div>
                        {[
                          { desc: "Lunch biryani", cat: "FOOD", date: "2026-09-07", amt: "₹275" },
                          { desc: "Pepsi", cat: "DRINKS", date: "2026-09-07", amt: "₹40" },
                          { desc: "Lunch", cat: "FOOD", date: "2026-09-06", amt: "₹208" },
                          { desc: "Dinner", cat: "FOOD", date: "2026-09-05", amt: "₹312" },
                        ].map((row, i) => (
                          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_36px] items-center border-b border-[#f7f4ed] py-0.5 text-[11px]" key={i}>
                            <span className="font-bold text-[#1c1b18] truncate">{row.desc}</span>
                            <div>
                              <span className="rounded bg-[#eae6dd] border border-[#e2ddd0] px-1 py-0.2 font-mono text-[8px] font-bold text-[#55534c]">{row.cat}</span>
                            </div>
                            <span className="font-mono text-[10px] text-[#9c9a92]">{row.date}</span>
                            <span className="font-bold text-right text-[#1c1b18]">{row.amt}</span>
                            <div className="flex justify-center gap-0.5 text-[10px] text-[#9c9a92]">
                              <span>✏️</span>
                              <span>🗑️</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDashTab === "media" && (
                <div className="flex flex-col gap-5 font-body">
                  <div className="flex items-center justify-between border-b border-[#e5e1d8] pb-3">
                    <h3 className="text-xl font-bold tracking-tight text-[#1c1b18] italic font-serif" style={SERIF_ITALIC_STYLE}>
                      Media library
                    </h3>
                  </div>

                  <div className="grid grid-cols-4 gap-3.5 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#6e6c64]">Watching Now</span>
                      <p className="mt-1 text-2xl font-extrabold text-[#1c1b18]">8</p>
                      <span className="mt-1 block font-mono text-[10px] text-[#9c9a92]">ANIME 8 · TV/S 0</span>
                    </div>
                    <div className="rounded-xl border border-[#fecaca] bg-[#fff5f5] p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#dc2626]">Plan to Watch</span>
                      <p className="mt-1 text-2xl font-extrabold text-[#dc2626]">28</p>
                      <span className="mt-1 block font-mono text-[10px] text-[#ef4444]">ANIME 28 · TV/S 0</span>
                    </div>
                    <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#15803d]">Completed</span>
                      <p className="mt-1 text-2xl font-extrabold text-[#15803d]">475</p>
                      <span className="mt-1 block font-mono text-[10px] text-[#16a34a]">ANIME 220 · TV/S 255</span>
                    </div>
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#6e6c64]">Total Library</span>
                      <p className="mt-1 text-xl font-extrabold text-[#1c1b18]">269 <span className="text-xs font-normal text-[#6e6c64]">anime</span></p>
                      <span className="mt-1 block font-mono text-[10px] text-[#6e6c64]">24 shows · 249 movies</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[220px_1fr] gap-4 max-[900px]:grid-cols-1">
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl border border-[#e5e1d8] bg-white p-3.5 text-xs flex flex-col gap-2 shadow-xs">
                        <span className="font-mono text-[9.5px] font-bold uppercase text-[#9c9a92]">Search &amp; Add</span>
                        <input className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-3 py-1.5 text-xs" placeholder="Search title..." />
                        <select className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-3 py-1.5 text-xs">
                          <option>Movies (Trakt)</option>
                          <option>TV Shows</option>
                          <option>Anime (AniList)</option>
                        </select>
                        <button className="rounded-lg bg-[#6e6c64] py-1.5 text-xs font-bold text-white cursor-pointer">Search</button>
                      </div>

                      <div className="rounded-xl border border-[#e5e1d8] bg-white p-3.5 text-xs shadow-xs">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#9c9a92]">🤖 AI Recommendation</span>
                        <div className="mt-2.5 flex gap-2.5 items-center">
                          <img
                            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80"
                            alt="Minority Report poster"
                            className="h-16 w-12 rounded object-cover shadow-xs border border-[#e5e1d8]"
                          />
                          <div>
                            <p className="font-bold text-[#1c1b18]">Minority Report</p>
                            <span className="text-[10.5px] font-bold text-[#d97706]">⭐️ 7.8</span>
                            <span className="mt-0.5 block text-[9.5px] text-[#6e6c64]">Sci-Fi / Action</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-[#f4f0ea] pb-3 mb-3 max-[600px]:flex-col max-[600px]:gap-2">
                        <div className="flex gap-1.5">
                          <span className="rounded-lg bg-[#1c1b18] px-3 py-1 text-xs font-bold text-white">Movies</span>
                          <span className="rounded-lg border border-[#e5e1d8] px-3 py-1 text-xs font-medium text-[#6e6c64]">TV Shows</span>
                          <span className="rounded-lg border border-[#e5e1d8] px-3 py-1 text-xs font-medium text-[#6e6c64]">Anime</span>
                        </div>
                        <div className="flex gap-1 text-[10.5px] font-semibold text-[#6e6c64]">
                          <span className="rounded bg-[#f7f4ed] px-2 py-0.5">All</span>
                          <span className="rounded bg-[#f7f4ed] px-2 py-0.5">Watching</span>
                          <span className="rounded bg-[#f7f4ed] px-2 py-0.5">Plan</span>
                          <span className="rounded bg-[#dcfce7] px-2 py-0.5 text-[#15803d]">Done</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 max-[600px]:grid-cols-2">
                        {[
                          {
                            title: "Dune: Part Two",
                            status: "Completed",
                            statusBg: "bg-[#dcfce7] text-[#15803d]",
                            img: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
                            year: "2024",
                            rating: "★ 8.6",
                          },
                          {
                            title: "Severance S2",
                            status: "Plan to Watch",
                            statusBg: "bg-[#fef2f2] text-[#dc2626]",
                            img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
                            year: "2025",
                            rating: "★ 8.7",
                          },
                          {
                            title: "Frieren",
                            status: "Watching",
                            statusBg: "bg-[#e0e7ff] text-[#3730a3]",
                            img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
                            year: "2023",
                            rating: "★ 9.1",
                          },
                          {
                            title: "Thunderbolts*",
                            status: "Completed",
                            statusBg: "bg-[#dcfce7] text-[#15803d]",
                            img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
                            year: "2025",
                            rating: "★ 7.9",
                          },
                        ].map((item, idx) => (
                          <div className="rounded-lg border border-[#e5e1d8] bg-[#faf8f4] p-2 flex flex-col items-center shadow-2xs group hover:border-[#1c1b18] transition-colors" key={idx}>
                            <div className="relative h-28 w-full overflow-hidden rounded-md bg-[#eee8dd] mb-2">
                              <img
                                src={item.img}
                                alt={item.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <span className="absolute top-1 right-1 rounded bg-[#1c1b18]/80 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-white backdrop-blur-xs">
                                {item.rating}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-[#1c1b18] truncate w-full text-center">{item.title}</p>
                            <span className="text-[9px] text-[#6e6c64]">{item.year}</span>
                            <span className={`mt-1 rounded px-1.5 py-0.2 text-[8.5px] font-bold ${item.statusBg}`}>{item.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDashTab === "investments" && (
                <div className="flex flex-col gap-5 font-body">
                  <div className="flex items-center justify-between border-b border-[#e5e1d8] pb-3">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-[#1c1b18] italic font-serif" style={SERIF_ITALIC_STYLE}>
                        Wealth &amp; Portfolio Management
                      </h3>
                      <p className="text-xs text-[#6e6c64]">Manage holdings, learn investment principles, and optimize asset allocation</p>
                    </div>
                    <button className="rounded-lg bg-[#1c1b18] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer shadow-xs">🔄 Sync Live Prices</button>
                  </div>

                  <div className="grid grid-cols-5 gap-3 max-[900px]:grid-cols-3 max-[480px]:grid-cols-1">
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#6e6c64]">Portfolio Value</span>
                      <p className="mt-1 text-lg font-extrabold text-[#1c1b18]">₹6,736.80</p>
                      <span className="mt-0.5 block text-[9.5px] text-[#6e6c64]">Current market valuation</span>
                    </div>
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#6e6c64]">Total Invested</span>
                      <p className="mt-1 text-lg font-extrabold text-[#1c1b18]">₹6,689.55</p>
                      <span className="mt-0.5 block text-[9.5px] text-[#6e6c64]">Total net capital inputs</span>
                    </div>
                    <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#166534]">Unrealized P&amp;L</span>
                      <p className="mt-1 text-lg font-extrabold text-[#15803d]">+₹47.25</p>
                      <span className="mt-0.5 block text-[9.5px] font-bold text-[#16a34a]">+0.71% Return</span>
                    </div>
                    <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#166534]">Realized Profit</span>
                      <p className="mt-1 text-lg font-extrabold text-[#15803d]">+₹1,268.30</p>
                      <span className="mt-0.5 block text-[9.5px] text-[#6e6c64]">From 3 closed assets</span>
                    </div>
                    <div className="rounded-xl border border-[#fecaca] bg-[#fff5f5] p-3">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-[#991b1b]">Today&apos;s Movement</span>
                      <p className="mt-1 text-lg font-extrabold text-[#dc2626]">-₹40.95</p>
                      <span className="mt-0.5 block text-[9.5px] font-bold text-[#ef4444]">-0.60% Today</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-[800px]:grid-cols-1 text-xs">
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4 shadow-xs">
                      <span className="font-bold text-[#1c1b18]">Current Asset Allocation</span>
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1d4ed8] text-white font-extrabold text-[10px] text-center shadow-xs">NET WORTH ₹7K</div>
                        <div>
                          <p className="font-bold text-[#1c1b18]">Stocks / Equity <span className="font-mono text-[#6e6c64]">₹6,737 (100%)</span></p>
                          <span className="mt-2 inline-block rounded bg-[#dcfce7] px-2 py-0.5 font-bold text-[#15803d] text-[10px]">BEST RETURN: ETERNAL.NS (+0.71%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4 shadow-xs">
                      <div className="flex justify-between border-b border-[#f4f0ea] pb-2 mb-2 font-bold text-[#1c1b18]">
                        <span>Target Risk Allocation</span>
                        <span className="text-[10.5px] text-[#6e6c64]">Balanced Profile</span>
                      </div>
                      <div className="flex flex-col gap-1.5 text-[10.5px]">
                        <div className="flex justify-between"><span>Cash &amp; FDs</span><span className="font-mono text-[#9c9a92]">0% / 25% target</span></div>
                        <div className="flex justify-between"><span>Gold</span><span className="font-mono text-[#9c9a92]">0% / 10% target</span></div>
                        <div className="flex justify-between"><span>Mutual Funds / SIP</span><span className="font-mono text-[#9c9a92]">0% / 45% target</span></div>
                        <div className="flex justify-between font-bold text-[#1d4ed8]"><span>Stocks / Equity</span><span className="font-mono">100% / 20% target</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[220px_1fr] gap-4 max-[900px]:grid-cols-1 text-xs">
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3.5 flex flex-col gap-2 shadow-xs">
                      <span className="font-mono text-[9.5px] font-bold uppercase text-[#9c9a92]">Add Investment</span>
                      <input className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-3 py-1.5 text-xs" placeholder="Asset Ticker" defaultValue="ETERNAL.NS" />
                      <select className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-3 py-1.5 text-xs">
                        <option>Equity (Stocks)</option>
                        <option>Mutual Fund</option>
                        <option>Crypto</option>
                      </select>
                      <input className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-3 py-1.5 text-xs" placeholder="Total Capital" defaultValue="6689.55" />
                      <button className="rounded-lg bg-[#1c1b18] py-1.5 text-xs font-bold text-white cursor-pointer">+ Save Asset</button>
                    </div>

                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-3.5 shadow-xs">
                      <span className="font-mono text-[9.5px] font-bold uppercase text-[#9c9a92] mb-2.5 block">Active Holdings Ledger</span>
                      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] border-b border-[#f4f0ea] pb-2 font-mono text-[9.5px] text-[#9c9a92] uppercase">
                        <span>Asset</span>
                        <span>Category</span>
                        <span>Market Value</span>
                        <span>Returns</span>
                        <span className="text-right">Day Chg</span>
                      </div>
                      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] items-center border-b border-[#f7f4ed] py-2 text-xs">
                        <span className="font-bold text-[#1c1b18]">ETERNAL.NS</span>
                        <div><span className="rounded bg-[#dbeafe] px-2 py-0.5 font-mono text-[8.5px] font-bold text-[#1d4ed8]">EQUITY</span></div>
                        <span className="font-bold text-[#1c1b18]">₹6,736.80</span>
                        <span className="font-bold text-[#15803d]">+₹47.25 (+0.71%)</span>
                        <span className="font-bold text-right text-[#dc2626]">-₹40.95</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDashTab === "books" && (
                <div className="flex flex-col gap-5 font-body">
                  <div className="flex items-center justify-between border-b border-[#e5e1d8] pb-3">
                    <h3 className="text-xl font-bold tracking-tight text-[#1c1b18] italic font-serif" style={SERIF_ITALIC_STYLE}>
                      Book Library
                    </h3>
                  </div>

                  <div className="grid grid-cols-4 gap-3.5 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#6e6c64]">Reading Now</span>
                      <p className="mt-1 text-2xl font-extrabold text-[#1c1b18]">1</p>
                      <span className="mt-1 block text-[10px] text-[#6e6c64]">In progress</span>
                    </div>
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#6e6c64]">To Read</span>
                      <p className="mt-1 text-2xl font-extrabold text-[#1c1b18]">0</p>
                      <span className="mt-1 block text-[10px] text-[#6e6c64]">On the shelf</span>
                    </div>
                    <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#15803d]">Finished</span>
                      <p className="mt-1 text-2xl font-extrabold text-[#15803d]">27</p>
                      <span className="mt-1 block text-[10px] text-[#16a34a]">Books read</span>
                    </div>
                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4">
                      <span className="text-[9.5px] font-bold tracking-wider uppercase text-[#6e6c64]">Total in Library</span>
                      <p className="mt-1 text-2xl font-extrabold text-[#1c1b18]">28</p>
                      <span className="mt-1 block text-[10px] text-[#6e6c64]">All cataloged books</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[220px_1fr] gap-4 max-[900px]:grid-cols-1">
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl border border-[#e5e1d8] bg-white p-3.5 text-xs flex flex-col gap-2 shadow-xs">
                        <span className="font-mono text-[9.5px] font-bold uppercase text-[#9c9a92]">Search Google Books</span>
                        <input className="rounded-lg border border-[#e5e1d8] bg-[#f7f4ed] px-3 py-1.5 text-xs" placeholder="Search books..." />
                        <button className="rounded-lg bg-[#6e6c64] py-1.5 text-xs font-bold text-white cursor-pointer">Search</button>
                      </div>

                      <div className="rounded-xl border border-[#e5e1d8] bg-white p-3.5 text-xs shadow-xs">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#9c9a92]">🤖 AI Book Recommendation</span>
                        <div className="mt-2.5 flex gap-2.5 items-center">
                          <img
                            src="https://covers.openlibrary.org/b/isbn/9780156001311-L.jpg"
                            alt="The Name of the Rose cover"
                            className="h-16 w-11 rounded object-cover shadow-xs border border-[#e5e1d8]"
                          />
                          <div>
                            <p className="font-bold text-[#1c1b18] leading-tight">The Name of the Rose</p>
                            <span className="mt-0.5 block text-[9.5px] text-[#6e6c64]">Umberto Eco</span>
                            <span className="mt-1 inline-block rounded bg-[#fef08a] px-1.5 py-0.2 text-[8.5px] font-bold text-[#854d0e]">Mystery / History</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#e5e1d8] bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-[#f4f0ea] pb-3 mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c1b18]">Your Library</h4>
                        <div className="flex gap-1 text-[10.5px] font-semibold text-[#6e6c64]">
                          <span className="rounded bg-[#f7f4ed] px-2 py-0.5">All</span>
                          <span className="rounded bg-[#f7f4ed] px-2 py-0.5">Reading</span>
                          <span className="rounded bg-[#dcfce7] px-2 py-0.5 text-[#15803d]">Done</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 max-[600px]:grid-cols-2">
                        {[
                          {
                            title: "2 States",
                            author: "Chetan Bhagat",
                            cover: "https://covers.openlibrary.org/b/isbn/9788129115300-L.jpg",
                          },
                          {
                            title: "Angels & Demons",
                            author: "Dan Brown",
                            cover: "https://covers.openlibrary.org/b/isbn/9780671027360-L.jpg",
                          },
                          {
                            title: "Circe",
                            author: "Madeline Miller",
                            cover: "https://covers.openlibrary.org/b/isbn/9780316556347-L.jpg",
                          },
                          {
                            title: "Harry Potter",
                            author: "J.K. Rowling",
                            cover: "https://covers.openlibrary.org/b/isbn/9780439554930-L.jpg",
                          },
                        ].map((book, idx) => (
                          <div className="rounded-lg border border-[#e5e1d8] bg-[#faf8f4] p-2 flex flex-col items-center text-center shadow-2xs group hover:border-[#1c1b18] transition-colors" key={idx}>
                            <div className="relative h-28 w-full overflow-hidden rounded-md bg-[#eee8dd] mb-2 flex items-center justify-center">
                              <img
                                src={book.cover}
                                alt={book.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <p className="text-[11px] font-bold text-[#1c1b18] truncate w-full">{book.title}</p>
                            <span className="text-[9px] text-[#6e6c64] truncate w-full">{book.author}</span>
                            <span className="mt-1 rounded bg-[#dcfce7] px-1.5 py-0.2 text-[8.5px] font-bold text-[#15803d]">Done ✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      <section className="border-t border-b border-border-subtle bg-bg-secondary px-6 py-[80px]">
        <div className="mx-auto max-w-[1100px] text-center">
          <span className={`${HERO_BADGE} bg-bg-card`}>Universal Access</span>
          <h2 className={`${HERO_TITLE} mb-10 text-[38px] max-[480px]:text-[28px]`}>
            Built for everyone.
            <br />
            <span className="font-normal italic text-text-secondary" style={SERIF_ITALIC_STYLE}>
              Simple for daily use. Powerful when you need it.
            </span>
          </h2>

          <div className="grid grid-cols-4 gap-5 text-left max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
            <div className="flex h-full flex-col items-start rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover">
              <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-secondary text-xl">✨</div>
              <h4 className="mb-1.5 text-base font-bold text-text-primary">For Everyday Users</h4>
              <p className={STEP_DESC}>
                Instant zero-setup access. Track daily expenses, watchlists, and books with zero technical hassle.
              </p>
            </div>
            <div className="flex h-full flex-col items-start rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover">
              <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-secondary text-xl">👩‍💻</div>
              <h4 className="mb-1.5 text-base font-bold text-text-primary">For Developers</h4>
              <p className={STEP_DESC}>
                Fork the repo, deploy to Vercel in ~5 minutes. Full environment control with zero server maintenance.
              </p>
            </div>
            <div className="flex h-full flex-col items-start rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover">
              <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-secondary text-xl">🔒</div>
              <h4 className="mb-1.5 text-base font-bold text-text-primary">For Privacy Conscious</h4>
              <p className={STEP_DESC}>
                Own your Firebase database. Sensitive financial data encrypted at rest with AES-256 GCM.
              </p>
            </div>
            <div className="flex h-full flex-col items-start rounded-2xl border border-border-subtle bg-bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover">
              <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-secondary text-xl">🤖</div>
              <h4 className="mb-1.5 text-base font-bold text-text-primary">For AI Users</h4>
              <p className={STEP_DESC}>
                Give ChatGPT Custom Actions or local LLMs a structured, OpenAPI-authenticated interface to your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="setup"
        className="bg-bg-primary px-6 py-[80px]"
      >
        <div className="mx-auto grid max-w-[1100px] grid-cols-[1fr_1.05fr] items-start gap-[50px] max-[900px]:grid-cols-1 max-[900px]:gap-10">
          <div>
            <div className="mb-6 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-secondary px-3.5 py-1 font-mono text-[10px] font-bold tracking-[1.5px] text-text-secondary uppercase">
                Developer First
              </span>
              <span className="inline-flex items-center rounded-full border border-[#10b981]/30 bg-[#10b981]/15 px-3.5 py-1 font-mono text-[10px] font-bold tracking-[1px] text-[#047857] dark:text-[#34d399]">
                ~5 min deployment
              </span>
            </div>
            <h2 className={`${HERO_TITLE} mb-8 text-left text-[38px] max-[480px]:text-[28px]`}>
              If you can clone a repo,
              <br />
              <span className="font-normal italic text-text-secondary" style={SERIF_ITALIC_STYLE}>
                you can self-host this.
              </span>
            </h2>
            <div className="mb-6 flex items-start gap-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-text-primary text-[11px] font-bold text-bg-card">
                1
              </span>
              <div>
                <h4 className="mb-1 text-[15px] font-bold text-text-primary">
                  Fork &amp; Deploy to Vercel
                </h4>
                <p className={STEP_DESC}>
                  Click Deploy in the README. Vercel automatically builds and provisions CI/CD in under 2 minutes.
                </p>
              </div>
            </div>
            <div className="mb-6 flex items-start gap-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-text-primary text-[11px] font-bold text-bg-card">
                2
              </span>
              <div>
                <h4 className="mb-1 text-[15px] font-bold text-text-primary">
                  Connect Firebase Project
                </h4>
                <p className={STEP_DESC}>
                  Paste your Firebase config into Vercel environment variables. Firestore &amp; Auth initialize on first login.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-text-primary text-[11px] font-bold text-bg-card">
                3
              </span>
              <div>
                <h4 className="mb-1 text-[15px] font-bold text-text-primary">
                  Connect Optional API Keys
                </h4>
                <p className={STEP_DESC}>
                  Optionally add AniList, Trakt, and TMDb keys for automated watchlist enrichment. Everything else works out-of-the-box.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-bg-card p-7 shadow-subtle">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">Deployment Workflow</span>
              <span className="rounded bg-bg-secondary px-2 py-0.5 font-mono text-[9px] text-text-secondary">VERCEL + FIREBASE</span>
            </div>
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-3">
                <span className="font-bold text-text-primary">git clone</span>
                <span className="text-text-secondary text-[11px] truncate">https://github.com/fal3n-4ngel/Continuum-Home</span>
              </div>
              <div className="flex items-center justify-center text-text-muted text-[11px]">↓</div>
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary p-3">
                <span className="font-bold text-text-primary">Vercel Deploy</span>
                <span className="rounded bg-[#dcfce7] dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-[#15803d] dark:text-emerald-400">BUILD SUCCESSFUL</span>
              </div>
              <div className="flex items-center justify-center text-text-muted text-[11px]">↓</div>
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary p-3">
                <span className="font-bold text-text-primary">Firebase Rules</span>
                <span className="rounded bg-[#dbeafe] dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-[#1d4ed8] dark:text-blue-400">ISOLATION VERIFIED</span>
              </div>
              <div className="flex items-center justify-center text-text-muted text-[11px]">↓</div>
              <div className="rounded-lg border border-[#bbf7d0] dark:border-emerald-800/40 bg-[#f0fdf4] dark:bg-emerald-950/40 p-3 text-center font-semibold text-[#14532d] dark:text-emerald-300">
                🎉 Ready at your-custom-domain.vercel.app
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-b border-border-subtle bg-bg-secondary px-6 py-[80px] text-center"
      >
        <div className="mx-auto max-w-[1100px]">
          <span className={`${HERO_BADGE} bg-bg-card`}>Transparent Positioning</span>
          <h2 className={`${HERO_TITLE} mb-3 text-[42px] max-[480px]:text-[30px]`}>
            Pick your setup.
            <br />
            <span className="font-normal italic text-text-secondary" style={SERIF_ITALIC_STYLE}>
              All are welcome.
            </span>
          </h2>
          <p className="mx-auto mb-0 max-w-[580px] text-base leading-[1.6] text-text-secondary">
            Zero feature gates on self-hosting. Use the hosted instance for free, self-deploy for full privacy, or support ongoing open-source development.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-5 text-left max-[900px]:mx-auto max-[900px]:max-w-[480px] max-[900px]:grid-cols-1">
            <div className="relative flex flex-col rounded-2xl border border-border-subtle bg-bg-card p-7 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-subtle">
              <span className="mb-4 inline-block self-start rounded-full bg-bg-secondary border border-border-subtle px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-wider text-text-secondary uppercase">
                Free Cloud Hosted
              </span>
              <p className="mb-1 text-xl font-bold tracking-tight text-text-primary">
                Free Cloud
              </p>
              <p className="mb-1 text-[36px] leading-none font-extrabold tracking-tight text-text-primary">
                $0{" "}
                <span className="text-[13px] font-normal tracking-normal text-text-muted">
                  / forever
                </span>
              </p>
              <p className="mt-3 flex-1 text-[13px] leading-[1.6] text-text-secondary">
                Sign in instantly to use the shared hosted instance. Access core tracking modules with zero server setup.
              </p>
              <div className="my-5 h-px bg-border-subtle" />
              <ul className="mb-6 flex list-none flex-col gap-2.5 p-0">
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Instant access, zero setup
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Expense ledger &amp; subscriptions
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Watchlists &amp; Book library
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> AES-256 DB Encryption
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Custom GPT &amp; AI Agent API
                </li>
              </ul>
              {authError && (
                <div className="mb-3 rounded-lg border border-[#fecaca] dark:border-rose-900/50 bg-[#fef2f2] dark:bg-rose-950/40 px-3 py-2 text-xs text-[#dc2626] dark:text-rose-400">
                  {authError}
                </div>
              )}
              <button
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-5 py-2.5 text-[13px] font-semibold text-text-primary no-underline transition-all duration-200 hover:border-border-hover hover:bg-bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onLogin}
                disabled={!firebaseAuthReady}
              >
                Sign in with Google →
              </button>
            </div>

            <div className="relative flex flex-col rounded-2xl border-2 border-text-primary bg-bg-card p-7 shadow-subtle transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5">
              <span className="mb-4 inline-block self-start rounded-full bg-text-primary px-2.5 py-1 font-mono text-[9.5px] font-bold tracking-wider text-bg-card uppercase">
                Recommended · Developer
              </span>
              <p className="mb-1 text-xl font-bold tracking-tight text-text-primary">
                Self-Hostable
              </p>
              <p className="mb-1 text-[36px] leading-none font-extrabold tracking-tight text-text-primary">
                $0{" "}
                <span className="text-[13px] font-normal tracking-normal text-text-muted">
                  forever
                </span>
              </p>
              <p className="mt-3 flex-1 text-[13px] leading-[1.6] text-text-secondary">
                Deploy to Vercel + Firebase in ~5 minutes. 100% free with all features fully unlocked in your private database.
              </p>
              <div className="my-5 h-px bg-border-subtle" />
              <ul className="mb-6 flex list-none flex-col gap-2.5 p-0">
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> <strong>100% features unlocked</strong>
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Private Firebase &amp; full data ownership
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Financial Health Pay-Cycles &amp; AI Chat
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> MIT Licensed open source
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Zero rate limits or resource sharing
                </li>
              </ul>
              <a
                href="https://github.com/fal3n-4ngel/Continuum-Home#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-text-primary bg-text-primary px-5 py-2.5 text-[13px] font-semibold text-bg-card no-underline transition-all duration-200 hover:opacity-90"
              >
                View Self-Host Guide →
              </a>
            </div>

            <div className="relative flex flex-col rounded-2xl border border-border-subtle bg-bg-card p-7 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-subtle">
              <span className="mb-4 inline-block self-start rounded-full bg-bg-secondary border border-border-subtle px-2.5 py-1 font-mono text-[9.5px] font-semibold tracking-wider text-text-secondary uppercase">
                Open Source Supporter
              </span>
              <p className="mb-1 text-xl font-bold tracking-tight text-text-primary">
                Supporter Tier
              </p>
              <p className="mb-1 text-[36px] leading-none font-extrabold tracking-tight text-text-primary">
                $1{" "}
                <span className="text-[13px] font-normal tracking-normal text-text-muted">
                  / month
                </span>
              </p>
              <p className="text-[12px] text-text-secondary mt-1 mb-1">
                or $25 lifetime support payment
              </p>
              <p className="mt-3 flex-1 text-[13px] leading-[1.6] text-text-secondary">
                Support development of Continuum while unlocking hosted Financial Health tools and early feature previews.
              </p>
              <div className="my-5 h-px bg-border-subtle" />
              <ul className="mb-6 flex list-none flex-col gap-2.5 p-0">
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Everything in Free Cloud
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> <strong>Financial Health Tab</strong> (Pay-cycles)
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> <strong>Kiroku AI Assistant</strong>
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Supporter profile badge &amp; highlight
                </li>
                <li className="flex items-start gap-2 text-[12.5px] text-text-primary">
                  <span className={FI_YES}>✓</span> Direct feedback &amp; feature priority
                </li>
              </ul>
              <button
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-5 py-2.5 text-[13px] font-semibold text-text-primary no-underline transition-all duration-200 hover:border-border-hover hover:bg-bg-primary"
                onClick={onLogin}
                disabled={!firebaseAuthReady}
              >
                Become a Supporter →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border-subtle bg-bg-primary px-6 py-[80px] max-[480px]:py-[50px]">
        <div className="mx-auto grid max-w-[1100px] grid-cols-[1.1fr_1fr] gap-[50px] max-[900px]:grid-cols-1 max-[900px]:gap-8">
          <div>
            <span className={`${HERO_BADGE} bg-bg-secondary border-border-subtle text-text-secondary`}>Frequently asked</span>
            <h2 className={`${HERO_TITLE} mb-4 text-left text-[38px] max-[480px]:text-[28px]`}>
              Questions,
              <br />
              <span className="font-normal italic text-text-secondary" style={SERIF_ITALIC_STYLE}>
                answered.
              </span>
            </h2>
            <p className={`${STEP_DESC} mb-6 max-w-[380px] text-sm`}>
              Clear answers to common questions about self-hosting, privacy, encryption, and AI agents.
            </p>
            <a
              href="https://github.com/fal3n-4ngel/Continuum-Home/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className={`${HERO_CTA_PRIMARY} inline-flex`}
            >
              Ask a question on GitHub
              <span>→</span>
            </a>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-card shadow-[0_12px_32px_-8px_rgba(28,27,24,0.06)]">
            {FAQ_ITEMS.map((item, idx) => (
              <details
                key={item.question}
                className={`group px-6 py-4.5 max-[480px]:px-4 ${
                  idx !== FAQ_ITEMS.length - 1 ? "border-b border-border-subtle" : ""
                }`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-semibold text-text-primary marker:content-none [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border-subtle text-[13px] text-text-muted transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 max-w-[440px] text-[13px] leading-[1.65] text-text-secondary">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }),
        }}
      />

      <footer className="border-t border-border-subtle bg-bg-card">
        <div className="mx-auto max-w-[1100px] px-20 pt-12 max-[900px]:px-6 max-[900px]:pt-10">
          <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-[50px] border-b border-border-subtle pb-10 max-[900px]:grid-cols-1 max-[900px]:gap-8 max-[900px]:pb-8">
            <div className="flex flex-col gap-3">
              <a
                href="#"
                className="flex items-center gap-[9px] text-base font-bold tracking-tight text-text-primary no-underline"
              >
                <BentoLogo size={18} color="var(--text-primary)" />
                {SITE_NAME}
              </a>
              <p className="max-w-[300px] text-[13px] leading-[1.65] text-text-secondary">
                A self-hostable personal dashboard and OpenAPI layer for daily expenses, media watchlists, book reading, and investments.
              </p>
              <p className="text-xs text-text-muted">
                Built by{" "}
                <a
                  href={AUTHOR.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary no-underline hover:text-text-primary"
                >
                  {AUTHOR.name}
                </a>{" "}
                ·{" "}
                <a
                  href={AUTHOR.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary no-underline hover:text-text-primary"
                >
                  @{AUTHOR.githubHandle}
                </a>
              </p>
            </div>

            <div>
              <span className={FOOTER_COL_LABEL}>Product</span>
              <ul className="flex list-none flex-col gap-[10px] p-0">
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Expense Ledger
                  </span>
                </li>
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Media Watchlist
                  </span>
                </li>
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Book Library
                  </span>
                </li>
                <li>
                  <span className={FOOTER_LINK_ITEM} onClick={onLogin}>
                    Investment Portfolio
                  </span>
                </li>
                <li>
                  <a href="/assistant" className={FOOTER_LINK_ITEM}>
                    ChatGPT &amp; AI Integration
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <span className={FOOTER_COL_LABEL}>Resources</span>
              <ul className="flex list-none flex-col gap-[10px] p-0">
                <li>
                  <a
                    href="https://github.com/fal3n-4ngel/Continuum-Home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    GitHub Repository ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/fal3n-4ngel/Continuum-Home#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    Self-Host Guide ↗
                  </a>
                </li>
                <li>
                  <a
                    href="/api/openapi.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    OpenAPI Spec ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/fal3n-4ngel/Continuum-Home/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={FOOTER_LINK_ITEM}
                  >
                    Report an Issue ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-b border-border-subtle py-5">
            <span className={`${FOOTER_COL_LABEL} mb-0`}>
              Wherever you&apos;re tracking from
            </span>
            <LiveClockStrip />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 py-5 max-[900px]:flex-col max-[900px]:items-start">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] tracking-[0.6px] text-text-muted uppercase">
              <span>© {new Date().getFullYear()} Continuum</span>
              <span className="text-border-subtle">·</span>
              <span>MIT LICENSED</span>
              <span className="text-border-subtle">·</span>
              <a
                href={AUTHOR.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted no-underline hover:text-text-primary"
              >
                Adithya Krishnan
              </a>
              <span className="text-border-subtle">·</span>
              <a
                href={AUTHOR.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted no-underline hover:text-text-primary"
              >
                @fal3n-4ngel
              </a>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.6px] text-text-muted uppercase">
              <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>

        <div
          className="relative h-[120px] overflow-hidden border-t border-border-subtle bg-bg-secondary max-[900px]:h-[90px] [background-image:radial-gradient(var(--border-subtle)_1.5px,transparent_1.5px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,transparent,black_40px)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_40px)]"
          aria-hidden="true"
        >
          <div
            className="absolute right-0 left-0 h-px opacity-60 [background:repeating-linear-gradient(to_right,var(--border-subtle)_0,var(--border-subtle)_4px,transparent_4px,transparent_10px)]"
            style={{ top: "28%" }}
          />
          <div
            className="absolute right-0 left-0 h-px opacity-60 [background:repeating-linear-gradient(to_right,var(--border-subtle)_0,var(--border-subtle)_4px,transparent_4px,transparent_10px)]"
            style={{ top: "62%" }}
          />
          <div
            className="absolute h-[5px] w-[5px] rounded-full bg-border-subtle"
            style={{ top: "28%", left: "14%" }}
          />
          <div
            className="absolute h-[5px] w-[5px] rounded-full bg-border-subtle"
            style={{ top: "62%", left: "38%" }}
          />
          <div
            className="absolute h-[5px] w-[5px] rounded-full bg-border-subtle"
            style={{ top: "28%", left: "72%" }}
          />
          <div className="absolute bottom-[-70px] left-[-30px] rotate-[12deg] opacity-[0.045]">
            <BentoLogo size={130} color="var(--text-primary)" />
          </div>
          <div className="absolute -right-10 -bottom-[50px] rotate-[-8deg] opacity-[0.06]">
            <BentoLogo size={260} color="var(--text-primary)" />
          </div>
        </div>
      </footer>

      <a
        href="https://github.com/fal3n-4ngel/Continuum-Home"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[990] flex items-center gap-2.5 rounded-full border border-border-subtle bg-bg-card px-4 py-2 text-xs font-bold text-text-primary shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:border-border-hover max-[600px]:hidden"
      >
        <span className="text-yellow-500 text-sm">⭐️</span>
        <span>Star on GitHub</span>
        <span className="rounded bg-bg-secondary px-1.5 py-0.2 font-mono text-[10px] text-text-secondary">↗</span>
      </a>
    </div>
  );
}
