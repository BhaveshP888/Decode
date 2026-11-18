"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowLeft,
  ChatCircleDots,
  ClockCounterClockwise,
  Flask,
  List,
  PaperPlaneRight,
  Pill,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkle,
  Stop,
  Warning,
  X,
} from "@phosphor-icons/react";

import {
  GuruMessageList,
  MEDICAL_ADVISORY_DISCLAIMER,
} from "@/components/guru-chat-drawer";

interface StoredChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface StoredChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredChatMessage[];
}

interface QuickPromptGroup {
  category: string;
  accent: string;
  icon: "nutrition" | "safety" | "pharma";
  prompts: string[];
}

const QUICK_PROMPT_GROUPS: QuickPromptGroup[] = [
  {
    category: "Nutrition & Additives",
    accent: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    icon: "nutrition",
    prompts: [
      "What do EFSA and FDA monographs say about Sodium Benzoate (E211)?",
      "Review my recent 30-day scan history and highlight recurring additives.",
      "Find cleaner cereal swaps without synthetic dyes or BHT.",
    ],
  },
  {
    category: "Ingredient Safety & Allergens",
    accent: "text-sky-400 border-sky-500/20 bg-sky-500/10",
    icon: "safety",
    prompts: [
      "Check whether whey protein isolate, soy lecithin, and maltodextrin conflict with my profile.",
      "What hidden tree nut or dairy derivatives commonly appear on snack labels?",
    ],
  },
  {
    category: "Food-Drug Interactions",
    accent: "text-amber-300 border-amber-500/25 bg-amber-500/10",
    icon: "pharma",
    prompts: [
      "How does grapefruit juice interact with statin medications like atorvastatin?",
      "Explain how vitamin K-rich leafy greens interact with warfarin therapy.",
      "What inactive pill excipients should lactose-intolerant patients watch for?",
    ],
  },
];

