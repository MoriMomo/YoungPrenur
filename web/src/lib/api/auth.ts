/** Firebase Authentication: Email/Password, Google Sign-In, sign-out and session observer. */

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { ManufacturingRole } from "@/types";
import { auth, googleProvider } from "@/lib/firebase";
import { ensureUserProfile } from "@/lib/firestore";
import { AuthSession, AuthUser, clearStoredSession, getStoredSession, saveSession } from "./client";

export class AuthError extends Error {}

function formatFirebaseAuthError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: unknown }).code || "");
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists. Try signing in instead.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return "Google sign-in was cancelled.";
      case "auth/popup-blocked":
        return "Pop-up was blocked by your browser. Allow pop-ups for this site and try again.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized for Google Sign-In in Firebase Auth.";
      case "auth/operation-not-allowed":
        return "This sign-in provider is not enabled in Firebase Authentication yet.";
      default:
        break;
    }
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

async function buildFirebaseSession(
  fbUser: User,
  fallbackRole: ManufacturingRole,
  fallbackName = "",
  preferFallbackRole = false
): Promise<AuthSession> {
  const profile = await ensureUserProfile(
    fbUser.uid,
    fbUser.email || "",
    fbUser.displayName || fallbackName,
    fallbackRole,
    preferFallbackRole
  );
  const token = await fbUser.getIdToken();
  const session: AuthSession = {
    token,
    user: profile,
    mode: "firebase",
    storage: "firebase",
  };
  saveSession(session);
  return session;
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return await buildFirebaseSession(cred.user, "Operations Manager");
  } catch (err) {
    throw new AuthError(formatFirebaseAuthError(err, "Invalid email or password."));
  }
}

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: ManufacturingRole
): Promise<AuthSession> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const trimmedName = name.trim();
    if (trimmedName) {
      await updateProfile(cred.user, { displayName: trimmedName });
    }
    return await buildFirebaseSession(cred.user, role, trimmedName, true);
  } catch (err) {
    throw new AuthError(formatFirebaseAuthError(err, "Could not create account."));
  }
}

export async function loginWithGoogle(
  role: ManufacturingRole = "Operations Manager"
): Promise<AuthSession> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return await buildFirebaseSession(cred.user, role);
  } catch (err) {
    throw new AuthError(formatFirebaseAuthError(err, "Google sign-in failed."));
  }
}

export async function logoutUser(): Promise<void> {
  clearStoredSession();
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors when offline
  }
}

export function subscribeFirebaseAuth(
  onUser: (user: AuthUser) => void,
  onSignedOut: () => void
): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      clearStoredSession();
      onSignedOut();
      return;
    }
    const stored = getStoredSession();
    const fallbackRole = stored?.user?.role || "Operations Manager";
    const session = await buildFirebaseSession(fbUser, fallbackRole);
    onUser(session.user);
  });
}
