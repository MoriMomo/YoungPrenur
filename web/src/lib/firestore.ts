import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { AuditLogEntry, KnowledgeDoc, ManufacturingRole } from "@/types";
import { ROLES } from "@/lib/mock-data";
import { auth, db } from "./firebase";

export interface StoredUserProfile {
  id: string;
  email: string;
  name: string;
  role: ManufacturingRole;
}

function normalizeRole(raw: unknown, fallback: ManufacturingRole): ManufacturingRole {
  return typeof raw === "string" && ROLES.includes(raw as ManufacturingRole)
    ? (raw as ManufacturingRole)
    : fallback;
}

/** Reads or provisions `users/{uid}` in Firestore for an authenticated Firebase user. */
export async function ensureUserProfile(
  uid: string,
  email: string,
  name: string,
  fallbackRole: ManufacturingRole = "Operations Manager",
  preferFallbackRole = false
): Promise<StoredUserProfile> {
  const safeEmail = email.trim().toLowerCase();
  const safeName = (name.trim() || safeEmail.split("@")[0] || "MDIP Operator").slice(0, 120);
  const userRef = doc(db, "users", uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const resolvedRole = preferFallbackRole
        ? fallbackRole
        : normalizeRole(data.role, fallbackRole);
      const resolvedName =
        (typeof data.name === "string" && data.name.trim()) || safeName;
      if (preferFallbackRole && data.role !== resolvedRole) {
        await setDoc(
          userRef,
          { role: resolvedRole, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
      return {
        id: uid,
        email: (typeof data.email === "string" && data.email) || safeEmail,
        name: resolvedName,
        role: resolvedRole,
      };
    }

    await setDoc(userRef, {
      uid,
      email: safeEmail,
      name: safeName,
      role: fallbackRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Allow auth to proceed even if Firestore API is still propagating
  }

  return { id: uid, email: safeEmail, name: safeName, role: fallbackRole };
}

export async function fetchFirestoreSops(): Promise<KnowledgeDoc[]> {
  if (!auth.currentUser) return [];
  try {
    const snap = await getDocs(collection(db, "sops"));
    const docs: KnowledgeDoc[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const code = String(d.doc_code || docSnap.id);
      const excerpt = String(d.excerpt || "");
      const clause = String(d.clause || "Clause 1.0");
      docs.push({
        id: `sop-${code.toLowerCase()}`,
        title: String(d.title || code),
        code,
        category: String(d.category || "Plant SOP"),
        keywords: Array.isArray(d.keywords) ? d.keywords.map(String) : [],
        summary: excerpt,
        sections: [{ clause, content: excerpt }],
      });
    });
    return docs;
  } catch {
    return [];
  }
}

export async function saveFirestoreSop(payload: {
  doc_code: string;
  title: string;
  clause: string;
  keywords: string[];
  excerpt: string;
}): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const docId = payload.doc_code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
  if (!docId) return false;

  try {
    const ref = doc(db, "sops", docId);
    const existing = await getDoc(ref);
    const baseData = {
      doc_code: payload.doc_code.trim().slice(0, 40),
      title: payload.title.trim().slice(0, 160),
      clause: payload.clause.trim().slice(0, 160),
      keywords: payload.keywords.slice(0, 30),
      excerpt: payload.excerpt.trim().slice(0, 4000),
      category: "Plant SOP",
      updatedAt: serverTimestamp(),
    };
    if (existing.exists()) {
      await setDoc(ref, baseData, { merge: true });
    } else {
      await setDoc(ref, { ...baseData, createdBy: user.uid });
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchFirestoreDecisionStatuses(): Promise<
  Record<string, { status: "pending" | "authorized" | "overridden"; flagged: boolean; overrideReason?: string }>
> {
  if (!auth.currentUser) return {};
  try {
    const snap = await getDocs(collection(db, "decisions"));
    const out: Record<
      string,
      { status: "pending" | "authorized" | "overridden"; flagged: boolean; overrideReason?: string }
    > = {};
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const status =
        d.status === "overridden"
          ? "overridden"
          : d.status === "authorized"
          ? "authorized"
          : "pending";
      out[docSnap.id] = {
        status,
        flagged: Boolean(d.flagged),
        overrideReason: typeof d.overrideReason === "string" ? d.overrideReason : undefined,
      };
    });
    return out;
  } catch {
    return {};
  }
}

export async function saveFirestoreDecisionFlag(params: {
  actionId: string;
  actionTitle: string;
  decision: "AUTHORIZED" | "OVERRIDDEN";
  reviewerRole: string;
  notes: string;
  sopRef: string;
}): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const status = params.decision === "OVERRIDDEN" ? "overridden" : "authorized";
  const logId = `AUD-${Date.now()}`;
  const cleanNotes =
    params.notes.trim().slice(0, 1000) ||
    (params.decision === "AUTHORIZED"
      ? "Checklist verified by supervisor."
      : "Schedule change overridden.");

  try {
    await setDoc(doc(db, "decisions", params.actionId), {
      actionId: params.actionId.slice(0, 60),
      status,
      flagged: true,
      ...(params.decision === "OVERRIDDEN" && cleanNotes ? { overrideReason: cleanNotes } : {}),
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "audit_logs", logId), {
      id: logId,
      actionId: params.actionId.slice(0, 60),
      actionTitle: params.actionTitle.slice(0, 200),
      decision: params.decision,
      reviewerRole: params.reviewerRole.slice(0, 160),
      notes: cleanNotes,
      sopRef: params.sopRef.slice(0, 80) || "SOP-MDIP",
      timestamp:
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB",
      actorUid: user.uid,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchFirestoreAuditLogs(): Promise<AuditLogEntry[]> {
  if (!auth.currentUser) return [];
  try {
    const q = query(collection(db, "audit_logs"), orderBy("createdAt", "desc"), limit(100));
    const snap = await getDocs(q);
    const logs: AuditLogEntry[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      logs.push({
        id: String(d.id || docSnap.id),
        actionId: String(d.actionId || ""),
        actionTitle: String(d.actionTitle || ""),
        decision: d.decision === "OVERRIDDEN" ? "OVERRIDDEN" : "AUTHORIZED",
        reviewerRole: String(d.reviewerRole || "Operations Manager"),
        notes: String(d.notes || ""),
        sopRef: String(d.sopRef || "SOP-MDIP"),
        timestamp: String(d.timestamp || ""),
      });
    });
    return logs;
  } catch {
    return [];
  }
}

export async function fetchFirestoreIRoomRecords<T extends { id: string }>(
  stream: "materials" | "progress" | "drawings" | "quotations" | "operations"
): Promise<T[]> {
  if (!auth.currentUser) return [];
  try {
    const q = query(collection(db, "iroom_records"), where("stream", "==", stream));
    const snap = await getDocs(q);
    const rows: T[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d?.data && typeof d.data === "object") {
        rows.push(d.data as T);
      }
    });
    return rows;
  } catch {
    return [];
  }
}

export async function saveFirestoreIRoomRecord(
  stream: "materials" | "progress" | "drawings" | "quotations" | "operations",
  record: Record<string, unknown>
): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;
  const id = String(record.id || `${stream}-${Date.now()}`).slice(0, 80);
  try {
    await setDoc(doc(db, "iroom_records", id), {
      id,
      stream,
      data: record,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch {
    return false;
  }
}
