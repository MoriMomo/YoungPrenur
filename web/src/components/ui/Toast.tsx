"use client";

import React, { useEffect } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

interface ToastProps {
  message: string | null;
  tone?: "success" | "error";
  onClear: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, tone = "success", onClear }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClear, tone === "error" ? 4200 : 2800);
    return () => clearTimeout(timer);
  }, [message, tone, onClear]);

  if (!message) return null;

  const isError = tone === "error";
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        role={isError ? "alert" : "status"}
        className={`px-4 py-2.5 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs sm:text-sm font-medium ${
          isError
            ? "bg-hold text-white border-hold-line"
            : "bg-ink text-white border-ink-2"
        }`}
      >
        {isError ? (
          <AlertCircle className="w-4 h-4 text-white shrink-0" />
        ) : (
          <CheckCircle className="w-4 h-4 text-stamp-line shrink-0" />
        )}
        <span>{message}</span>
      </div>
    </div>
  );
};
