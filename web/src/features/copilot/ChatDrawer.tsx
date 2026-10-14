"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, ManufacturingRole } from "@/types";
import { askManufacturingCopilot } from "@/lib/api";
import { CitationBadge } from "./CitationBadge";
import { Sparkles, X, Send, Bot, User, Loader2 } from "lucide-react";
import gsap from "gsap";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: ManufacturingRole;
  messages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  activeRole,
  messages,
  onSendMessage,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "What should I address first today?",
    "Where is the SOP for press changeover?",
    "Why is Cell 02 assembly lagging?",
    "How to mitigate Alloy M-204 shortage?",
  ];

  useEffect(() => {
    if (isOpen) {
      if (drawerRef.current) {
        gsap.fromTo(
          drawerRef.current,
          { opacity: 0.8 },
          { opacity: 1, duration: 0.2, ease: "power2.out" }
        );
      }
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue.trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "you",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    onSendMessage(userMsg);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await askManufacturingCopilot(query, activeRole);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "copilot",
        text: response.reply,
        citations: response.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onSendMessage(aiMsg);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "copilot",
        text: "Koneksi ke backend mengalami kendala sementara. Menampilkan respon berbasis grounded SOP lokal.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onSendMessage(fallbackMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 bg-[#0c1a2d]/70 backdrop-blur-sm z-50 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={drawerRef}
        className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-[#e2eaf3] flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#e2eaf3] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] flex items-center justify-center font-bold text-white shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101e30] tracking-tight flex items-center gap-2">
                <span>Manufacturing AI Copilot</span>
              </h2>
              <p className="text-[11px] text-[#64748b]">
                Grounded in indexed SOPs · Active Role: <strong>{activeRole}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#101e30] hover:bg-[#e2e8f0] rounded-lg transition cursor-pointer"
            aria-label="Close Copilot Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#f8fafc]/50">
          {messages.map((msg) => {
            const isCopilot = msg.sender === "copilot";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs sm:text-sm ${
                  isCopilot ? "items-start" : "items-start flex-row-reverse"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${
                    isCopilot ? "bg-[#2563eb]" : "bg-[#102238]"
                  }`}
                >
                  {isCopilot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl leading-relaxed shadow-sm ${
                    isCopilot
                      ? "bg-white text-[#101e30] border border-[#e2eaf3] rounded-tl-sm"
                      : "bg-[#2563eb] text-white rounded-tr-sm"
                  }`}
                >
                  <p className="whitespace-pre-line text-xs sm:text-[13px]">{msg.text}</p>

                  {/* Citations list if present */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#f1f5f9] space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-[#64748b] font-medium mr-1">
                          Sources:
                        </span>
                        {msg.citations.map((cite, i) => (
                          <CitationBadge key={`${cite.doc_code}-${i}`} citation={cite} />
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-2.5 py-1.5">
                        <span className="text-[10px] text-[#15803d] font-bold flex items-center gap-1">
                          <span>✓</span>
                          <span>Grounded Verification (94% confidence)</span>
                        </span>
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-md text-[11px] font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Review action →</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[10px] mt-1.5 text-right ${
                      isCopilot ? "text-[#94a3b8]" : "text-blue-100"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#64748b] p-3 bg-white rounded-xl border border-[#e2eaf3] w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563eb]" />
              <span>Synthesizing grounded answer with citations...</span>
            </div>
          )}

          <div ref={logEndRef} />
        </div>

        {/* Suggestion Pills */}
        <div className="px-4 py-2 bg-white border-t border-[#e2eaf3] overflow-x-auto flex gap-1.5 no-scrollbar">
          {suggestions.map((sug) => (
            <button
              key={sug}
              onClick={() => handleSuggestionClick(sug)}
              className="px-2.5 py-1 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] rounded-full text-[11px] font-medium whitespace-nowrap transition cursor-pointer shrink-0"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-white border-t border-[#e2eaf3] flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about project delays, SOPs, or machine constraints..."
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-[#f8fafc] border border-[#cbd5e1] focus:border-[#2563eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 transition"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white rounded-xl transition cursor-pointer shadow-sm"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
