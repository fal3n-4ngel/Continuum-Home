"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, RotateCcw, Sparkles } from "lucide-react";

interface KirokuTabProps {
  idToken?: string;
}

export function KirokuTab({ idToken }: KirokuTabProps) {
  const [messages, setMessages] = useState<{ sender: "user" | "assistant" | "system"; text: string }[]>([
    { sender: "assistant", text: "Hello! I'm Kiroku, your dashboard's built-in assistant. How can I help you manage your expenses, watchlist, subscriptions, or notes today?" }
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleReset = () => {
    setMessages([
      { sender: "assistant", text: "Chat history cleared. How can I help you manage your dashboard data now?" }
    ]);
    setHistory([]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !idToken) return;

    const userMsg = input.trim();
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: userMsg,
          history,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with AI.");
      }

      setMessages((prev) => [...prev, { sender: "assistant", text: data.reply }]);
      setHistory(data.history);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "system", text: err.message || "Something went wrong. Please check your credentials." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      let isBullet = false;
      let cleanLine = line;
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        isBullet = true;
        cleanLine = line.trim().substring(2);
      }

      const parts: React.ReactNode[] = [];
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-bold text-text-primary">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={index} className="list-disc ml-5 mt-1 pl-1 text-[14px] leading-relaxed text-text-secondary">
            {parts}
          </li>
        );
      }

      return (
        <p key={index} className="min-h-[1em] mt-1 text-[14px] leading-relaxed">
          {parts}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col gap-5 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] w-full max-w-5xl mx-auto">
      {/* Header matching dashboard theme */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl italic font-medium tracking-wide text-text-primary mb-2 flex items-center gap-3">
          Kiroku Assistant
        </h1>
        <button
          onClick={handleReset}
          title="Clear Chat History"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-subtle bg-bg-card hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-xs font-medium uppercase tracking-wider"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Main Chat Container */}
      <div className="flex flex-col h-[calc(100vh-200px)] w-full bg-bg-card border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
        
        {/* Messages Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-5 bg-transparent custom-scrollbar">
          
          {/* Guidelines Card shown at the beginning */}
          {history.length === 0 && (
            <div className="rounded-xl border border-border-subtle bg-bg-primary/50 p-6 shadow-sm text-[14px] leading-relaxed text-text-secondary flex flex-col gap-4 mx-auto max-w-2xl w-full mt-4 mb-4">
              <div className="flex items-center gap-2 text-text-primary">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <span className="font-serif font-bold text-lg">Suggested prompts</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11.5px]">
                <div className="bg-bg-card border border-border-subtle p-3 rounded-lg hover:border-text-primary/30 transition-colors cursor-pointer" onClick={() => setInput("spent 450 on lunch today")}>
                  &quot;spent 450 on lunch today&quot;
                </div>
                <div className="bg-bg-card border border-border-subtle p-3 rounded-lg hover:border-text-primary/30 transition-colors cursor-pointer" onClick={() => setInput("add Dune 2 to my plan to watch list")}>
                  &quot;add Dune 2 to my plan to watch list&quot;
                </div>
                <div className="bg-bg-card border border-border-subtle p-3 rounded-lg hover:border-text-primary/30 transition-colors cursor-pointer" onClick={() => setInput("list my watchlist completed items")}>
                  &quot;list my watchlist completed items&quot;
                </div>
                <div className="bg-bg-card border border-border-subtle p-3 rounded-lg hover:border-text-primary/30 transition-colors cursor-pointer" onClick={() => setInput("show me my expenses this week")}>
                  &quot;show me my expenses this week&quot;
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.sender === "user"
                  ? "justify-end"
                  : msg.sender === "system"
                  ? "justify-center"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] px-5 py-3 text-[14.5px] leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-text-primary text-bg-primary rounded-[22px] rounded-br-[6px]" // iMessage style right
                    : msg.sender === "system"
                    ? "bg-red-50 border border-red-200 text-red-700 text-center font-medium text-[12px] py-2 px-4 rounded-xl w-full max-w-md mx-auto"
                    : "bg-[#f4f2ea] border border-[#e8e4d8] text-text-primary rounded-[22px] rounded-bl-[6px]" // Warm chat bubble left
                }`}
              >
                {msg.sender === "user" || msg.sender === "system" ? msg.text : renderMarkdown(msg.text)}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#f4f2ea] border border-[#e8e4d8] rounded-[22px] rounded-bl-[6px] px-5 py-4 shadow-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Form Input */}
        <div className="p-4 md:p-6 border-t border-border-subtle bg-bg-card/50 backdrop-blur-sm">
          <form onSubmit={handleSend} className="relative flex items-center max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !idToken}
              placeholder={
                !idToken
                  ? "Sign in to query assistant..."
                  : "Message Kiroku..."
              }
              className="w-full rounded-full border border-border-subtle px-6 py-4 pr-16 text-[15px] bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary/10 focus:border-text-primary/30 disabled:opacity-50 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !idToken}
              className="absolute right-2 top-1/2 -translate-y-1/2  h-12 w-12 rounded-full bg-text-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
              aria-label="Send message"
            >
              <Send className="h-24 w-24 z-1000 scale-175" />
            </button>
          </form>
          <div className="text-center mt-3">
            <span className="text-[10px] text-text-muted font-mono tracking-wider uppercase">Kiroku can make mistakes. Verify important data.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
