"use client";

import React, { useEffect } from "react";
import { CheckCircle } from "lucide-react";

interface ToastProps {
  message: string | null;
  onClear: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClear }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClear, 2800);
    return () => clearTimeout(timer);
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className="bg-ink text-white px-4 py-2.5 rounded-xl shadow-2xl border border-ink-2 flex items-center gap-2.5 text-xs sm:text-sm font-medium"
      >
        <CheckCircle className="w-4 h-4 text-stamp-line shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
};
