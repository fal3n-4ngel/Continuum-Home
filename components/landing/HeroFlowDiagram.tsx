"use client";

import React, { useState } from "react";

export function HeroFlowDiagram() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-sm border border-[#DDD5CB] dark:border-[#25272E] bg-[#FAF8F5] dark:bg-[#18191D] shadow-xs overflow-hidden select-none">
      {/* Corner Tick Brackets */}
      <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419] pointer-events-none z-10">⌜</span>
      <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419] pointer-events-none z-10">⌝</span>
      <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419] pointer-events-none z-10">⌞</span>
      <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419] pointer-events-none z-10">⌟</span>

      <svg
        viewBox="0 0 940 380"
        className="w-full h-auto block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle Dot Grid Pattern */}
          <pattern
            id="workspace-dots"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="1"
              className="fill-[#DDD5CB]/70 dark:fill-[#25272E]"
            />
          </pattern>

          {/* Standard Muted Arrowhead */}
          <marker
            id="flow-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 7 5 L 0 8 z" className="fill-[#9C9288] dark:fill-[#736C64]" />
          </marker>

          {/* Golden Ochre Arrowhead */}
          <marker
            id="flow-arrow-ochre"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 7 5 L 0 8 z" fill="#D99419" />
          </marker>

          {/* Soft Drop Shadow for Cards */}
          <filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.06" />
          </filter>

          <filter id="sticky-shadow" x="-15%" y="-15%" width="130%" height="135%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Canvas Background with Dotted Matrix */}
        <rect width="100%" height="100%" fill="url(#workspace-dots)" />

        {/* Top Header Labels */}
        <text
          x="32"
          y="26"
          fontFamily="monospace"
          fontSize="9.5"
          letterSpacing="0.22em"
          className="fill-[#8E867E] dark:fill-[#A39B92] font-semibold uppercase"
        >
          WORKSPACE
        </text>

        <g transform="translate(810, 18)">
          <circle cx="8" cy="8" r="3" fill="#22c55e" className="animate-pulse" />
          <text
            x="18"
            y="9"
            dominantBaseline="central"
            fontFamily="monospace"
            fontSize="9.5"
            letterSpacing="0.2em"
            className="fill-[#8E867E] dark:fill-[#A39B92] font-semibold uppercase"
          >
            BENCH · LIVE
          </text>
        </g>

        {/* Floating Mouse Cursor (Top Left) */}
        <g transform="translate(38, 48)" className="cursor-default">
          <path
            d="M 0 0 L 0 16 L 4.5 12 L 8.5 20 L 11 19 L 7 11 L 13 11 Z"
            className="fill-[#1C1B18] dark:fill-[#EDE8E1] stroke-[#FAF8F5] dark:stroke-[#171614]"
            strokeWidth="1.2"
          />
          <g transform="translate(11, 10)">
            <rect
              x="0"
              y="0"
              width="46"
              height="16"
              rx="2"
              className="fill-[#1C1B18] dark:fill-[#18191D] stroke-[#FAF8F5]/30 dark:stroke-[#25272E]"
              strokeWidth="0.8"
            />
            <text
              x="23"
              y="11"
              textAnchor="middle"
              fontFamily="sans-serif"
              fontSize="9"
              fontWeight="600"
              className="fill-[#FAF8F5] dark:fill-[#EDE8E1]"
            >
              Pleurat
            </text>
          </g>
        </g>

        {/* ================= FLOW PIPELINE ================= */}

        {/* Path 1: BRIEF -> EXPLORE */}
        <line
          x1="145"
          y1="117"
          x2="173"
          y2="117"
          strokeWidth="1.2"
          markerEnd="url(#flow-arrow)"
          className="stroke-[#9C9288] dark:stroke-[#6D635C]"
        />

        {/* Path 2: EXPLORE -> IN THE SYSTEM? */}
        <line
          x1="280"
          y1="117"
          x2="303"
          y2="117"
          strokeWidth="1.2"
          markerEnd="url(#flow-arrow)"
          className="stroke-[#9C9288] dark:stroke-[#6D635C]"
        />

        {/* Path 3 (YES): IN THE SYSTEM? -> REUSE */}
        <line
          x1="415"
          y1="117"
          x2="443"
          y2="117"
          stroke="#D99419"
          strokeWidth="1.3"
          markerEnd="url(#flow-arrow-ochre)"
        />
        <text
          x="427"
          y="107"
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="9.5"
          fontWeight="700"
          fill="#D99419"
        >
          YES
        </text>

        {/* Path 4: REUSE -> SHIP */}
        <path
          d="M 540 117 L 560 117 L 560 167 L 570 167"
          fill="none"
          strokeWidth="1.2"
          markerEnd="url(#flow-arrow)"
          className="stroke-[#9C9288] dark:stroke-[#6D635C]"
        />

        {/* Path 5 (NO): IN THE SYSTEM? -> NEW PATTERN */}
        <line
          x1="360"
          y1="152"
          x2="360"
          y2="203"
          strokeWidth="1.2"
          markerEnd="url(#flow-arrow)"
          className="stroke-[#9C9288] dark:stroke-[#6D635C]"
        />
        <text
          x="373"
          y="180"
          fontFamily="monospace"
          fontSize="9"
          fontWeight="600"
          className="fill-[#9C9288] dark:fill-[#736C64]"
        >
          NO
        </text>

        {/* Path 6: NEW PATTERN -> ADD TO LIB */}
        <line
          x1="415"
          y1="227"
          x2="443"
          y2="227"
          strokeWidth="1.2"
          markerEnd="url(#flow-arrow)"
          className="stroke-[#9C9288] dark:stroke-[#6D635C]"
        />

        {/* Path 7: ADD TO LIB -> SHIP */}
        <path
          d="M 540 227 L 560 227 L 560 167 L 570 167"
          fill="none"
          strokeWidth="1.2"
          markerEnd="url(#flow-arrow)"
          className="stroke-[#9C9288] dark:stroke-[#6D635C]"
        />

        {/* Live Animated Flow Particle (YES branch to SHIP) */}
        <circle r="2.8" fill="#D99419">
          <animateMotion
            path="M 60 117 L 145 117 L 175 117 L 280 117 L 360 117 L 415 117 L 445 117 L 540 117 L 560 117 L 560 167 L 572 167"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Live Animated Flow Particle (NO branch to SHIP) */}
        <circle r="2.8" fill="#9E5D48">
          <animateMotion
            path="M 360 152 L 360 205 L 360 227 L 415 227 L 445 227 L 540 227 L 560 227 L 560 167 L 572 167"
            dur="5.5s"
            begin="2s"
            repeatCount="indefinite"
          />
        </circle>

        {/* NODE 1: BRIEF */}
        <g
          onMouseEnter={() => setHoveredNode("brief")}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer transition-transform duration-150"
        >
          <rect
            x="60"
            y="95"
            width="85"
            height="44"
            rx="4"
            filter="url(#card-shadow)"
            className={`fill-[#F5F0E8] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E] transition-colors ${
              hoveredNode === "brief" ? "stroke-[#9E5D48] dark:stroke-[#9E5D48]" : ""
            }`}
            strokeWidth="1.5"
          />
          <text
            x="102.5"
            y="122"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="11.5"
            fontWeight="600"
            letterSpacing="0.06em"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            BRIEF
          </text>
        </g>

        {/* NODE 2: EXPLORE */}
        <g
          onMouseEnter={() => setHoveredNode("explore")}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer transition-transform duration-150"
        >
          <rect
            x="175"
            y="95"
            width="105"
            height="44"
            rx="4"
            filter="url(#card-shadow)"
            className={`fill-[#F5F0E8] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E] transition-colors ${
              hoveredNode === "explore" ? "stroke-[#9E5D48] dark:stroke-[#9E5D48]" : ""
            }`}
            strokeWidth="1.5"
          />
          <text
            x="227.5"
            y="122"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="11.5"
            fontWeight="600"
            letterSpacing="0.06em"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            EXPLORE
          </text>
        </g>

        {/* NODE 3: IN THE SYSTEM? (Diamond) */}
        <g
          onMouseEnter={() => setHoveredNode("system")}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer transition-transform duration-150"
        >
          <polygon
            points="360,82 415,117 360,152 305,117"
            filter="url(#card-shadow)"
            className={`fill-[#F5F0E8] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E] transition-colors ${
              hoveredNode === "system" ? "stroke-[#D99419] dark:stroke-[#D99419]" : ""
            }`}
            strokeWidth="1.5"
          />
          <text
            x="360"
            y="113"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="9"
            fontWeight="600"
            letterSpacing="0.04em"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            IN THE
          </text>
          <text
            x="360"
            y="127"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="9"
            fontWeight="600"
            letterSpacing="0.04em"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            SYSTEM?
          </text>
        </g>

        {/* NODE 4: REUSE */}
        <g
          onMouseEnter={() => setHoveredNode("reuse")}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer transition-transform duration-150"
        >
          <rect
            x="445"
            y="95"
            width="95"
            height="44"
            rx="4"
            filter="url(#card-shadow)"
            className={`fill-[#F5F0E8] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E] transition-colors ${
              hoveredNode === "reuse" ? "stroke-[#D99419] dark:stroke-[#D99419]" : ""
            }`}
            strokeWidth="1.5"
          />
          <text
            x="492.5"
            y="122"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="11.5"
            fontWeight="600"
            letterSpacing="0.06em"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            REUSE
          </text>
        </g>

        {/* NODE 5: NEW PATTERN */}
        <g
          onMouseEnter={() => setHoveredNode("new-pattern")}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer transition-transform duration-150"
        >
          <rect
            x="305"
            y="205"
            width="110"
            height="44"
            rx="4"
            filter="url(#card-shadow)"
            className={`fill-[#F5F0E8] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E] transition-colors ${
              hoveredNode === "new-pattern" ? "stroke-[#9E5D48] dark:stroke-[#9E5D48]" : ""
            }`}
            strokeWidth="1.5"
          />
          <text
            x="360"
            y="232"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="10.5"
            fontWeight="600"
            letterSpacing="0.05em"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            NEW PATTERN
          </text>
        </g>

        {/* NODE 6: ADD TO LIB */}
        <g
          onMouseEnter={() => setHoveredNode("add-to-lib")}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer transition-transform duration-150"
        >
          <rect
            x="445"
            y="205"
            width="95"
            height="44"
            rx="4"
            filter="url(#card-shadow)"
            className={`fill-[#F5F0E8] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E] transition-colors ${
              hoveredNode === "add-to-lib" ? "stroke-[#9E5D48] dark:stroke-[#9E5D48]" : ""
            }`}
            strokeWidth="1.5"
          />
          <text
            x="492.5"
            y="232"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="10.5"
            fontWeight="600"
            letterSpacing="0.05em"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            ADD TO LIB
          </text>
        </g>

        {/* NODE 7: SHIP (Golden Ochre Fill Button) */}
        <g
          onMouseEnter={() => setHoveredNode("ship")}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-pointer transition-transform duration-150"
        >
          <rect
            x="572"
            y="145"
            width="62"
            height="44"
            rx="4"
            filter="url(#card-shadow)"
            fill="#D99419"
            stroke="#C08012"
            strokeWidth="1.5"
            className={`transition-all duration-150 ${
              hoveredNode === "ship" ? "filter brightness-110" : ""
            }`}
          />
          <text
            x="603"
            y="172"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontSize="11.5"
            fontWeight="700"
            letterSpacing="0.06em"
            fill="#FAF8F5"
          >
            SHIP
          </text>
        </g>

        {/* ================= FLOATING STICKY NOTES ================= */}

        {/* Sticky Note 1: Lavender (Bottom Left) */}
        <g transform="translate(68, 252) rotate(-2)">
          <rect
            x="0"
            y="0"
            width="150"
            height="90"
            rx="2"
            filter="url(#sticky-shadow)"
            className="fill-[#EBE7F5] dark:fill-[#24202D] stroke-[#DDD5EC] dark:stroke-[#3E374D]"
            strokeWidth="1"
          />
          <text
            x="12"
            y="22"
            fontFamily="sans-serif"
            fontSize="10"
            className="fill-[#3D364A] dark:fill-[#D8D2E4]"
          >
            <tspan x="12" dy="0">Reuse before you add.</tspan>
            <tspan x="12" dy="16">Every new pattern is</tspan>
            <tspan x="12" dy="16">a thing somebody</tspan>
            <tspan x="12" dy="16">has to maintain.</tspan>
          </text>
        </g>

        {/* Sticky Note 2: Sky Blue (Bottom Center) */}
        <g transform="translate(325, 275) rotate(1.5)">
          <rect
            x="0"
            y="0"
            width="102"
            height="58"
            rx="2"
            filter="url(#sticky-shadow)"
            className="fill-[#E1ECF4] dark:fill-[#1B242C] stroke-[#C6DCEB] dark:stroke-[#2C3A48]"
            strokeWidth="1"
          />
          <text
            x="10"
            y="24"
            fontFamily="sans-serif"
            fontSize="9.5"
            className="fill-[#2C4050] dark:fill-[#C0D4E4]"
          >
            <tspan x="10" dy="0">Empty state?</tspan>
            <tspan x="10" dy="15">ask design</tspan>
          </text>
        </g>

        {/* ================= FLOATING CHAT CARD ================= */}
        <g transform="translate(695, 52) rotate(0.6)">
          <rect
            x="0"
            y="0"
            width="215"
            height="138"
            rx="4"
            filter="url(#card-shadow)"
            className="fill-[#FAF7F2] dark:fill-[#18191D] stroke-[#DDD5CB] dark:stroke-[#25272E]"
            strokeWidth="1.2"
          />
          
          {/* CHAT Label */}
          <text
            x="14"
            y="22"
            fontFamily="monospace"
            fontSize="9"
            fontWeight="600"
            letterSpacing="0.12em"
            className="fill-[#8E867E] dark:fill-[#A39B92] uppercase"
          >
            CHAT
          </text>

          {/* Prompt Bubble */}
          <rect
            x="12"
            y="32"
            width="191"
            height="34"
            rx="3"
            className="fill-[#ECE7DE] dark:fill-[#2C2824]"
          />
          <text
            x="20"
            y="53"
            fontFamily="sans-serif"
            fontSize="10"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            make the rail crop the second car
          </text>

          {/* Response */}
          <circle cx="18" cy="88" r="3" className="fill-[#1C1B18] dark:fill-[#EDE8E1]" />
          <text
            x="28"
            y="91"
            fontFamily="sans-serif"
            fontSize="9.5"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            On it — a 24px reveal on the
          </text>
          <text
            x="28"
            y="105"
            fontFamily="sans-serif"
            fontSize="9.5"
            className="fill-[#26211F] dark:fill-[#EDE8E1]"
          >
            second.
          </text>
          <text
            x="28"
            y="122"
            fontFamily="monospace"
            fontSize="8.5"
            className="fill-[#8E867E] dark:fill-[#A39B92]"
          >
            Editing WorkRail.tsx
          </text>
        </g>

        {/* Bottom Footer Labels */}
        <text
          x="32"
          y="360"
          fontFamily="monospace"
          fontSize="9"
          letterSpacing="0.18em"
          className="fill-[#8E867E] dark:fill-[#A39B92] font-semibold uppercase"
        >
          FIGMA · CURSOR · CLAUDE
        </text>

        <text
          x="908"
          y="360"
          textAnchor="end"
          fontFamily="monospace"
          fontSize="9"
          letterSpacing="0.18em"
          className="fill-[#8E867E] dark:fill-[#A39B92] font-semibold uppercase"
        >
          LIVE · NEVER FINISHED
        </text>
      </svg>
    </div>
  );
}