function mapStoredMessagesToUIMessages(stored: StoredChatMessage[]): UIMessage[] {
  return stored.map((item) => ({
    id: item.id,
    role: item.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: item.content }],
  }));
}

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HealthGuruPage() {
  const [sessions, setSessions] = useState<StoredChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/guru",
      }),
    []
  );

  const refreshSessions = async () => {
    try {
      const res = await fetch("/api/chat/guru");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions?: StoredChatSession[] };
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
    } catch {
      // Non-fatal
    }
  };

  const { messages, setMessages, sendMessage, status, error, stop, clearError } = useChat({
    transport,
    onFinish: () => {
      void refreshSessions();
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    const controller = new AbortController();

    async function loadSessions() {
      try {
        const res = await fetch("/api/chat/guru", { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { sessions?: StoredChatSession[] };
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        }
      } catch {
        // Non-fatal: allow starting fresh consultations even if unauthenticated or offline
      } finally {
        setSessionsLoading(false);
      }
    }

    loadSessions();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const handleSelectSession = (session: StoredChatSession) => {
    clearError();
    setActiveSessionId(session.id);
    setMessages(mapStoredMessagesToUIMessages(session.messages));
    setSidebarOpen(false);
  };

  const handleNewConsultation = () => {
    clearError();
    setActiveSessionId(undefined);
    setMessages([]);
    setInputValue("");
    setSidebarOpen(false);
  };

  const handleDispatchPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isStreaming) return;
    clearError();
    setInputValue("");
    await sendMessage(
      { text: trimmed },
      {
        body: activeSessionId ? { sessionId: activeSessionId } : undefined,
      }
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleDispatchPrompt(inputValue);
  };

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleDispatchPrompt(inputValue);
    }
  };

  const renderGroupIcon = (icon: QuickPromptGroup["icon"]) => {
    switch (icon) {
      case "nutrition":
        return <Flask size={14} weight="fill" aria-hidden="true" />;
      case "safety":
        return <ShieldCheck size={14} weight="fill" aria-hidden="true" />;
      case "pharma":
        return <Pill size={14} weight="fill" aria-hidden="true" />;
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          <ClockCounterClockwise size={15} className="text-emerald-400" aria-hidden="true" />
          <span>Consultations</span>
        </div>

        <button
          type="button"
          onClick={handleNewConsultation}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition-colors cursor-pointer"
        >
          <Plus size={12} weight="bold" />
          <span>New</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {sessionsLoading ? (
          <div className="space-y-2 p-2">
            <div className="h-12 rounded-xl bg-zinc-900/70 animate-pulse" />
            <div className="h-12 rounded-xl bg-zinc-900/50 animate-pulse" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 text-center space-y-1.5">
            <ChatCircleDots size={20} className="text-zinc-600 mx-auto" />
            <p className="text-xs font-medium text-zinc-400">No saved threads yet</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Your toxicology, allergen, and medication consultations appear here.
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => handleSelectSession(session)}
                className={`w-full text-left rounded-xl border px-3.5 py-2.5 transition-all cursor-pointer ${
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-white"
                    : "border-transparent bg-zinc-900/30 hover:bg-zinc-900/70 hover:border-white/10 text-zinc-300"
                }`}
              >
                <p className="text-xs font-semibold truncate">{session.title}</p>
                <div className="flex items-center justify-between gap-2 mt-1 text-[10px] text-zinc-500">
                  <span>{session.messages.length} messages</span>
                  <span>{formatSessionDate(session.updatedAt)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-white/5 space-y-1.5">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/70 transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Scanner</span>
        </Link>
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/70 transition-colors"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          <span>Health Profile &amp; Allergens</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 flex flex-col overflow-hidden">
      {/* Top Workspace Navigation */}
      <header className="h-16 shrink-0 border-b border-white/5 bg-zinc-950/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label="Toggle thread history"
            className="lg:hidden w-9 h-9 rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            {sidebarOpen ? <X size={16} /> : <List size={16} />}
          </button>

          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Sparkle size={16} weight="fill" className="text-emerald-400" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              Decode Health Guru
            </h1>
            <p className="text-[11px] text-zinc-400 truncate hidden sm:block">
              Evidence-grounded nutrition, ingredient toxicology &amp; pharmaceutical interaction advisor
            </p>
          </div>
        </div>

        <nav aria-label="Health Guru navigation" className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/70 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Scanner</span>
          </Link>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-medium text-emerald-300 transition-colors"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>Profile</span>
          </Link>
        </nav>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-white/5 bg-zinc-900/20">
          {sidebarContent}
        </aside>

        {/* Mobile Drawer Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 top-16 z-40 lg:hidden flex">
            <aside className="w-72 max-w-[82vw] bg-zinc-950 border-r border-white/10 shadow-2xl">
              {sidebarContent}
            </aside>
            <button
              type="button"
              aria-label="Close thread history overlay"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 bg-black/60 backdrop-blur-sm"
            />
          </div>
        )}

        {/* Chat Consultation Column */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950">
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
            <div className="max-w-3xl mx-auto">
              {messages.length === 0 ? (
                <div className="space-y-8 py-6">
                  <div className="space-y-3 text-center max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <Sparkle size={13} weight="fill" aria-hidden="true" />
                      <span>Personal Toxicology &amp; Wellness Advisor</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      Ask anything about what you consume.
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                      Health Guru cross-references EFSA &amp; FDA toxicology monographs, your saved
                      allergy profile, recent scan history, and biochemical food-drug interactions.
                    </p>
                  </div>

                  {/* Quick-Prompt Chips Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {QUICK_PROMPT_GROUPS.map((group) => (
                      <section
                        key={group.category}
                        className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 space-y-3"
                      >
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${group.accent}`}
                        >
                          {renderGroupIcon(group.icon)}
                          <span>{group.category}</span>
                        </div>

                        <div className="space-y-2">
                          {group.prompts.map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => handleDispatchPrompt(prompt)}
                              className="w-full text-left rounded-xl border border-white/5 bg-zinc-950/60 hover:bg-zinc-900 hover:border-emerald-500/30 px-3 py-2.5 text-xs text-zinc-300 hover:text-white leading-relaxed transition-all cursor-pointer"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              ) : (
                <GuruMessageList messages={messages} isStreaming={isStreaming} />
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300 flex items-start gap-2.5"
                >
                  <Warning size={16} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-red-200">Consultation request failed</p>
                    <p>{error.message || "Please sign in and try again."}</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Persistent Bottom Composer */}
          <div className="shrink-0 border-t border-white/5 bg-zinc-900/30 backdrop-blur-md px-4 sm:px-8 py-4">
            <div className="max-w-3xl mx-auto space-y-2.5">
              <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
                <textarea
                  rows={2}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about food additives, allergens, cleaner swaps, or food-drug interactions..."
                  aria-label="Ask Decode Health Guru"
                  className="flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
                />

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    aria-label="Stop generating"
                    className="h-12 w-12 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-100 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  >
                    <Stop size={18} weight="fill" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    aria-label="Send message"
                    className="h-12 w-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]"
                  >
                    <PaperPlaneRight size={19} weight="fill" />
                  </button>
                )}
              </form>

              <p className="text-[11px] text-zinc-500 text-center">
                {MEDICAL_ADVISORY_DISCLAIMER}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
