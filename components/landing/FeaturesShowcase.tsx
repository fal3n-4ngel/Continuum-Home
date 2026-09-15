"use client";

import React from "react";
import { motion } from "framer-motion";

interface Feature {
  id: string;
  number: string;
  tag: string;
  title: string;
  description: string;
  specs: string[];
  refSpec: string;
  figTitle: string;
  cadCoord: string;
  canvasCoord: string;
}

const FEATURES: Feature[] = [
  {
    id: "finance",
    number: "01",
    tag: "services // 01",
    title: "Financial Ledger & Cashflow Vault",
    description:
      "We begin with zero compromise on privacy. Track every rupee, dollar, or euro with customizable pay cycles, dynamic category tagging, subscription burn rates, and instant CSV audits.",
    specs: [
      "Server-side AES-256-GCM authenticated encryption at rest",
      "Pay cycle normalization (monthly, bi-weekly, weekly)",
      "Zero third-party financial scrapers or shared databases",
    ],
    refSpec: "ENCRYPTED-STORAGE-V1.0",
    figTitle: "FINANCIAL VAULT & CASHFLOW SPEC",
    cadCoord: "X 10.150 Y 5.680",
    canvasCoord: "X 10.728 Y 14.071",
  },
  {
    id: "wealth",
    number: "02",
    tag: "services // 02",
    title: "Multi-Asset Wealth & Compounding Engine",
    description:
      "From equities and crypto to Indian Mutual Funds with direct AMFI NAV updates. Real-time compounding projections, fixed deposits, gold holdings, and net-worth consolidation in one dashboard.",
    specs: [
      "Live stock & ETF valuation via Yahoo Finance feed",
      "Direct AMFI API integration for all 44+ Indian mutual funds",
      "Compound interest and future wealth trajectory calculations",
    ],
    refSpec: "ASSET-VALUATION-ENGINE",
    figTitle: "MULTI-ASSET WEALTH & COMPOUNDING MATRIX",
    cadCoord: "X 14.738 Y 14.071",
    canvasCoord: "X 14.738 Y 14.071",
  },
  {
    id: "media",
    number: "03",
    tag: "services // 03",
    title: "Unified Media Archive & Book Library",
    description:
      "No more siloed apps for tracking what you watch and read. Synchronize your anime queue with AniList, your cinema records with Trakt and Letterboxd, and your reading log with OpenLibrary.",
    specs: [
      "AniList OAuth sync for Japanese animation & manga progress",
      "Trakt & OMDb metadata for movies and seasonal TV shows",
      "Book tracker with ISBN lookups and reading velocity analytics",
    ],
    refSpec: "CULTURAL-INDEX-V2",
    figTitle: "CULTURAL ARCHIVE & MEDIA SYNC ENGINE",
    cadCoord: "X 18.320 Y 08.910",
    canvasCoord: "X 18.320 Y 08.910",
  },
  {
    id: "ai",
    number: "04",
    tag: "services // 04",
    title: "Autonomous AI & OpenAPI 3.1 Gateway",
    description:
      "Continuum is built from the ground up as an AI-native operating system. Every action has an OpenAPI 3.1 specification. Speak to your custom ChatGPT or Claude agent to log data, audit budgets, or query holdings.",
    specs: [
      "Live OpenAPI 3.1 JSON schema generated at /api/openapi.json",
      "Custom GPT Actions for voice & conversational transaction logging",
      "Direct MCP (Model Context Protocol) tool integration ready",
    ],
    refSpec: "OPENAPI-AGENT-BRIDGE",
    figTitle: "OPENAPI 3.1 & AI AGENT GATEWAY SPEC",
    cadCoord: "X 22.105 Y 03.440",
    canvasCoord: "X 22.105 Y 03.440",
  },
];

