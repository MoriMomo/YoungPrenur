"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useDashboard } from "@/features/workspace/dashboard-context";
import { useT } from "@/lib/i18n";

const noopSubscribe = () => () => {};

/** First-run guide on the overview: three steps that tick themselves off, hidden for good once all are done. */
export function StartHere({ hasSchedule }: { hasSchedule: boolean }) {
  const t = useT();
  const { userId, knowledgeDocs, chatMessages, askCopilotWithPrompt } = useDashboard();
  const key = `mdip-onboarded-${userId ?? "guest"}`;
  // The Copilot step is only known for this session, so finishing is remembered in the browser.
  const finishedBefore = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => true
  );

  const steps = [
    {
      done: hasSchedule,
      label: t("Upload a schedule", "Unggah jadwal"),
      hint: t("CSV, Excel, Primavera P6 or MS Project export", "Ekspor CSV, Excel, Primavera P6, atau MS Project"),
      action: <Link href="/dashboard/scheduler">{t("Open the scheduler", "Buka penjadwal")}</Link>,
    },
    {
      done: knowledgeDocs.length > 0,
      label: t("Add your SOPs", "Tambahkan SOP Anda"),
      hint: t("Upload your own or load the sample plant SOPs", "Unggah milik Anda atau muat SOP contoh pabrik"),
      action: <Link href="/dashboard/knowledge">{t("Open SOP knowledge", "Buka pengetahuan SOP")}</Link>,
    },
    {
      done: chatMessages.some((m) => m.sender === "you"),
      label: t("Ask Copilot a question", "Tanyakan sesuatu ke Copilot"),
      hint: t("It answers from your SOPs and schedule, with citations", "Copilot menjawab dari SOP dan jadwal Anda, dengan kutipan"),
      action: (
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => void askCopilotWithPrompt(t("What needs attention first today?", "Apa yang paling perlu diperhatikan hari ini?"))}
        >
          {t("Ask a first question", "Ajukan pertanyaan pertama")}
        </button>
      ),
    },
  ];
  const allDone = steps.every((s) => s.done);

  useEffect(() => {
    if (!allDone) return;
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // Private mode: the guide may show again next visit.
    }
  }, [allDone, key]);

  if (finishedBefore || allDone) return null;

  return (
    <section aria-labelledby="start-here-title" className="border border-stamp-line bg-sheet px-4 py-4 sm:px-5">
      <h2 id="start-here-title" className="font-display text-lg font-bold text-ink">
        {t("Start here", "Mulai di sini")}
      </h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                step.done ? "border-pass bg-pass text-sheet" : "border-rule-strong text-ink-2"
              }`}
            >
              {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
            </span>
            <div className="min-w-0 text-sm">
              <p className={`font-medium ${step.done ? "text-ink-3 line-through" : "text-ink"}`}>
                {step.label}
                <span className="sr-only">{step.done ? t(" (done)", " (selesai)") : ""}</span>
              </p>
              <p className="text-xs text-ink-3">{step.hint}</p>
              {!step.done && (
                <div className="mt-1 py-1 text-sm font-medium text-stamp hover:underline [&>*]:inline-block">{step.action}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
