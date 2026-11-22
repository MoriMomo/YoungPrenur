"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { ID } from "./i18n-id";

export type Lang = "en" | "id";

const KEY = "mdip-lang";
const EVENT = "mdip-lang-change";

function read(): Lang {
  try {
    return window.localStorage.getItem(KEY) === "id" ? "id" : "en";
  } catch {
    return "en";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setLang(lang: Lang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Current language; the server and first paint render English, then the stored choice applies. */
export function useLang(): Lang {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return lang;
}

/**
 * `t("English", "Bahasa Indonesia")`: both texts sit side by side at the call site.
 * `t(dataString)` looks data (verdicts, roles, drivers) up in the shared Indonesian table, falling back to English.
 */
export function useT() {
  const lang = useLang();
  return <V,>(en: V, id?: V): V => {
    if (lang !== "id") return en;
    if (id !== undefined) return id;
    return (typeof en === "string" ? (ID[en] ?? en) : en) as V;
  };
}

/** For server components: renders the text for the current language. */
export function T({ en, id }: { en: React.ReactNode; id: React.ReactNode }) {
  return <>{useT()(en, id)}</>;
}

/** EN | ID toggle. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div role="group" aria-label="Language / Bahasa" className={`flex rounded-md border border-rule-strong p-0.5 text-xs font-medium ${className}`}>
      {(["en", "id"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`h-7 min-w-8 cursor-pointer rounded-sm px-2 uppercase transition-colors ${
            lang === l ? "bg-ink text-sheet" : "text-ink-2 hover:text-ink"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
