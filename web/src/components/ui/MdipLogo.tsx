"use client";

import React, { useId } from "react";

interface MdipLogoProps {
  variant?: "color" | "dark" | "light";
  size?: number;
  className?: string;
}

export const MdipLogo: React.FC<MdipLogoProps> = ({
  variant = "color",
  size = 32,
  className = "",
}) => {
  const gradId = useId();
  const strokePaint =
    variant === "light"
      ? "#FFFFFF"
      : variant === "dark"
      ? "#0A0A0A"
      : `url(#${gradId})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {variant === "color" && (
        <defs>
          <linearGradient
            id={gradId}
            x1="8"
            y1="56"
            x2="56"
            y2="8"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#0F203D" />
            <stop offset="52%" stopColor="#0D556E" />
            <stop offset="100%" stopColor="#15A87D" />
          </linearGradient>
        </defs>
      )}
      <polygon
        points="32,6 54.5,19 54.5,45 32,58 9.5,45 9.5,19"
        stroke={strokePaint}
        strokeWidth="4.6"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="42" r="3.6" stroke={strokePaint} strokeWidth="3.2" />
      <circle cx="32" cy="32" r="3.8" stroke={strokePaint} strokeWidth="3.2" />
      <circle cx="46" cy="22" r="3.6" stroke={strokePaint} strokeWidth="3.2" />
      <line
        x1="21.1"
        y1="39.8"
        x2="26.6"
        y2="35.8"
        stroke={strokePaint}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <polygon points="28.6,34.4 24.3,34.5 27.1,38.5" fill={strokePaint} />
      <line
        x1="35.1"
        y1="29.8"
        x2="40.6"
        y2="25.8"
        stroke={strokePaint}
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <polygon points="42.6,24.4 38.3,24.5 41.1,28.5" fill={strokePaint} />
    </svg>
  );
};
