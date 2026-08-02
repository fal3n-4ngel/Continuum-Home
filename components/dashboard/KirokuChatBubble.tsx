"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, RotateCcw } from "lucide-react";

interface KirokuChatBubbleProps {
  idToken?: string;
}

// "Kiroku" (記録) — Japanese for "record/log," a fitting name for the
// dashboard's built-in assistant. The underlying model is an implementation
// detail and intentionally not surfaced in any user-facing text here.
export function KirokuChatBubble({ idToken }: KirokuChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: "user" | "assistant" | "system"; text: string }[]>([
    { sender: "assistant", text: "Hello! I'm Kiroku, your dashboard's built-in assistant. How can I help you manage your expenses, watchlist, subscriptions, or notes today?" }
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom on new messages
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

    // Append user message locally
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

  // Custom parser to format markdown bold (**text**) and lists (* item) natively
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
          <li key={index} className="list-disc ml-4 mt-0.5 pl-0.5 text-[12.5px] leading-relaxed text-text-secondary">
            {parts}
          </li>
        );
      }

      return (
        <p key={index} className="min-h-[1em] mt-0.5 text-[12.5px] leading-relaxed">
          {parts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed max-md:bottom-[76px] bottom-6 right-6 h-12 w-12 rounded-full bg-text-primary text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 z-[9999] cursor-pointer"
        aria-label="Toggle Kiroku Assistant"
      >
        {isOpen ? <X className="h-5.5 w-5.5" /> : <MessageSquare className="h-5.5 w-5.5" />}
      </button>

      {/* Chat Overlay Panel */}
      {isOpen && (
        <div className="fixed max-md:bottom-[136px] bottom-20 right-6 w-96 max-md:w-[calc(100vw-32px)] h-[480px] bg-bg-card border border-border-subtle rounded-card shadow-subtle flex flex-col overflow-hidden z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-200">

          {/* Header */}
          <div className="border-b border-border-subtle px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <div>
                <h3 className="font-serif text-lg font-bold tracking-tight text-text-primary leading-tight">Kiroku</h3>
                <p className="font-mono text-[9px] font-semibold tracking-[0.6px] text-text-muted uppercase">記録 · Dashboard Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleReset}
                title="Clear Chat History"
                className="p-1 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-transparent">

            {/* Guidelines Card shown at the beginning */}
            {history.length === 0 && (
              <div className="rounded-lg border border-border-subtle bg-bg-primary p-4 shadow-sm text-xs leading-relaxed text-text-secondary flex flex-col gap-2 mb-2">
                <span className="font-serif font-bold text-text-primary block text-sm">💡 What you can ask:</span>
                <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                  <div>• &quot;spent 450 on lunch today&quot;</div>
                  <div>• &quot;add Dune 2 to my plan to watch list&quot;</div>
                  <div>• &quot;list my watchlist completed items&quot;</div>
                  <div>• &quot;show me my expenses this week&quot;</div>
                  <div>• &quot;append this to my note: Buy groceries&quot;</div>
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
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-text-primary text-bg-primary rounded-tr-sm"
                      : msg.sender === "system"
                      ? "bg-red-50 border border-red-100 text-red-700 text-center font-medium text-[11px] py-1.5 w-full rounded"
                      : "bg-bg-primary border border-border-subtle text-text-primary rounded-tl-sm"
                  }`}
                >
                  {msg.sender === "user" || msg.sender === "system" ? msg.text : renderMarkdown(msg.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border-subtle rounded-lg px-3.5 py-2 text-[12.5px] italic text-text-secondary flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="border-t border-border-subtle p-4 flex gap-2 bg-transparent">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || !idToken}
              placeholder={
                !idToken
                  ? "Sign in to query assistant..."
                  : "Type expense, watchlist, or note update..."
              }
              className="flex-1 rounded-md border border-border-subtle px-3 py-2 text-[12.5px] text-text-primary focus:outline-none focus:border-text-primary disabled:bg-bg-primary/20"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || !idToken}
              className="rounded-md border border-text-primary bg-text-primary text-[12px] font-semibold text-white px-4 py-2 hover:bg-[#2e2d27] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <Send className="h-3 w-3" /> Send
            </button>
          </form>

        </div>
      )}
    </>
  );
}
