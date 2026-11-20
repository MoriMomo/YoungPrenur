"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, CopilotStatus, ManufacturingRole } from "@/types";
import { CitationBadge } from "./CitationBadge";
import { usePageMotion } from "@/lib/usePageMotion";
import { Send, Loader2, RotateCcw, X, ArrowRight, AlertTriangle } from "lucide-react";

const STARTER_PROMPTS = [
  "What needs attention first today?",
  "Summarize current schedule risks and bottlenecks",
  "Which SOP covers press vibration limits?",
  "Explain the procurement rule for low stock cover",
];

interface CopilotThreadProps {
  activeRole: ManufacturingRole;
  messages: ChatMessage[];
  isLoading: boolean;
  isApiLive: boolean;
  copilotStatus: CopilotStatus;
  onSendQuery: (query: string) => Promise<void>;
  onClearChat: () => void;
  onReviewPendingAction?: () => void;
  compact?: boolean;
  headerTitle?: string;
  onClose?: () => void;
}

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedReply({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }

    const ordered = /^\d+\.\s+/.test(trimmed);
    const listRegex = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
    if (listRegex.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && listRegex.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(listRegex, ""));
        i++;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag
          key={`list-${i}`}
          className={`${ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1 text-sm text-ink-2`}
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {renderInlineBold(item)}
            </li>
          ))}
        </Tag>
      );
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-ink">
        {renderInlineBold(paraLines.join(" "))}
      </p>
    );
  }

  return <div className="space-y-2.5">{blocks}</div>;
}

/** Shared certificate-style Copilot transcript and composer used on /dashboard/copilot and ChatDrawer. */
export const CopilotThread: React.FC<CopilotThreadProps> = ({
  activeRole,
  messages,
  isLoading,
  isApiLive,
  copilotStatus,
  onSendQuery,
  onClearChat,
  onReviewPendingAction,
  compact = false,
  headerTitle,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  usePageMotion(messagesRef, {
    triggerKey: messages.length,
    selector: '[data-gsap="latest-msg"]',
    y: 8,
    skipInitial: true,
  });

  useEffect(() => {
    const list = messagesRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query || isLoading) return;
    setInputValue("");
    await onSendQuery(query);
  };

  const isGeminiActive = isApiLive && copilotStatus.llm_configured;
  const statusText = isGeminiActive
    ? `${copilotStatus.model || "Gemini 2.5 Flash"} · ${copilotStatus.indexed_sops} SOPs · ${activeRole}`
    : isApiLive
      ? `SOP retrieval · ${copilotStatus.indexed_sops} SOPs · ${activeRole}`
      : `Offline SOP index · ${copilotStatus.indexed_sops} SOPs · ${activeRole}`;

  const latestCopilotIdx = messages.reduce(
    (acc, m, idx) => (m.sender === "copilot" ? idx : acc),
    -1
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-sheet">
      {/* Quiet ruled status strip */}
      <div className="flex items-center justify-between gap-3 border-b border-rule-strong bg-paper px-4 py-2.5 sm:px-5">
        <div className="min-w-0">
          {headerTitle && (
            <h2 className="font-display text-lg font-bold leading-tight text-ink">
              {headerTitle}
            </h2>
          )}
          <div className="flex items-center gap-2 text-xs text-ink-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${isGeminiActive ? "bg-pass" : "bg-warn"}`}
              aria-hidden="true"
            />
            <span className="truncate">{statusText}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              disabled={isLoading}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-rule-strong bg-sheet px-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-sheet-sunk hover:text-ink disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.6} />
              <span>New chat</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-2 transition-colors hover:bg-sheet-sunk hover:text-ink cursor-pointer"
              aria-label="Close Copilot drawer"
            >
              <X className="h-4 w-4" strokeWidth={1.6} />
            </button>
          )}
        </div>
      </div>

      {/* Transcript / Empty State */}
      <div
        ref={messagesRef}
        className={`flex-1 overflow-y-auto ${compact ? "p-4" : "p-5 sm:p-6"}`}
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col justify-center py-6">
            <div className="space-y-1.5 mb-5">
              <h2 className="font-display text-2xl font-bold leading-tight text-ink">
                Ask about schedules, streams, or SOP clauses
              </h2>
              <p className="text-xs sm:text-sm text-ink-2">
                Grounded in indexed SOP documents and live plant records
              </p>
            </div>

            <div className={`grid gap-2.5 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isLoading}
                  onClick={() => void onSendQuery(prompt)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-rule-strong bg-paper px-3.5 py-3 text-left text-xs sm:text-sm font-medium text-ink transition-colors hover:border-stamp hover:bg-sheet-sunk disabled:opacity-50 cursor-pointer"
                >
                  <span className="leading-snug">{prompt}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.6} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg, idx) => {
              const isCopilot = msg.sender === "copilot";
              const isLatest = idx === messages.length - 1;
              if (!isCopilot) {
                return (
                  <div
                    key={msg.id}
                    data-gsap={isLatest ? "latest-msg" : undefined}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] space-y-1 rounded-lg border border-rule-strong bg-paper px-4 py-2.5">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
                        {msg.text}
                      </p>
                      <div className="text-right font-mono-numbers text-xs text-ink-3">
                        You · {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <article
                  key={msg.id}
                  data-gsap={isLatest ? "latest-msg" : undefined}
                  className="space-y-3 border-b border-rule-soft pb-5 last:border-b-0 last:pb-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
                    <span className="font-medium text-ink-2">
                      MDIP Copilot · {msg.llmEnhanced ? msg.model || "Gemini 2.5 Flash" : "SOP retrieval"}
                    </span>
                    <span className="font-mono-numbers">{msg.timestamp}</span>
                  </div>

                  {msg.llmError && (
                    <div className="flex items-center gap-2 rounded-md border border-warn-line bg-warn-wash px-3 py-2 text-xs text-warn">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                      <span>Gemini fallback used: {msg.llmError}</span>
                    </div>
                  )}

                  <FormattedReply text={msg.text} />

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-ink-3">Citations</span>
                      {msg.citations.map((cite, i) => (
                        <CitationBadge key={`${cite.doc_code}-${i}`} citation={cite} />
                      ))}
                    </div>
                  )}

                  {idx === latestCopilotIdx && onReviewPendingAction && (
                    <div>
                      <button
                        type="button"
                        onClick={onReviewPendingAction}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-stamp transition-colors hover:text-stamp-deep hover:underline cursor-pointer"
                      >
                        <span>Review pending action</span>
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}

            {isLoading && (
              <div className="inline-flex items-center gap-2 rounded-md border border-rule-strong bg-paper px-3 py-2 text-xs text-ink-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-stamp" strokeWidth={1.6} />
                <span>
                  {isGeminiActive
                    ? "Synthesizing grounded answer with Gemini…"
                    : "Searching indexed SOP clauses…"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified composer */}
      <form onSubmit={handleSubmit} className="border-t border-rule-strong bg-sheet p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-lg border border-rule-strong bg-paper px-3 py-1.5 focus-within:border-stamp focus-within:ring-2 focus-within:ring-stamp/20">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about shop-floor risks, SOP clauses, or WBS slippage"
            className="flex-1 bg-transparent py-1 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-stamp px-3 text-xs font-medium text-sheet transition-colors hover:bg-stamp-deep disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
        </div>
      </form>
    </div>
  );
};
