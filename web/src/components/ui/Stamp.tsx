import React from "react";

/**
 * The inspector's stamp: a double-ringed round mark in stamp blue.
 * Use at most once per page, only to certify a real, verifiable fact.
 */
export function Stamp({
  top,
  center,
  bottom,
  size = 148,
  className = "",
  animate = true,
}: {
  top: string;
  center: string;
  bottom: string;
  size?: number;
  className?: string;
  animate?: boolean;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <div
      role="img"
      aria-label={`${top}. ${center}. ${bottom}.`}
      className={`pointer-events-none select-none text-stamp -rotate-[9deg] opacity-95 ${animate ? "animate-stamp" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
        <defs>
          <path id={`${id}-top`} d="M 30 100 A 70 70 0 0 1 170 100" />
          <path id={`${id}-bot`} d="M 34 108 A 66 66 0 0 0 166 108" />
        </defs>
        <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="4" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text fill="currentColor" fontSize="14" fontWeight="700" letterSpacing="1.4" fontFamily="var(--font-display)">
          <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
            {top.toUpperCase()}
          </textPath>
        </text>
        <text fill="currentColor" fontSize="13" fontWeight="700" letterSpacing="1.4" fontFamily="var(--font-display)">
          <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
            {bottom.toUpperCase()}
          </textPath>
        </text>
        <text
          x="100"
          y="110"
          textAnchor="middle"
          fill="currentColor"
          fontSize="30"
          fontWeight="800"
          fontFamily="var(--font-display)"
        >
          {center}
        </text>
      </svg>
    </div>
  );
}
