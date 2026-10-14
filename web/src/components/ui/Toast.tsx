"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle } from "lucide-react";
import gsap from "gsap";

interface ToastProps {
  message: string | null;
  onClear: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClear }) => {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message) return;

    if (toastRef.current) {
      gsap.fromTo(
        toastRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" }
      );
    }

    const timer = setTimeout(() => {
      if (toastRef.current) {
        gsap.to(toastRef.current, {
          opacity: 0,
          y: 10,
          duration: 0.2,
          ease: "power2.in",
          onComplete: onClear,
        });
      } else {
        onClear();
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        ref={toastRef}
        className="bg-[#102238] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-[#2b4865] flex items-center gap-2.5 text-xs sm:text-sm font-medium"
      >
        <CheckCircle className="w-4 h-4 text-[#38bdf8] shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
};
