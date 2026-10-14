"use client";

import React, { useRef, useEffect } from "react";
import { DecisionAction } from "@/types";
import { X, CheckCircle2, ShieldAlert, UserCheck, Calendar, BookOpen } from "lucide-react";
import gsap from "gsap";

interface ReviewModalProps {
  action: DecisionAction | null;
  onClose: () => void;
  onFlagAction: (actionId: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  action,
  onClose,
  onFlagAction,
}) => {
  const modalBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (action && modalBoxRef.current) {
      gsap.fromTo(
        modalBoxRef.current,
        { opacity: 0, scale: 0.94, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: "power2.out" }
      );
    }
  }, [action]);

  if (!action) return null;

  return (
    <div
      className="fixed inset-0 bg-[#0c1a2d]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalBoxRef}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#e2eaf3] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#e2eaf3] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#101e30] tracking-tight">
                {action.title}
              </h2>
              <span className="text-[11px] text-[#64748b]">
                Human-in-the-Loop Operational Authorization
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748b] hover:text-[#101e30] hover:bg-[#e2e8f0] rounded-lg transition"
            aria-label="Close review dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Rationale */}
          <div>
            <div className="text-[10px] font-bold text-[#2563eb] uppercase tracking-wider mb-1">
              Action Rationale & Operational Context
            </div>
            <p className="text-sm text-[#101e30] leading-relaxed bg-[#f8fafc] p-3 rounded-xl border border-[#e2eaf3]">
              {action.description}
            </p>
          </div>

          {/* Impact */}
          <div>
            <div className="text-[10px] font-bold text-[#0d9263] uppercase tracking-wider mb-1">
              Predicted Milestone Impact
            </div>
            <p className="text-xs font-semibold text-[#0d9263] bg-[#e6f7f0] p-3 rounded-xl border border-[#a7f3d0]">
              {action.impact}
            </p>
          </div>

          {/* Owner & Due */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2eaf3]">
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#2563eb]" />
                <span>Action Owner</span>
              </div>
              <div className="font-semibold text-[#101e30]">{action.owner}</div>
            </div>

            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2eaf3]">
              <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#d97706]" />
                <span>Due Window</span>
              </div>
              <div className="font-semibold text-[#101e30]">{action.due}</div>
            </div>
          </div>

          {/* Source SOP */}
          <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2eaf3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2563eb]" />
              <span className="text-[11px] font-medium text-[#475569]">
                Standard Operating Procedure:
              </span>
            </div>
            <span className="font-mono-numbers font-bold text-[#2563eb] text-xs">
              {action.sourceDoc}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#f8fafc] border-t border-[#e2eaf3] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#64748b] italic">
            {action.flagged ? "Recorded in human audit log." : "Requires manager sign-off."}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-[#475569] hover:bg-[#e2e8f0] rounded-xl transition"
            >
              Close
            </button>
            <button
              onClick={() => onFlagAction(action.id)}
              disabled={action.flagged}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm ${
                action.flagged
                  ? "bg-[#e6f7f0] text-[#0d9263] border border-[#a7f3d0] cursor-default"
                  : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white hover:shadow"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{action.flagged ? "Flagged for Audit" : "Authorize Action"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
