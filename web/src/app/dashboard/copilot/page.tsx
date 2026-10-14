"use client";

import React from "react";
import { CitationBadge } from "@/features/copilot/CitationBadge";
import { Sparkles, Bot, User, Send, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CopilotPage() {
  const sampleCitations = [
    {
      doc_code: "SCH-IMAJIN-04",
      clause: "WBS Section 1.2",
      title: "Master Manufacturing Schedule Rev 3",
      excerpt: "Upstream plate delivery variance logged at +2.0 days."
    },
    {
      doc_code: "SOP-PROD-02",
      clause: "Section 4.1 (Bottleneck Remediation)",
      title: "Standard Operating Procedure CNC Milling",
      excerpt: "When spindle utilization exceeds 90%, load balancing to Cell B is required."
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-[#2563eb] uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Decision Intelligence · Grounded RAG</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#101e30] tracking-tight">
            Manufacturing AI Copilot Console
          </h1>
          <p className="text-xs sm:text-sm text-[#536780]">
            Deterministic reasoning grounded in indexed manufacturing SOPs, AS9100 standards, and IRoom telemetry.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-3.5 py-2 bg-white hover:bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
        >
          ← Back to Cockpit
        </Link>
      </div>

      {/* Main Chat Interface Window */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-xl overflow-hidden flex flex-col h-[680px]">
        {/* Chat Console Topbar */}
        <div className="p-4 sm:p-5 border-b border-[#e2eaf3] bg-[#f8fafc] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] flex items-center justify-center font-bold text-white shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-[#101e30] flex items-center gap-2">
                <span>AI Manufacturing Copilot (v1.0)</span>
                <span className="px-2 py-0.5 bg-[#dcfce7] text-[#15803d] text-[10px] font-bold rounded-full border border-[#86efac]">
                  Grounded & Anti-Hallucination
                </span>
              </div>
              <div className="text-xs text-[#64748b]">
                Active Context: <strong>Operations Manager</strong> · Knowledge Base: 4 Verified SOPs Indexed
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#059669] font-bold bg-[#ecfdf5] border border-[#a7f3d0] px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            <span>Citation Verification Active</span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#f8fafc]/50">
          {/* User Query */}
          <div className="flex gap-3 text-xs sm:text-sm items-start flex-row-reverse">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white bg-[#102238] shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <div className="max-w-[75%] p-4 rounded-2xl bg-[#2563eb] text-white rounded-tr-sm shadow-md">
              <p className="font-medium text-xs sm:text-[13px] leading-relaxed">
                Bagaimana analisis dan rekomendasi tindakan untuk mitigasi deviasi keterlambatan pada WBS-1.2 CNC Rough Machining?
              </p>
              <div className="text-[10px] mt-2 text-blue-100 text-right">09:12 AM · Operations Manager</div>
            </div>
          </div>

          {/* AI Grounded Response */}
          <div className="flex gap-3 text-xs sm:text-sm items-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white bg-[#2563eb] shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[85%] p-5 rounded-2xl bg-white text-[#101e30] border border-[#e2eaf3] rounded-tl-sm shadow-lg space-y-4">
              <div>
                <div className="font-extrabold text-[13px] text-[#1e293b] mb-1">
                  AI Decision Intelligence Brief · WBS-1.2 Delay Risk Assessment
                </div>
                <p className="text-xs sm:text-[13px] text-[#334155] leading-relaxed">
                  Berdasarkan telemetri IRoom System dan data jadwal master yang dinormalisasi:
                  <br /><br />
                  Aktivitas <strong>WBS-1.2 (CNC Rough Machining Cell A)</strong> memiliki probabilitas deviasi keterlambatan sebesar <strong>72% (Kategori Tinggi)</strong>. Deviasi ini dipicu oleh akumulasi variansi +2 hari di jalur kritis dan ketahanan bahan baku <strong>Alloy AL7075-T6</strong> yang tersisa 36 jam.
                  <br /><br />
                  <strong>Rekomendasi Tindakan Terprioritas:</strong>
                  <br />
                  1. Otorisasi pergeseran jam kerja lembur operator (overtime) 3.5 jam untuk mengejar deviasi 2 hari pada Cell A.
                  <br />
                  2. Konfirmasi SLA pengiriman pelat baku darurat melalui <code>PO-2026-IMJ-0891</code> sebelum siklus pemotongan kedua dimulai.
                </p>
              </div>

              {/* Citations Block */}
              <div className="pt-3 border-t border-[#f1f5f9] space-y-2.5">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[11px] text-[#64748b] font-bold">
                    Official Document Citations:
                  </span>
                  {sampleCitations.map((cite, i) => (
                    <CitationBadge key={`${cite.doc_code}-${i}`} citation={cite} />
                  ))}
                </div>

                {/* Grounded & Review Action Bar */}
                <div className="flex items-center justify-between bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                    <span className="text-xs text-[#15803d] font-bold">
                      Grounded Verification Confirmed (94% Model Confidence)
                    </span>
                  </div>

                  <Link
                    href="/dashboard"
                    className="px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Review action →</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="text-[10px] text-[#94a3b8] text-right">09:12 AM · Calibrated AI Engine</div>
            </div>
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-[#e2eaf3] bg-white">
          <form className="flex gap-2">
            <input
              type="text"
              placeholder="Ask about shop-floor risks, SOP clauses, or machine telemetry..."
              className="flex-1 text-xs px-4 py-2.5 border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              defaultValue="What should I address first today?"
            />
            <button
              type="button"
              className="px-4 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="text-[10px] text-[#94a3b8] mt-2 text-center">
            Grounded responses strictly cross-reference indexed operational documentation and live IRoom telemetry.
          </div>
        </div>
      </div>
    </div>
  );
}
