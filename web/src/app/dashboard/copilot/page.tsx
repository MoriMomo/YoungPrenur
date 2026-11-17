"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useDashboard } from "../layout";
import { CitationBadge } from "@/features/copilot/CitationBadge";
import { MessageSquareText, Bot, User, Send, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

const QUICK_PROMPTS = [
  "What should I address first today?",
  "How to mitigate Alloy M-204 shortage?",
  "Where is the SOP for press changeover?",
  "Why is Cell 02 assembly lagging?",
];

export default function CopilotPage() {
  const {
    selectedRole,
    chatMessages,
    isChatLoading,
    sendChatQuery,
    actions,
    setReviewingAction,
  } = useDashboard();

  const [inputValue, setInputValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query || isChatLoading) return;
    setInputValue("");
    await sendChatQuery(query);
  };

  const nextPendingAction = actions.find((a) => !a.flagged) || actions[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#2563eb] mb-1 flex items-center gap-1.5">
            <MessageSquareText className="w-3.5 h-3.5" />
            <span>Grounded RAG Copilot Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#101e30] tracking-tight">
            Manufacturing AI Copilot Console
          </h1>
          <p className="text-xs sm:text-sm text-[#536780]">
            Retrieves answers strictly from the 4 indexed SOP documents and simulated IRoom telemetry with clickable clause citations.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-3.5 py-2 bg-white hover:bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] rounded-xl text-xs sm:text-sm font-semibold transition-colors self-start sm:self-auto"
        >
          ← Back to Cockpit
        </Link>
      </div>

      <div className="bg-white border border-[#e2eaf3] rounded-2xl overflow-hidden flex flex-col h-[640px]">
        {/* Topbar */}
        <div className="p-4 sm:p-5 border-b border-[#e2eaf3] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0c1a2d] flex items-center justify-center text-white">
              <MessageSquareText className="w-5 h-5 text-[#60a5fa]" />
            </div>
            <div>
              <div className="font-semibold text-sm text-[#111827] flex items-center gap-2">
                <span>MDIP Copilot (TRL 4 Prototype)</span>
                <span className="px-2 py-0.5 bg-[#f0fdf4] text-[#16a34a] text-[11px] font-medium rounded border border-[#bbf7d0]">
                  Grounded Retrieval
                </span>
              </div>
              <div className="text-xs text-[#64748b]">
                Active Role: <span className="font-medium text-[#111827]">{selectedRole}</span> · 4 Indexed SOPs
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#0d9263] font-semibold bg-[#e6f7f0] border border-[#a7f3d0] px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Citation Verification Active</span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8fafc]/50">
          {chatMessages.map((msg) => {
            const isCopilot = msg.sender === "copilot";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-sm items-start ${
                  isCopilot ? "" : "flex-row-reverse"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                    isCopilot ? "bg-[#2563eb]" : "bg-[#0c1a2d]"
                  }`}
                >
                  {isCopilot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div
                  className={`max-w-[82%] p-4 rounded-2xl space-y-3 ${
                    isCopilot
                      ? "bg-white text-[#101e30] border border-[#e2eaf3] rounded-tl-sm"
                      : "bg-[#2563eb] text-white rounded-tr-sm"
                  }`}
                >
                  <p className="whitespace-pre-line text-xs sm:text-[13px] leading-relaxed">
                    {msg.text}
                  </p>

                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-3 border-t border-[#f1f5f9] space-y-2.5">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[11px] text-[#64748b] font-medium">
                          Official Citations:
                        </span>
                        {msg.citations.map((cite, i) => (
                          <CitationBadge key={`${cite.doc_code}-${i}`} citation={cite} />
                        ))}
                      </div>

                      {nextPendingAction && (
                        <div className="flex items-center justify-between bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-2.5">
                          <span className="text-xs text-[#15803d] font-semibold">
                            Verify or override action in HITL queue
                          </span>
                          <button
                            type="button"
                            onClick={() => setReviewingAction(nextPendingAction)}
                            className="px-3 py-1.5 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Review action</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[10px] text-right ${
                      isCopilot ? "text-[#94a3b8]" : "text-blue-100"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isChatLoading && (
            <div className="flex items-center gap-2 text-xs text-[#64748b] p-3 bg-white rounded-xl border border-[#e2eaf3] w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563eb]" />
              <span>Searching indexed SOP clauses...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-4 py-2 border-t border-[#e2eaf3] bg-white flex gap-2 overflow-x-auto">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void sendChatQuery(q)}
              className="px-3 py-1 rounded-lg bg-[#f1f5f9] hover:bg-[#e2e8f0] text-xs font-medium text-[#334155] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-[#e2eaf3] bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about shop-floor risks, SOP clauses, or WBS slippage"
              className="flex-1 text-xs sm:text-sm px-4 py-2.5 border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isChatLoading}
              className="px-4 py-2.5 bg-[#111827] hover:bg-[#1f2937] disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
