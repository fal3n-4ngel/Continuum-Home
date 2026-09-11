"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUp,
  RotateCcw,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Mic,
  Coffee,
  Film,
  PieChart,
  CalendarClock,
  Shield,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";

interface KirokuTabProps {
  idToken?: string;
  onOpenUpgrade?: () => void;
  aiOptOut?: boolean;
  onOpenSettings?: () => void;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
}

const KirokuSeal = ({ className = "h-7 w-7" }: { className?: string }) => (
  <div
    className={`inline-flex items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-primary font-serif italic text-xs font-semibold select-none shadow-2xs ${className}`}
    aria-label="Kiroku"
  >
    記
  </div>
);

const SUGGESTED_PROMPTS = [
  {
    icon: Coffee,
    label: "Log Expense",
    text: "Spent ₹450 on lunch with friends today",
  },
  {
    icon: Film,
    label: "Watchlist",
    text: "Add Dune: Part Two to my watchlist",
  },
  {
    icon: PieChart,
    label: "Monthly Outflows",
    text: "Show my highest spending category this month",
  },
  {
    icon: CalendarClock,
    label: "Subscriptions",
    text: "Which subscriptions renew in the next 7 days?",
  },
];

function formatKirokuErrorMessage(raw?: string): string {
  if (!raw) return "Something went wrong. Please check your connection.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("503") ||
    lower.includes("service unavailable") ||
    lower.includes("high demand") ||
    lower.includes("spikes in demand")
  ) {
    return "The assistant is experiencing high demand right now. Please try again in a moment.";
  }
  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    lower.includes("resource_exhausted")
  ) {
    return "Daily AI request limit reached. Please try again later.";
  }
  if (lower.includes("groq") || lower.includes("llm") || lower.includes("generativeai")) {
    return "The assistant encountered a temporary service issue. Please try again.";
  }
  return raw;
}

