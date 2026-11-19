"use client";

import React from "react";

/** Shared table shell used by every IRoom tab. */
export function IRoomTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-b border-rule text-ink-3 text-xs font-semibold">
            {headers.map((header, idx) => (
              <th
                key={header}
                className={`py-2.5 px-3${idx === headers.length - 1 ? " text-right" : ""}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule-soft">{children}</tbody>
      </table>
    </div>
  );
}
