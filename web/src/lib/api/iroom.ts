/** IRoom connector streams (blank until user enters records or explicitly loads samples). */

import {
  MaterialDeliveryItem,
  ProjectProgressItem,
  DrawingApprovalItem,
  QuotationPoItem,
  OperationTrackerItem,
} from "@/types";
import { API_BASE, apiFetch } from "./client";

async function fetchStream<T extends { id: string }>(
  stream: "materials" | "progress" | "drawings" | "quotations" | "operations"
): Promise<T[]> {
  try {
    const res = await apiFetch(`${API_BASE}/iroom/${stream}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? (data as T[]) : [];
    }
  } catch {
    // Keep empty rather than showing mock data
  }
  return [];
}

/**
 * Fetches IRoom Material Delivery Management streams.
 */
export function fetchIRoomMaterials(): Promise<MaterialDeliveryItem[]> {
  return fetchStream("materials");
}

/**
 * Fetches IRoom Project Progress Tracking streams.
 */
export function fetchIRoomProjects(): Promise<ProjectProgressItem[]> {
  return fetchStream("progress");
}

/**
 * Fetches IRoom Drawing Approval streams.
 */
export function fetchIRoomDrawings(): Promise<DrawingApprovalItem[]> {
  return fetchStream("drawings");
}

/**
 * Fetches IRoom Quotation & PO management streams.
 */
export function fetchIRoomQuotations(): Promise<QuotationPoItem[]> {
  return fetchStream("quotations");
}

/**
 * Fetches IRoom Shop-Floor Operation Tracker streams.
 */
export function fetchIRoomOperations(): Promise<OperationTrackerItem[]> {
  return fetchStream("operations");
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

export async function loadSampleIRoomApi(): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/iroom/load-sample`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearIRoomApi(): Promise<boolean> {
  try {
    const res = await apiFetch(`${API_BASE}/iroom`, {
      method: "DELETE",
      signal: AbortSignal.timeout(3500),
    });
    return res.ok;
  } catch {
    return false;
  }
}
