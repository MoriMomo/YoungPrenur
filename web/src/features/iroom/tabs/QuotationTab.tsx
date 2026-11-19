"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { QuotationPoItem } from "@/types";
import { IRoomTable } from "../IRoomTable";

export interface QuotationTabProps {
  searchQuery: string;
  handleInspectWithAI: (entityName: string, detail: string) => void;
  quotations: QuotationPoItem[];
}

export function QuotationTab({ searchQuery, handleInspectWithAI, quotations }: QuotationTabProps) {
  return (
    <IRoomTable
      headers={[
        "PO Number & QTN Ref",
        "Vendor Name",
        "Total Value (IDR)",
        "Payment Term",
        "Status",
        "Copilot Action",
      ]}
    >
      {quotations
            .filter(
              (q) =>
                q.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                q.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((po) => (
              <tr key={po.id} className="hover:bg-paper transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-ink flex items-center gap-1.5">
                    <span className="font-mono-numbers">{po.poNumber}</span>
                    {po.expedited && (
                      <span className="px-1.5 py-0.5 bg-warn-wash text-warn font-medium text-xs rounded">
                        Expedite
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-3 font-mono-numbers">
                    Ref: {po.quotationRef}
                  </div>
                </td>
                <td className="py-3 px-3 text-ink-2 font-medium">{po.vendorName}</td>
                <td className="py-3 px-3 font-mono-numbers text-ink font-medium">
                  {po.totalValueIdr}
                </td>
                <td className="py-3 px-3 text-ink-3">{po.paymentTerm}</td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                      po.status === "PO Issued"
                        ? "bg-pass-wash text-pass border-pass-line"
                        : "bg-warn-wash text-warn border-warn-line"
                    }`}
                  >
                    {po.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      handleInspectWithAI(
                        po.poNumber,
                        `Vendor ${po.vendorName}, value ${po.totalValueIdr}, term ${po.paymentTerm}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stamp hover:bg-stamp-deep text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-stamp" />
                    <span>Assess PO</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
