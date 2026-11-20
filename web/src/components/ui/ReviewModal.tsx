"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DecisionAction } from "@/types";
import { X, CheckCircle2, ShieldAlert, UserCheck, Calendar, BookOpen, XCircle } from "lucide-react";

interface ReviewModalProps {
  action: DecisionAction | null;
  onClose: () => void;
  onSubmitDecision: (
    actionId: string,
    decision: "AUTHORIZED" | "OVERRIDDEN",
    notes: string
  ) => Promise<void>;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  action,
  onClose,
  onSubmitDecision,
}) => {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
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

  if (!action) return null;

  const checklist = action.checklist || [
    "Confirm telemetry and physical inventory match source records",
    `Verify compliance with ${action.sourceDoc}`,
  ];

  const submit = async (decision: "AUTHORIZED" | "OVERRIDDEN") => {
    if (saving) return;
    if (decision === "OVERRIDDEN" && !notes.trim()) {
      setErrorMsg("Enter an override reason.");
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      await onSubmitDecision(action.id, decision, notes.trim());
      setNotes("");
      setCheckedItems({});
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not confirm that the review was saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-paper/65 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-rule overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-rule flex items-center justify-between bg-paper">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-stamp-wash text-stamp flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="review-modal-title" className="font-display text-[20px] font-bold leading-tight text-ink truncate">
                {action.title}
              </h2>
              <span className="text-xs text-ink-3">
                Human-in-the-Loop Decision Gate (Accept or Override)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-3 hover:text-ink hover:bg-rule rounded-lg transition-colors cursor-pointer"
            aria-label="Close review dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div>
            <div className="text-xs font-semibold text-stamp mb-1">
              Operational Rationale
            </div>
            <p className="text-sm text-ink leading-relaxed bg-paper p-3 rounded-xl border border-rule">
              {action.description}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-pass mb-1">
              Predicted Milestone Impact
            </div>
            <p className="text-xs font-semibold text-pass bg-pass-wash p-3 rounded-xl border border-pass-line">
              {action.impact}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-paper rounded-xl border border-rule">
              <div className="text-xs font-medium text-ink-3 mb-0.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-stamp" />
                <span>Action Owner</span>
              </div>
              <div className="font-semibold text-ink">{action.owner}</div>
            </div>

            <div className="p-3 bg-paper rounded-xl border border-rule">
              <div className="text-xs font-medium text-ink-3 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-warn" />
                <span>Due Window</span>
              </div>
              <div className="font-semibold text-ink">{action.due}</div>
            </div>
          </div>

          {/* Clickable SOP Traceability Link */}
          <div className="p-3 bg-paper rounded-xl border border-rule flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-stamp" />
              <span className="text-xs font-medium text-ink-2">
                Traceable SOP Reference:
              </span>
            </div>
            <Link
              href={`/dashboard/knowledge?doc=${encodeURIComponent(action.sourceDoc)}`}
              onClick={onClose}
              className="font-mono-numbers font-medium text-stamp hover:underline text-xs"
            >
              Inspect {action.sourceDoc} →
            </Link>
          </div>

          {/* Verification Checklist */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-ink-3">
              Pre-Execution Verification Checklist
            </div>
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-lg bg-paper border border-rule cursor-pointer hover:bg-sheet-sunk"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[idx]}
                    onChange={(e) =>
                      setCheckedItems((prev) => ({ ...prev, [idx]: e.target.checked }))
                    }
                    className="mt-0.5 rounded border-rule-strong text-stamp cursor-pointer"
                  />
                  <span className="text-xs text-ink-2 leading-snug">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes / Override Reason */}
          <div>
            <label
              htmlFor="hitl-notes"
              className="block text-xs font-semibold text-ink-3 mb-1"
            >
              Supervisor Note / Override Reason
            </label>
            <textarea
              id="hitl-notes"
              rows={2}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional when authorizing; required when overriding the AI recommendation..."
              className="w-full px-3 py-2 text-xs bg-paper border border-rule-strong rounded-xl focus:outline-none focus:ring-2 focus:ring-stamp/20"
            />
            {errorMsg && (
              <p role="alert" className="text-xs text-hold font-semibold mt-1">{errorMsg}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-paper border-t border-rule flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-ink-3">
            {action.flagged
              ? `Recorded as ${(action.status || "authorized").toUpperCase()}`
              : saving ? "Saving review…" : "Awaiting human supervisor sign-off"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void submit("OVERRIDDEN")}
              disabled={action.flagged || saving}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-warn bg-warn-wash hover:bg-warn hover:text-sheet border border-warn-line rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Override</span>
            </button>

            <button
              type="button"
              onClick={() => void submit("AUTHORIZED")}
              disabled={action.flagged || saving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                action.flagged
                  ? "bg-pass-wash text-pass border border-pass-line cursor-not-allowed"
                  : "bg-stamp hover:bg-stamp-deep text-white cursor-pointer"
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
