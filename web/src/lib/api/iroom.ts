/** IRoom connector streams. */

import {
  IROOM_MATERIALS,
  IROOM_PROJECTS,
  IROOM_DRAWINGS,
  IROOM_QUOTATIONS,
  IROOM_OPERATIONS,
} from "@/lib/mock-data";
import {
  MaterialDeliveryItem,
  ProjectProgressItem,
  DrawingApprovalItem,
  QuotationPoItem,
  OperationTrackerItem,
} from "@/types";
import { API_BASE, apiFetch } from "./client";

async function fetchStream<T extends { id: string }>(
  stream: "materials" | "progress" | "drawings" | "quotations" | "operations",
  fallback: T[]
): Promise<T[]> {
  let base: T[] = fallback;
  try {
    const res = await apiFetch(`${API_BASE}/iroom/${stream}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      base = await res.json();
    }
  } catch {
    // Fallback
  }
  return base;
}

/**
 * Fetches IRoom Material Delivery Management streams.
 */
export function fetchIRoomMaterials(): Promise<MaterialDeliveryItem[]> {
  return fetchStream("materials", IROOM_MATERIALS);
}

/**
 * Fetches IRoom Project Progress Tracking streams.
 */
export function fetchIRoomProjects(): Promise<ProjectProgressItem[]> {
  return fetchStream("progress", IROOM_PROJECTS);
}

/**
 * Fetches IRoom Drawing Approval streams.
 */
export function fetchIRoomDrawings(): Promise<DrawingApprovalItem[]> {
  return fetchStream("drawings", IROOM_DRAWINGS);
}

/**
 * Fetches IRoom Quotation & PO management streams.
 */
export function fetchIRoomQuotations(): Promise<QuotationPoItem[]> {
  return fetchStream("quotations", IROOM_QUOTATIONS);
}

/**
 * Fetches IRoom Shop-Floor Operation Tracker streams.
 */
export function fetchIRoomOperations(): Promise<OperationTrackerItem[]> {
  return fetchStream("operations", IROOM_OPERATIONS);
}

export async function ingestIRoomRecord(
  stream: "materials" | "progress" | "drawings" | "quotations" | "operations",
  record: Record<string, unknown>
): Promise<{ success: boolean; total_records?: number } | null> {
  try {
    const res = await apiFetch(`${API_BASE}/iroom/${stream}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([record]),
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback handled below
  }
  return null;
}

// -------------------------------------------------------------
// Live Auth, Audit Log, Overview KPIs & Knowledge Base
// -------------------------------------------------------------
