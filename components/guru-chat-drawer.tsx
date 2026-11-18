"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowsClockwise,
  ArrowSquareOut,
  ChatCircleDots,
  CheckCircle,
  ClockCounterClockwise,
  Flask,
  PaperPlaneRight,
  Pill,
  ShieldCheck,
  Sparkle,
  Stop,
  Warning,
  WarningOctagon,
  X,
} from "@phosphor-icons/react";

import { MarkdownContent } from "@/components/markdown-content";
import { cn } from "@/lib/utils";
import type { EducationalInteraction } from "@/lib/schemas";

export const MEDICAL_ADVISORY_DISCLAIMER =
  "Consult your prescribing physician or pharmacist before modifying any medication schedule.";

export interface GuruProductContext {
  productName?: string;
  purityScore?: number;
  summary?: string;
  ingredients?: Array<{
    name: string;
    normalisedName?: string;
    riskLevel?: "low" | "moderate" | "high";
    allergenConflict?: boolean;
  }>;
  allergenAlert?: {
    hasConflict: boolean;
    conflictingAllergens: string[];
  };
}

export interface ToolBadgeInfo {
  toolCallId: string;
  toolName: string;
  activeLabel: string;
  completedLabel: string;
  status: "running" | "done" | "error";
}

interface ToolMeta {
  activeLabel: string;
  completedLabel: string;
}

const TOOL_STATUS_META: Record<string, ToolMeta> = {
  searchIngredientToxicology: {
    activeLabel: "Consulting toxicology monographs...",
    completedLabel: "Toxicology monographs consulted",
  },
  checkPersonalCompatibility: {
    activeLabel: "Checking allergy profile...",
    completedLabel: "Allergy profile checked",
  },
  findCleanSwaps: {
    activeLabel: "Scanning cleaner swaps...",
    completedLabel: "Cleaner swaps scanned",
  },
  getUserScanHistory: {
    activeLabel: "Reviewing scan history...",
    completedLabel: "Scan history reviewed",
  },
};

const PHARMACEUTICAL_DETECTION_PATTERN =
  /\b(medication|pharmacist|prescribing physician|drug[\s-]interaction|food[\s-]drug|cyp3a4|cyp2c9|warfarin|statin|atorvastatin|simvastatin|metformin|levothyroxine|ibuprofen|acetaminophen|paracetamol|aspirin|antibiotic|excipient|grapefruit|tyramine|maoi|anticoagulant|pharmaceutical|dosage|prescription)\b/i;

export function hasPharmaceuticalContent(text: string): boolean {
  if (!text.trim()) return false;
  return (
    text.includes(MEDICAL_ADVISORY_DISCLAIMER) ||
    text.toLowerCase().includes("consult your prescribing physician or pharmacist") ||
    PHARMACEUTICAL_DETECTION_PATTERN.test(text)
  );
}

export function extractTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is Extract<UIMessage["parts"][number], { type: "text" }> =>
        part.type === "text" && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("");
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractToolBadgesFromMessage(message: UIMessage): ToolBadgeInfo[] {
  const badges: ToolBadgeInfo[] = [];

  for (let i = 0; i < message.parts.length; i += 1) {
    const part: unknown = message.parts[i];
    if (!isObjectRecord(part) || typeof part.type !== "string") continue;

    let toolName: string | null = null;
    if (part.type === "dynamic-tool" && typeof part.toolName === "string") {
      toolName = part.toolName;
    } else if (part.type.startsWith("tool-")) {
      toolName = part.type.slice(5);
    }

    if (!toolName) continue;

    const toolCallId =
      typeof part.toolCallId === "string" ? part.toolCallId : `${message.id}-tool-${i}`;
    const state = typeof part.state === "string" ? part.state : "input-available";

    const status: ToolBadgeInfo["status"] =
      state === "output-available"
        ? "done"
        : state === "output-error"
        ? "error"
        : "running";

    const meta = TOOL_STATUS_META[toolName] ?? {
      activeLabel: `Running ${toolName}...`,
      completedLabel: `${toolName} complete`,
    };

    badges.push({
      toolCallId,
      toolName,
      activeLabel: meta.activeLabel,
      completedLabel: meta.completedLabel,
      status,
    });
  }

  return badges;
}

function renderToolIcon(toolName: string, status: ToolBadgeInfo["status"]) {
  if (status === "done") {
    return <CheckCircle size={13} weight="fill" className="text-emerald-400 shrink-0" />;
  }
  if (status === "error") {
    return <Warning size={13} weight="fill" className="text-amber-400 shrink-0" />;
  }

  switch (toolName) {
    case "searchIngredientToxicology":
      return <Flask size={13} className="text-emerald-400 shrink-0" />;
    case "checkPersonalCompatibility":
      return <ShieldCheck size={13} className="text-emerald-400 shrink-0" />;
    case "findCleanSwaps":
      return <ArrowsClockwise size={13} className="text-emerald-400 shrink-0" />;
    case "getUserScanHistory":
      return <ClockCounterClockwise size={13} className="text-emerald-400 shrink-0" />;
    default:
      return <Sparkle size={13} className="text-emerald-400 shrink-0" />;
  }
}

