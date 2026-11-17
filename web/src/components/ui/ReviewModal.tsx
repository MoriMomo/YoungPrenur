"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DecisionAction } from "@/types";
import { X, CheckCircle2, ShieldAlert, UserCheck, Calendar, BookOpen, XCircle } from "lucide-react";
import gsap from "gsap";

interface ReviewModalProps {
  action: DecisionAction | null;
  onClose: () => void;
  onSubmitDecision: (
    actionId: string,
    decision: "AUTHORIZED" | "OVERRIDDEN",
    notes: string
  ) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  action,
  onClose,
  onSubmitDecision,
}) => {
  const modalBoxRef = useRef<HTMLDivElement>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && action) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [action, onClose]);

  useEffect(() => {
    if (action && modalBoxRef.current) {
      gsap.fromTo(
        modalBoxRef.current,
        { opacity: 0, scale: 0.96, y: 8 },
        { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: "power2.out" }
      );
    }
  }, [action]);

  if (!action) return null;

  const checklist = action.checklist || [
    "Confirm telemetry and physical inventory match source records",
    `Verify compliance with ${action.sourceDoc}`,
  ];

  const handleAuthorize = () => {
    setErrorMsg(null);
    onSubmitDecision(
      action.id,
      "AUTHORIZED",
      notes || "Verification checklist confirmed."
    );
    setNotes("");
    setCheckedItems({});
  };

  const handleOverride = () => {
    if (!notes.trim()) {
      setErrorMsg("Please enter an override reason (required for ISO 9001 Cl. 7.5 audit log).");
      return;
    }
    setErrorMsg(null);
    onSubmitDecision(action.id, "OVERRIDDEN", notes);
    setNotes("");
    setCheckedItems({});
  };

  return (
    <div
      className="fixed inset-0 bg-[#0c1a2d]/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div
        ref={modalBoxRef}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#e2eaf3] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#e2eaf3] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="review-modal-title" className="text-[15px] font-medium text-[#111827] truncate">
                {action.title}
              </h2>
              <span className="text-[11px] text-[#64748b]">
                Human-in-the-Loop Decision Gate (Accept or Override)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#101e30] hover:bg-[#e2e8f0] rounded-lg transition-colors cursor-pointer"
            aria-label="Close review dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div>
            <div className="text-[11px] font-semibold text-[#2563eb] mb-1">
              Operational Rationale
            </div>
            <p className="text-sm text-[#101e30] leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-[#e2eaf3]">
              {action.description}
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-[#0d9263] mb-1">
              Predicted Milestone Impact
            </div>
            <p className="text-xs font-semibold text-[#0d9263] bg-[#e6f7f0] p-3 rounded-xl border border-[#a7f3d0]">
              {action.impact}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2eaf3]">
              <div className="text-[11px] font-medium text-[#64748b] mb-0.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#2563eb]" />
                <span>Action Owner</span>
              </div>
              <div className="font-semibold text-[#101e30]">{action.owner}</div>
            </div>

            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2eaf3]">
              <div className="text-[11px] font-medium text-[#64748b] mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#d97706]" />
                <span>Due Window</span>
              </div>
              <div className="font-semibold text-[#101e30]">{action.due}</div>
            </div>
          </div>

          {/* Clickable SOP Traceability Link */}
          <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2eaf3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2563eb]" />
              <span className="text-[11px] font-medium text-[#475569]">
                Traceable SOP Reference:
              </span>
            </div>
            <Link
              href={`/dashboard/knowledge?doc=${encodeURIComponent(action.sourceDoc)}`}
              onClick={onClose}
              className="font-mono-numbers font-medium text-[#2563eb] hover:underline text-xs"
            >
              Inspect {action.sourceDoc} →
            </Link>
          </div>

          {/* Verification Checklist */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-[#64748b]">
              Pre-Execution Verification Checklist
            </div>
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-[#f8fafc] border border-[#e2eaf3] cursor-pointer hover:bg-[#f1f5f9]"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[idx]}
                    onChange={(e) =>
                      setCheckedItems((prev) => ({ ...prev, [idx]: e.target.checked }))
                    }
                    className="mt-0.5 rounded border-[#cbd5e1] text-[#2563eb] cursor-pointer"
                  />
                  <span className="text-xs text-[#334155] leading-snug">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes / Override Reason */}
          <div>
            <label
              htmlFor="hitl-notes"
              className="block text-[11px] font-semibold text-[#64748b] mb-1"
            >
              Supervisor Note / Override Reason
            </label>
            <textarea
              id="hitl-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional when authorizing; required when overriding the AI recommendation..."
              className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
            />
            {errorMsg && (
              <p className="text-[11px] text-[#dc2626] font-semibold mt-1">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f8fafc] border-t border-[#e2eaf3] flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-[#64748b]">
            {action.flagged
              ? `Recorded as ${(action.status || "authorized").toUpperCase()}`
              : "Awaiting human supervisor sign-off"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOverride}
              disabled={action.flagged}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#b45309] bg-[#fef3c7] hover:bg-[#fde68a] border border-[#fcd34d] rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Override</span>
            </button>

            <button
              type="button"
              onClick={handleAuthorize}
              disabled={action.flagged}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                action.flagged
                  ? "bg-[#e6f7f0] text-[#0d9263] border border-[#a7f3d0] cursor-not-allowed"
                  : "bg-[#0c1a2d] hover:bg-[#1a3354] text-white cursor-pointer"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {action.flagged
                  ? action.status === "overridden"
                    ? "Overridden"
                    : "Authorized"
                  : "Authorize Action"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
