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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#e2eaf3] text-[#64748b] text-[11px] font-semibold">
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
        <tbody className="divide-y divide-[#f1f5f9]">{children}</tbody>
      </table>
    </div>
  );
}
