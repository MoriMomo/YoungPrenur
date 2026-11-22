"use client";

import React, { useId, useState } from "react";
import { useT } from "@/lib/i18n";

type FileDropProps = {
  /** Comma-separated extensions, as for <input accept>; checked again by the server from the file's bytes. */
  accept: string;
  maxBytes: number;
  disabled?: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
  className?: string;
  /** Render the drop target's content; call `open` from a button to show the file picker. */
  children: (open: () => void, dragging: boolean) => React.ReactNode;
};

/** One way to take a file anywhere in MDIP: drop it on the area or pick it with a button. */
export function FileDrop({ accept, maxBytes, disabled, onFile, onReject, className = "", children }: FileDropProps) {
  const t = useT();
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const open = () => document.getElementById(inputId)?.click();

  const take = (file: File | undefined) => {
    if (!file || disabled) return;
    const allowed = accept.split(",").map((ext) => ext.trim().toLowerCase());
    if (!allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      onReject(t(`${file.name} is not a supported file. Use ${allowed.join(", ")}.`, `${file.name} bukan file yang didukung. Gunakan ${allowed.join(", ")}.`));
    } else if (file.size > maxBytes) {
      onReject(t(`${file.name} is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`, `${file.name} lebih besar dari ${Math.round(maxBytes / (1024 * 1024))} MB.`));
    } else {
      onFile(file);
    }
  };

  return (
    <div
      className={`${className} ${dragging ? "outline-2 outline-dashed outline-offset-2 outline-stamp" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files[0]);
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {children(open, dragging)}
    </div>
  );
}