export function GuruToolExecutionBadge({ badge }: { badge: ToolBadgeInfo }) {
  const isRunning = badge.status === "running";
  const label = isRunning ? badge.activeLabel : badge.completedLabel;

  return (
    <div
      data-testid={`tool-badge-${badge.toolName}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        isRunning
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : badge.status === "error"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-white/10 bg-zinc-900/80 text-zinc-400"
      )}
    >
      {isRunning && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
        />
      )}
      {renderToolIcon(badge.toolName, badge.status)}
      <span>{label}</span>
    </div>
  );
}

export interface EducationalInteractionCardProps {
  interaction?: EducationalInteraction;
  content?: string;
  className?: string;
}

export function EducationalInteractionCard({
  interaction,
  content,
  className,
}: EducationalInteractionCardProps) {
  const disclaimerText = interaction?.advisoryDisclaimer?.trim() || MEDICAL_ADVISORY_DISCLAIMER;

  const cleanedBody = useMemo(() => {
    if (!content) return "";
    return content
      .replace(MEDICAL_ADVISORY_DISCLAIMER, "")
      .replace(/Consult your prescribing physician or pharmacist before modifying any medication schedule\.?/gi, "")
      .trim();
  }, [content]);

  return (
    <section
      data-testid="educational-interaction-card"
      aria-label="Educational pharmaceutical interaction card"
      className={cn(
        "rounded-2xl border border-amber-500/30 bg-zinc-900/90 overflow-hidden shadow-[0_0_24px_-12px_rgba(245,158,11,0.35)]",
        className
      )}
    >
      {/* Card Header */}
      <div className="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Pill size={14} weight="fill" className="text-amber-300" aria-hidden="true" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200">
            Educational Interaction Reference
          </span>
        </div>

        {interaction && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-zinc-950/80 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
              {interaction.drugName}
            </span>
            <span className="text-[10px] text-amber-300/70 font-semibold">+</span>
            <span className="rounded-full bg-zinc-950/80 border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-200">
              {interaction.foodOrSubstance}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3 text-sm text-zinc-200 leading-relaxed">
        {interaction ? (
          <>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Biochemical Mechanism
              </p>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {interaction.mechanism}
              </p>
            </div>
            <div className="space-y-1 border-t border-white/5 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Clinical Observation
              </p>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {interaction.clinicalObservation}
              </p>
            </div>
          </>
        ) : (
          cleanedBody && <MarkdownContent content={cleanedBody} />
        )}

        {/* Mandatory Prominent Medical Advisory Disclaimer */}
        <div
          role="note"
          data-testid="medical-advisory-disclaimer"
          className="rounded-xl border border-amber-500/40 bg-amber-950/50 px-3.5 py-3 flex items-start gap-2.5"
        >
          <WarningOctagon
            size={18}
            weight="fill"
            className="text-amber-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
              Medical Advisory Disclaimer
            </p>
            <p className="text-xs font-semibold text-amber-100 leading-relaxed">
              {disclaimerText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export interface GuruMessageListProps {
  messages: UIMessage[];
  isStreaming?: boolean;
  className?: string;
}

export function GuruMessageList({ messages, isStreaming = false, className }: GuruMessageListProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {messages.map((message) => {
        const isUser = message.role === "user";
        const text = extractTextFromMessage(message);
        const toolBadges = isUser ? [] : extractToolBadgesFromMessage(message);
        const isPharmaAdvisory = !isUser && hasPharmaceuticalContent(text);

        if (isUser) {
          return (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-600/20 border border-emerald-500/30 px-4 py-3 text-xs sm:text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                {text}
              </div>
            </div>
          );
        }

        return (
          <div key={message.id} className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkle size={14} weight="fill" className="text-emerald-400" aria-hidden="true" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {toolBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Tool execution status">
                  {toolBadges.map((badge) => (
                    <GuruToolExecutionBadge key={badge.toolCallId} badge={badge} />
                  ))}
                </div>
              )}

              {isPharmaAdvisory ? (
                <EducationalInteractionCard content={text} />
              ) : text ? (
                <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-zinc-900/70 px-4 py-3">
                  <MarkdownContent content={text} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {isStreaming && (
        <div className="flex items-center gap-2 pl-9 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.1s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
          </span>
          <span>Health Guru is synthesizing evidence...</span>
        </div>
      )}
    </div>
  );
}

export interface GuruChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  productContext?: GuruProductContext | null;
  initialPrompt?: string;
  sessionId?: string;
  initialMessages?: UIMessage[];
}

export function GuruChatDrawer({
  isOpen,
  onClose,
  productContext = null,
  initialPrompt = "",
  sessionId,
  initialMessages,
}: GuruChatDrawerProps) {
  const [draft, setDraft] = useState<{ seed: string; value: string }>({
    seed: initialPrompt,
    value: initialPrompt,
  });
  const inputValue = draft.seed === initialPrompt ? draft.value : initialPrompt;
  const setInputValue = (value: string) => {
    setDraft({ seed: initialPrompt, value });
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/guru",
      }),
    []
  );

  const { messages, sendMessage, status, error, stop, clearError } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (!isOpen) {
    return null;
  }

  const productLabel = productContext?.productName?.trim() || "this product";
  const contextualPrompts = productContext
    ? [
        `Are any ingredients in ${productLabel} concerning for my allergy profile?`,
        `Suggest cleaner swaps for ${productLabel} without high-risk additives.`,
        `Could any additives in ${productLabel} interact with common medications?`,
      ]
    : [
        "Explain the safety profile of Sodium Benzoate (E211).",
        "How does grapefruit juice interact with statin medications?",
        "Review my recent scans for high-risk additives.",
      ];

  const handleDispatchPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isStreaming) return;
    clearError();
    setInputValue("");
    await sendMessage(
      { text: trimmed },
      {
        body: {
          ...(sessionId ? { sessionId } : {}),
          ...(productContext ? { productContext } : {}),
        },
      }
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleDispatchPrompt(inputValue);
  };

  const handleTextareaKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleDispatchPrompt(inputValue);
    }
  };

  const flaggedIngredients =
    productContext?.ingredients
      ?.filter((ing) => ing.allergenConflict || ing.riskLevel === "high")
      .slice(0, 4) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Health Guru drawer backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-sm cursor-default"
      />

      {/* Slide-Over Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Decode Health Guru"
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-zinc-950 text-zinc-50 shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-900/50 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Sparkle size={18} weight="fill" className="text-emerald-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-tight truncate">
                Decode Health Guru
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                Toxicology, Nutrition &amp; Food-Drug Advisory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href="/guru"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <span>Full View</span>
              <ArrowSquareOut size={13} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Health Guru drawer"
              className="w-8 h-8 rounded-full border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Active Scanned Product Context Card */}
        {productContext && (
          <div className="border-b border-white/10 bg-zinc-900/30 px-5 py-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <ChatCircleDots size={13} weight="fill" aria-hidden="true" />
                <span>Active Scan Context</span>
              </span>
              {typeof productContext.purityScore === "number" && (
                <span className="rounded-full border border-white/10 bg-zinc-950 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                  Purity: {productContext.purityScore}/10
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-white truncate">
              {productContext.productName?.trim() || "Scanned Product"}
            </p>

            {productContext.allergenAlert?.hasConflict && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-red-200">
                <WarningOctagon size={13} weight="fill" className="text-red-400" />
                <span>
                  Allergen Conflict: {productContext.allergenAlert.conflictingAllergens.join(", ")}
                </span>
              </div>
            )}

            {flaggedIngredients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {flaggedIngredients.map((ing) => (
                  <span
                    key={ing.name}
                    className="rounded-md border border-white/10 bg-zinc-950/80 px-2 py-0.5 text-[10px] text-zinc-400"
                  >
                    {ing.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Viewport */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {messages.length === 0 ? (
            <div className="space-y-4 py-4">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Sparkle size={16} weight="fill" aria-hidden="true" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Evidence-Grounded Health Consultation
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Ask about additive toxicology (EFSA/FDA monographs), personal allergen conflicts,
                  cleaner swaps, or educational food-drug interactions.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Suggested Questions
                </p>
                <div className="space-y-2">
                  {contextualPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleDispatchPrompt(prompt)}
                      className="w-full text-left rounded-xl border border-white/10 bg-zinc-900/40 hover:bg-zinc-900 hover:border-emerald-500/30 px-3.5 py-2.5 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <GuruMessageList messages={messages} isStreaming={isStreaming} />
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2.5"
            >
              <Warning size={16} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-red-200">Unable to reach Health Guru</p>
                <p className="text-red-300/90">
                  {error.message || "Please ensure you are signed in and try again."}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <footer className="border-t border-white/10 bg-zinc-900/40 p-4 space-y-2.5">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              rows={2}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={
                productContext
                  ? `Ask about ${productLabel} ingredients, swaps, or interactions...`
                  : "Ask about ingredients, allergens, or food-drug interactions..."
              }
              aria-label="Message Health Guru"
              className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label="Stop response"
                className="h-10 w-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <Stop size={16} weight="fill" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputValue.trim()}
                aria-label="Send message"
                className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-[0_0_16px_-4px_rgba(16,185,129,0.5)]"
              >
                <PaperPlaneRight size={17} weight="fill" />
              </button>
            )}
          </form>

          <p className="text-[10px] text-zinc-500 leading-snug text-center">
            {MEDICAL_ADVISORY_DISCLAIMER}
          </p>
        </footer>
      </aside>
    </div>
  );
}

export default GuruChatDrawer;
