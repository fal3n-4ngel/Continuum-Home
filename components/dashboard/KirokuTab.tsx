"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, RotateCcw, Sparkles, Bot } from "lucide-react";

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
  const inputRef = useRef<HTMLInputElement>(null);

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
      const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
      let lastIndex = 0;
      let match;

      while ((match = tokenRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith("**") && token.endsWith("**")) {
          parts.push(<strong key={match.index} className="font-semibold text-text-primary">{token.slice(2, -2)}</strong>);
        } else if (token.startsWith("`") && token.endsWith("`")) {
          parts.push(<code key={match.index} className="rounded bg-bg-secondary/70 px-1.5 py-0.5 font-mono text-[12px] text-text-primary">{token.slice(1, -1)}</code>);
        }
        lastIndex = tokenRegex.lastIndex;
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
        <p key={index} className="min-h-[1em] mt-1 text-[14px] leading-relaxed first:mt-0">
          {parts}
        </p>
      );
    });
  };

  const suggestedPrompts = [
    { label: "Spent 450 on lunch today", icon: "💸" },
    { label: "Add Dune 2 to my watchlist", icon: "🎬" },
    { label: "Show my expenses this week", icon: "📊" },
    { label: "List my completed watchlist", icon: "🍿" },
  ];

  return (
    <div className="flex flex-col gap-4 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-bg-card shadow-xs">
            <Bot className="h-5 w-5 text-text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl italic font-medium tracking-tight text-text-primary">
                Kiroku Assistant
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[12px] text-text-secondary">
              Natural language intelligence for your ledger, watchlist, and subscriptions
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          title="Clear Chat History"
          className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-border-hover hover:bg-bg-primary hover:text-text-primary cursor-pointer active:scale-95 shadow-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      </div>

      <div className="flex flex-col h-[calc(100dvh-230px)] min-h-[500px] w-full bg-bg-card border border-border-subtle rounded-2xl shadow-subtle overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col gap-4 bg-transparent custom-scrollbar">
          {history.length === 0 && (
            <div className="flex flex-col items-center text-center my-auto py-6 px-4 max-w-lg mx-auto animate-[fadeIn_0.3s_ease-out]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-bg-primary shadow-xs mb-3 text-text-primary">
                <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="font-serif text-xl italic font-semibold text-text-primary mb-1">
                How can I help today?
              </h2>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-6 max-w-sm">
                Ask questions about your finances, track a new expense, add to your watchlist, or analyze subscriptions.
              </p>
              <div className="flex flex-wrap justify-center gap-2 w-full">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInput(prompt.label);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-2 rounded-full border border-border-subtle bg-bg-primary/80 px-3.5 py-2 text-[12.5px] font-medium text-text-secondary transition-all hover:border-text-primary/40 hover:bg-bg-primary hover:text-text-primary hover:scale-[1.02] active:scale-95 cursor-pointer shadow-xs text-left"
                  >
                    <span>{prompt.icon}</span>
                    <span>&ldquo;{prompt.label}&rdquo;</span>
                  </button>
                ))}
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
              {msg.sender === "assistant" ? (
                <div className="flex items-start gap-3 max-w-[88%] sm:max-w-[80%] md:max-w-[72%]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-primary shadow-xs mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-border-subtle/80 bg-bg-primary/70 px-4.5 py-3 text-[14px] leading-relaxed text-text-primary shadow-xs">
                    {renderMarkdown(msg.text)}
                  </div>
                </div>
              ) : msg.sender === "user" ? (
                <div className="flex items-start justify-end gap-2 max-w-[88%] sm:max-w-[80%] md:max-w-[72%] ml-auto">
                  <div className="rounded-2xl rounded-tr-sm bg-text-primary px-4.5 py-3 text-[14px] leading-relaxed text-white shadow-xs">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div className="mx-auto my-1 max-w-md rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-[12px] font-medium text-red-700 dark:text-red-400">
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3 max-w-[80%]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-primary shadow-xs mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border-subtle/80 bg-bg-primary/70 px-4.5 py-3 text-text-secondary shadow-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-border-subtle bg-bg-card/80 backdrop-blur-md">
          <form onSubmit={handleSend} className="relative flex items-center max-w-3xl mx-auto rounded-full border border-border-subtle bg-bg-primary p-1.5 pl-5 pr-1.5 focus-within:border-border-hover focus-within:ring-2 focus-within:ring-text-primary/10 transition-all shadow-inner">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !idToken}
              placeholder={
                !idToken
                  ? "Sign in to query assistant..."
                  : "Message Kiroku..."
              }
              className="flex-1 bg-transparent border-none text-[14px] text-text-primary placeholder:text-text-muted outline-none disabled:opacity-50 py-2"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !idToken}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-text-primary text-white shadow-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-text-muted font-mono tracking-wider uppercase">
              Kiroku can make mistakes. Verify important data.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