export function FeaturesShowcase() {
  return (
    <section
      id="capabilities"
      className="relative z-10 border-t border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#0C0D0E] py-20 md:py-28"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        
        {/* Section Top Header Strip */}
        <div className="flex items-center justify-between border-b border-[#DDD5CB] dark:border-[#25272E] pb-4 mb-16 md:mb-20">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#9E5D48] dark:text-[#E07A5F]">
              ⌜ 01 // CAPABILITIES ⌟
            </span>
            <span className="text-[#DDD5CB] dark:text-[#25272E]">&bull;</span>
      
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#D99419]">
            <span>SCALE 1:1 // CAD SPEC</span>
          </div>
        </div>

        {/* Alternating Left-Right-Left-Right Vertical Stack */}
        <div className="flex flex-col">
          {FEATURES.map((feat, idx) => {
            const isEven = idx % 2 === 0;

            return (
              <div
                key={feat.id}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20 items-center py-16 md:py-24 ${
                  idx !== 0 ? "border-t border-dashed border-[#DDD5CB] dark:border-[#25272E]" : ""
                }`}
              >
                
                {/* DRAWING CANVAS CARD: Alternates between Left (even) and Right (odd) */}
                <div
                  className={`lg:col-span-6 relative ${
                    isEven ? "lg:order-1" : "lg:order-2"
                  }`}
                >
                  <div className="relative rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] p-6 sm:p-8 shadow-xs">
                    
                    {/* Corner Ochre Tick Marks */}
                    <span className="absolute top-2.5 left-2.5 font-mono text-[11px] text-[#D99419] select-none">⌜</span>
                    <span className="absolute top-2.5 right-2.5 font-mono text-[11px] text-[#D99419] select-none">⌝</span>
                    <span className="absolute bottom-2.5 left-2.5 font-mono text-[11px] text-[#D99419] select-none">⌞</span>
                    <span className="absolute bottom-2.5 right-2.5 font-mono text-[11px] text-[#D99419] select-none">⌟</span>

                    {/* Canvas Area with Animated Line Drawing */}
                    <div className="relative w-full aspect-[4/3.4] flex items-center justify-center overflow-hidden">
                      
                      {/* SCHEMATIC 01: Financial Ledger & Vault (Minimal Line Art) */}
                      {idx === 0 && (
                        <svg
                          viewBox="0 0 400 320"
                          className="w-full h-full"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          {/* Crosshair guide lines */}
                          <motion.line
                            x1="200" y1="25" x2="200" y2="55"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.line
                            x1="185" y1="40" x2="215" y2="40"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <text x="225" y="43" fill="#9C9288" fontSize="8" fontFamily="monospace">
                            {feat.cadCoord}
                          </text>

                          {/* Concentric Geometric Vault Rings */}
                          <motion.circle
                            cx="200" cy="145" r="75"
                            stroke="#DDD5CB" strokeWidth="1" strokeDasharray="3 3"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1 }}
                          />
                          <motion.circle
                            cx="200" cy="145" r="60"
                            stroke="#9E5D48" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, ease: "easeInOut" }}
                          />
                          <motion.circle
                            cx="200" cy="145" r="42"
                            stroke="#D99419" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.4, ease: "easeInOut", delay: 0.2 }}
                          />

                          {/* 8 Cardinal Architectural Line Ticks */}
                          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                            const rad = (deg * Math.PI) / 180;
                            const x1 = 200 + 52 * Math.cos(rad);
                            const y1 = 145 + 52 * Math.sin(rad);
                            const x2 = 200 + 60 * Math.cos(rad);
                            const y2 = 145 + 60 * Math.sin(rad);
                            return (
                              <motion.line
                                key={i}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke="#9E5D48" strokeWidth="1.2"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.4 + i * 0.05 }}
                              />
                            );
                          })}

                          {/* Clean Geometric Keyway in Center */}
                          <motion.rect
                            x="192" y="140" width="16" height="14" rx="1.5"
                            stroke="#D99419" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1 }}
                          />
                          <motion.path
                            d="M 195 140 V 134 A 5 5 0 0 1 205 134 V 140"
                            stroke="#D99419" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                          <circle cx="200" cy="147" r="1.5" fill="#D99419" />

                          {/* Minimal Horizontal Ledger Datum Lines */}
                          <motion.line
                            x1="80" y1="245" x2="320" y2="245"
                            stroke="#DDD5CB" strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1 }}
                          />
                          <motion.line
                            x1="80" y1="245" x2="220" y2="245"
                            stroke="#D99419" strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.3 }}
                          />
                          <motion.line
                            x1="80" y1="265" x2="320" y2="265"
                            stroke="#DDD5CB" strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                          <motion.line
                            x1="80" y1="265" x2="160" y2="265"
                            stroke="#9E5D48" strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.5 }}
                          />

                          {/* Subtle Dimension Labels */}
                          <text x="80" y="235" fill="#9C9288" fontSize="7.5" fontFamily="monospace">LEDGER ENTRY [01]</text>
                          <text x="320" y="235" textAnchor="end" fill="#9E5D48" fontSize="7.5" fontFamily="monospace">AES-256-GCM</text>
                        </svg>
                      )}

                      {/* SCHEMATIC 02: Multi-Asset Compounding (Minimal Line Art) */}
                      {idx === 1 && (
                        <svg
                          viewBox="0 0 400 320"
                          className="w-full h-full"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <motion.line
                            x1="200" y1="25" x2="200" y2="55"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.line
                            x1="185" y1="40" x2="215" y2="40"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <text x="225" y="43" fill="#9C9288" fontSize="8" fontFamily="monospace">
                            {feat.cadCoord}
                          </text>

                          {/* Minimal Coordinate Axes */}
                          <motion.line
                            x1="70" y1="80" x2="70" y2="250"
                            stroke="#DDD5CB" strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.line
                            x1="70" y1="250" x2="330" y2="250"
                            stroke="#DDD5CB" strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          
                          {/* Dashed Target Horizontal Datum */}
                          <line x1="70" y1="130" x2="330" y2="130" stroke="#DDD5CB" strokeWidth="0.8" strokeDasharray="3 3" />

                          {/* Sweeping Compounding Growth Curve Line */}
                          <motion.path
                            d="M 70 240 C 140 236, 210 195, 310 95"
                            stroke="#D99419"
                            strokeWidth="2.5"
                            fill="none"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.6, ease: "easeInOut" }}
                          />

                          {/* Peak Milestone Node & Drop Line */}
                          <motion.line
                            x1="310" y1="95" x2="310" y2="250"
                            stroke="#9E5D48" strokeWidth="1" strokeDasharray="2 2"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.8 }}
                          />
                          <motion.circle
                            cx="310" cy="95" r="4.5"
                            stroke="#9E5D48" strokeWidth="2" fill="#FAF8F5" className="dark:fill-[#18191D]"
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 1.2 }}
                          />
                          <text x="305" y="80" textAnchor="end" fill="#9E5D48" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            +14.2% CAGR
                          </text>

                          {/* Clean Stock Candlestick Markers */}
                          <g transform="translate(160, 175)">
                            <motion.line
                              x1="10" y1="-10" x2="10" y2="25"
                              stroke="#9E5D48" strokeWidth="1"
                              initial={{ pathLength: 0 }}
                              whileInView={{ pathLength: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.6, delay: 0.4 }}
                            />
                            <rect x="6" y="-2" width="8" height="15" fill="#9E5D48" />

                            <motion.line
                              x1="35" y1="-25" x2="35" y2="20"
                              stroke="#D99419" strokeWidth="1"
                              initial={{ pathLength: 0 }}
                              whileInView={{ pathLength: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.6, delay: 0.6 }}
                            />
                            <rect x="31" y="-15" width="8" height="22" fill="#D99419" />
                          </g>

                          {/* Ticker Annotation */}
                          <text x="70" y="270" fill="#9C9288" fontSize="7.5" fontFamily="monospace">AMFI NAV FEED</text>
                          <text x="330" y="270" textAnchor="end" fill="#D99419" fontSize="7.5" fontFamily="monospace">YAHOO LIVE QUOTES</text>
                        </svg>
                      )}

                      {/* SCHEMATIC 03: Unified Media & Book Library (Minimal Line Art) */}
                      {idx === 2 && (
                        <svg
                          viewBox="0 0 400 320"
                          className="w-full h-full"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <motion.line
                            x1="200" y1="25" x2="200" y2="55"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.line
                            x1="185" y1="40" x2="215" y2="40"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <text x="225" y="43" fill="#9C9288" fontSize="8" fontFamily="monospace">
                            {feat.cadCoord}
                          </text>

                          {/* Minimal Film Reel Frame Outline */}
                          <motion.rect
                            x="60" y="75" width="280" height="55" rx="2"
                            stroke="#9E5D48" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2 }}
                          />
                          {/* Sprocket Holes */}
                          {[75, 115, 155, 195, 235, 275, 315].map((x, i) => (
                            <rect key={i} x={x} y="80" width="8" height="5" rx="1" fill="#9E5D48" />
                          ))}
                          {[75, 115, 155, 195, 235, 275, 315].map((x, i) => (
                            <rect key={i} x={x} y="120" width="8" height="5" rx="1" fill="#9E5D48" />
                          ))}
                          <text x="100" y="106" fill="#9E5D48" fontSize="8" fontFamily="monospace" fontWeight="bold">ANILIST SYNC</text>
                          <text x="220" y="106" fill="#D99419" fontSize="8" fontFamily="monospace" fontWeight="bold">TRAKT / LETTERBOXD</text>

                          {/* Isometric Open Book Schematic Lines */}
                          <g transform="translate(120, 160)">
                            <motion.path
                              d="M 80 15 Q 40 5, 0 15 L 0 75 Q 40 65, 80 75 Z"
                              stroke="#D99419" strokeWidth="1.8"
                              initial={{ pathLength: 0 }}
                              whileInView={{ pathLength: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.4, delay: 0.3 }}
                            />
                            <motion.path
                              d="M 80 15 Q 120 5, 160 15 L 160 75 Q 120 65, 80 75 Z"
                              stroke="#D99419" strokeWidth="1.8"
                              initial={{ pathLength: 0 }}
                              whileInView={{ pathLength: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.4, delay: 0.3 }}
                            />
                            <motion.line
                              x1="80" y1="15" x2="80" y2="75"
                              stroke="#9E5D48" strokeWidth="2"
                              initial={{ pathLength: 0 }}
                              whileInView={{ pathLength: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: 0.5 }}
                            />
                            {/* Page ruling lines */}
                            <line x1="20" y1="35" x2="60" y2="35" stroke="#DDD5CB" strokeWidth="1" />
                            <line x1="20" y1="47" x2="60" y2="47" stroke="#DDD5CB" strokeWidth="1" />
                            <line x1="100" y1="35" x2="140" y2="35" stroke="#DDD5CB" strokeWidth="1" />
                            <line x1="100" y1="47" x2="140" y2="47" stroke="#DDD5CB" strokeWidth="1" />
                          </g>

                          {/* Reading Velocity Progress Line */}
                          <motion.line
                            x1="60" y1="265" x2="340" y2="265"
                            stroke="#DDD5CB" strokeWidth="1"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.line
                            x1="60" y1="265" x2="260" y2="265"
                            stroke="#D99419" strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.4 }}
                          />
                          <text x="60" y="282" fill="#9C9288" fontSize="7.5" fontFamily="monospace">OPENLIBRARY ISBN</text>
                          <text x="340" y="282" textAnchor="end" fill="#D99419" fontSize="7.5" fontFamily="monospace">VELOCITY METRICS</text>
                        </svg>
                      )}

                      {/* SCHEMATIC 04: Autonomous AI & OpenAPI Gateway (Minimal Line Art) */}
                      {idx === 3 && (
                        <svg
                          viewBox="0 0 400 320"
                          className="w-full h-full"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <motion.line
                            x1="200" y1="25" x2="200" y2="55"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.line
                            x1="185" y1="40" x2="215" y2="40"
                            stroke="#9C9288" strokeWidth="0.8"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                          />
                          <text x="225" y="43" fill="#9C9288" fontSize="8" fontFamily="monospace">
                            {feat.cadCoord}
                          </text>

                          {/* Central OpenAPI Gateway Square */}
                          <motion.rect
                            x="160" y="80" width="80" height="50" rx="3"
                            stroke="#9E5D48" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2 }}
                          />
                          <text x="200" y="103" textAnchor="middle" fill="#9E5D48" fontSize="8" fontFamily="monospace" fontWeight="bold">OPENAPI 3.1</text>
                          <text x="200" y="116" textAnchor="middle" fill="#D99419" fontSize="7" fontFamily="monospace">JSON ROUTER</text>

                          {/* Clean Diverging Conduit Lines */}
                          <motion.path
                            d="M 200 130 V 170 H 100 V 210"
                            stroke="#D99419" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.3 }}
                          />
                          <motion.path
                            d="M 200 130 V 210"
                            stroke="#9E5D48" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.4 }}
                          />
                          <motion.path
                            d="M 200 130 V 170 H 300 V 210"
                            stroke="#D99419" strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            whileInView={{ pathLength: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.5 }}
                          />

                          {/* 3 Terminal Endpoint Cards */}
                          {/* Node 1: ChatGPT Actions */}
                          <motion.rect
                            x="50" y="210" width="100" height="42" rx="2"
                            stroke="#D99419" strokeWidth="1.2"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                          />
                          <text x="100" y="228" textAnchor="middle" fill="#D99419" fontSize="7.5" fontFamily="monospace" fontWeight="bold">CHATGPT</text>
                          <text x="100" y="240" textAnchor="middle" fill="#9C9288" fontSize="7" fontFamily="monospace">ACTIONS</text>

                          {/* Node 2: Claude Agent */}
                          <motion.rect
                            x="155" y="210" width="90" height="42" rx="2"
                            stroke="#9E5D48" strokeWidth="1.2"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.9 }}
                          />
                          <text x="200" y="228" textAnchor="middle" fill="#9E5D48" fontSize="7.5" fontFamily="monospace" fontWeight="bold">CLAUDE</text>
                          <text x="200" y="240" textAnchor="middle" fill="#9C9288" fontSize="7" fontFamily="monospace">MCP TOOL</text>

                          {/* Node 3: REST API */}
                          <motion.rect
                            x="250" y="210" width="100" height="42" rx="2"
                            stroke="#D99419" strokeWidth="1.2"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 1 }}
                          />
                          <text x="300" y="228" textAnchor="middle" fill="#D99419" fontSize="7.5" fontFamily="monospace" fontWeight="bold">REST / HTTP2</text>
                          <text x="300" y="240" textAnchor="middle" fill="#9C9288" fontSize="7" fontFamily="monospace">200 OK [AES]</text>

                          {/* Bottom baseline spec */}
                          <text x="200" y="285" textAnchor="middle" fill="#9C9288" fontSize="7.5" fontFamily="monospace">
                            NATURAL LANGUAGE TRANSACTION &amp; MEDIA REPL
                          </text>
                        </svg>
                      )}

                    </div>

                    {/* Baseline Technical CAD Tag */}
                    <div className="mt-3 pt-2.5 border-t border-dashed border-[#DDD5CB] dark:border-[#25272E] flex items-center justify-between font-mono text-[9px] text-[#9C9288] uppercase">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#9E5D48] dark:text-[#E07A5F] font-semibold">fig. 0{idx + 1}</span>
                        <span>// {feat.figTitle}</span>
                      </div>
                      <span className="text-[#D99419] hidden sm:inline">100% PRIVATE ARCHITECTURE</span>
                    </div>

                  </div>

                  {/* Bottom-Right Corner CAD Crosshair Marker */}
                  <div className="absolute -bottom-5 -right-2 hidden sm:flex items-center gap-2 font-mono text-[9px] text-[#9C9288]/80 select-none">
                    <div className="relative w-4 h-4 flex items-center justify-center">
                      <div className="absolute w-4 h-px bg-[#9C9288]/60" />
                      <div className="absolute h-4 w-px bg-[#9C9288]/60" />
                    </div>
                    <span>{feat.canvasCoord}</span>
                  </div>
                </div>

                {/* NARRATIVE & SPECIFICATIONS: Alternates between Right (even) and Left (odd) */}
                <div
                  className={`lg:col-span-6 flex flex-col items-start ${
                    isEven ? "lg:order-2 pl-0 lg:pl-4" : "lg:order-1 pr-0 lg:pr-4"
                  }`}
                >
                  {/* Tag Badge */}
                  <div className="mb-2">
                    <span className="font-mono text-xs text-[#9E5D48] dark:text-[#E07A5F] tracking-wider uppercase">
                      ⌜ {feat.tag} ⌟
                    </span>
                  </div>

                  {/* Huge Faded Display Number with CAD Coordinate */}
                  <div className="relative select-none mb-2">
                    <div className="font-mono text-6xl sm:text-7xl md:text-8xl font-light text-[#9E5D48]/20 dark:text-[#E07A5F]/20 leading-none">
                      {feat.number}
                    </div>
                    <div className="absolute -bottom-1 left-2 font-mono text-[9.5px] text-[#9C9288] flex items-center gap-1">
                      <span>+</span>
                      <span>{feat.cadCoord}</span>
                    </div>
                  </div>

                  {/* Bold Terracotta Headline */}
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#9E5D48] dark:text-[#E07A5F] leading-tight mb-4 mt-2">
                    {feat.title}
                  </h3>

                  {/* Description Text */}
                  <p className="text-sm sm:text-base leading-relaxed text-[#6D635C] dark:text-[#9BA1B0] max-w-xl mb-5">
                    {feat.description}
                  </p>

                  {/* Technical Bullet Points */}
                  <ul className="flex flex-col gap-2 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] mb-6">
                    {feat.specs.map((spec, sIdx) => (
                      <li key={sIdx} className="flex items-center gap-2.5">
                        <span className="text-[#D99419] font-bold">&bull;</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Spec & Baseline Metadata */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#DDD5CB] dark:border-[#25272E] w-full font-mono text-[10px] text-[#9C9288] uppercase">
                    <span className="text-[#9E5D48] dark:text-[#E07A5F] font-semibold">
                      REF: {feat.refSpec}
                    </span>
                    <span className="text-[#D99419]">
                      SPEC 0{idx + 1} OF 0{FEATURES.length}
                    </span>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