export function KirokuTab({ idToken, onOpenUpgrade, aiOptOut, onOpenSettings }: KirokuTabProps) {
  const { user, isProUser } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const firstName = user?.displayName?.trim()?.split(" ")[0] || "there";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleReset = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setHistory([]);
    setSpeakingId(null);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading || !idToken) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: textToSend,
          history,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with Kiroku.");
      }

      const assistantMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: "assistant",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setHistory(data.history || []);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          sender: "system",
          text: formatKirokuErrorMessage(err?.message),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSpeak = (id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_~]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleVoice = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
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
          parts.push(
            <strong key={match.index} className="font-semibold text-text-primary">
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith("`") && token.endsWith("`")) {
          parts.push(
            <code
              key={match.index}
              className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono text-[12px] text-text-primary"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        lastIndex = tokenRegex.lastIndex;
      }

      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={index} className="flex items-start gap-2 mt-1 text-[13.5px] sm:text-[14px] leading-relaxed text-text-primary">
            <span className="text-text-muted mt-1 leading-none select-none">•</span>
            <span className="flex-1">{parts}</span>
          </li>
        );
      }

      return (
        <p key={index} className="min-h-[1em] mt-1.5 text-[13.5px] sm:text-[14px] leading-relaxed text-text-primary first:mt-0">
          {parts}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col gap-3.5 w-full  mx-auto animate-[fadeIn_0.3s_ease_forwards]">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <KirokuSeal className="h-8 w-8 text-[13px]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl italic font-medium tracking-wide text-text-primary leading-none">
                Kiroku
              </h1>
              <span className="font-serif text-xs italic text-text-muted font-normal">
                記録 • Assistant
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            title="Clear Chat History"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-subtle bg-bg-card hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer text-xs font-medium"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="relative flex flex-col h-[calc(100dvh-155px)] min-h-[540px] max-md:h-[calc(100dvh-185px)] max-md:min-h-[420px] w-full rounded-2xl border border-border-subtle bg-bg-card shadow-subtle overflow-hidden">
        {aiOptOut ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center max-w-md mx-auto animate-[fadeIn_0.3s_ease]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-bg-secondary text-text-primary mb-4 shadow-subtle">
              <Shield size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-serif text-xl font-bold tracking-tight text-text-primary mb-2">
              AI Assistant is Disabled
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-6">
              You have opted out of AI features in your account privacy settings. No prompts, expense records, or library data will be shared with external AI models.
            </p>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-full border border-border-subtle bg-bg-primary hover:bg-bg-secondary px-4 py-1.5 text-xs font-semibold text-text-primary transition-all shadow-xs cursor-pointer"
              >
                Open Settings →
              </button>
            )}
          </div>
        ) : (
          <>
            <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col gap-5 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center my-auto py-10 px-4 text-center max-w-4xl mx-auto animate-[fadeIn_0.3s_ease] w-full">
              <div className="mb-3.5 flex items-center justify-center">
                <KirokuSeal className="h-12 w-12 text-base" />
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl italic font-normal tracking-tight text-text-primary mb-1.5">
                {getGreeting()}, {firstName}
              </h2>

              <p className="text-[13px] text-text-secondary leading-relaxed mb-8 max-w-md">
                Natural language intelligence for your ledger, watchlist, and subscriptions.
              </p>

              <div className="grid grid-cols-4 max-xl:grid-cols-2 max-sm:grid-cols-1 gap-3 w-full">
                {SUGGESTED_PROMPTS.map((prompt, idx) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt.text)}
                      className="flex flex-col items-start gap-1 p-3 rounded-xl border border-border-subtle bg-bg-primary/40 hover:bg-bg-primary hover:border-text-primary/30 transition-all text-left cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-text-muted group-hover:text-text-primary transition-colors">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{prompt.label}</span>
                      </div>
                      <span className="text-[12px] font-medium text-text-secondary group-hover:text-text-primary line-clamp-2 leading-snug transition-colors">
                        &ldquo;{prompt.text}&rdquo;
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 max-w-5xl w-full mx-auto pb-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex w-full ${
                    msg.sender === "user"
                      ? "justify-end"
                      : msg.sender === "system"
                      ? "justify-center"
                      : "justify-start"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <div className="max-w-[75%] max-sm:max-w-[85%] px-4.5 py-2.5 rounded-2xl rounded-br-xs bg-text-primary text-bg-primary shadow-xs">
                      <p className="text-[13.5px] sm:text-[14px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className="text-[10px] text-bg-primary/60 text-right mt-1 font-mono">
                        {msg.timestamp}
                      </div>
                    </div>
                  ) : msg.sender === "system" ? (
                    <div className="max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-center text-xs font-medium text-rose-600 dark:text-rose-400">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 max-w-[85%] max-sm:max-w-[90%]">
                      <KirokuSeal className="h-7 w-7 text-xs shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="rounded-2xl rounded-tl-xs border border-border-subtle/80 bg-bg-primary/60 px-5 py-3.5 text-text-primary shadow-xs">
                          {renderMarkdown(msg.text)}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-text-muted px-1 font-mono">
                          <span>{msg.timestamp}</span>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msg.id, msg.text)}
                            className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className="h-3 w-3 text-rose-500 animate-pulse" />
                                <span className="text-rose-500">Stop</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3 w-3" />
                                <span>Speak</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-3 max-w-[85%]">
                  <KirokuSeal className="h-7 w-7 text-xs shrink-0 mt-0.5" />
                  <div className="rounded-2xl rounded-tl-xs border border-border-subtle/80 bg-bg-primary/60 px-4 py-3 text-text-muted flex items-center gap-2 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-text-secondary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-xs font-serif italic text-text-muted ml-1">Thinking…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="border-t border-border-subtle bg-bg-card/90 backdrop-blur-md p-3 sm:p-4">
          <div className="max-w-5xl mx-auto flex flex-col gap-1.5">
            <div className="relative flex items-center gap-2 rounded-2xl sm:rounded-full border border-border-subtle bg-bg-primary px-3.5 py-1.5 focus-within:border-border-hover focus-within:ring-1 focus-within:ring-text-primary/10 transition-all shadow-inner">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={handleInputResize}
                onKeyDown={handleKeyDown}
                disabled={loading || !idToken}
                placeholder={!idToken ? "Sign in to query Kiroku..." : "Ask Kiroku about expenses, watchlist, subscriptions..."}
                className="flex-1 min-w-0 bg-transparent border-none text-[13.5px] sm:text-[14px] text-text-primary placeholder:text-text-muted outline-none resize-none px-1 py-1 leading-relaxed max-h-[120px]"
              />

              <div className="flex items-center gap-1.5 shrink-0 self-end pb-0.5">
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  title={isListening ? "Listening... click to stop" : "Voice input"}
                  className={`shrink-0 flex h-8 w-8 min-w-[32px] min-h-[32px] aspect-square p-0 items-center justify-center rounded-full transition-all cursor-pointer ${
                    isListening
                      ? "bg-rose-500/20 text-rose-600 animate-pulse"
                      : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                  }`}
                >
                  <Mic className="h-4 w-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim() || !idToken}
                  aria-label="Send message"
                  className={`shrink-0 flex h-8 w-8 min-w-[32px] min-h-[32px] aspect-square p-0 items-center justify-center rounded-full transition-all ${
                    !input.trim() || loading || !idToken
                      ? "bg-bg-secondary text-text-muted cursor-not-allowed opacity-50"
                      : "bg-text-primary text-bg-primary shadow-xs hover:opacity-90 active:scale-95 cursor-pointer"
                  }`}
                >
                  {loading ? (
                    <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-2 text-[10.5px] text-text-muted font-mono">
              <span className="truncate">Kiroku • 自然言語アシスタント</span>
            </div>
          </div>
        </footer>
          </>
        )}
      </div>
    </div>
  );
}
