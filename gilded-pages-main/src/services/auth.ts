// Demo authentication. It mirrors the shape of a real sign-in API
// (async, generic error on bad credentials) so it can be swapped for
// `fetch("/api/auth/login")` or an auth provider without touching the UI.
//
// NOT real security: credentials are checked in the browser against demo data.
import type { LibraryData, Role } from "./types";
import { LIBRARIAN } from "./seed";

export const DEMO_PASSWORDS = { member: "reader123", librarian: "librarian123" } as const;

export interface Session {
  role: Role;
  /** Member ID for members, staff ID for librarians. */
  memberId: string;
}

export class AuthError extends Error {}

export async function signInWithPassword(data: LibraryData, email: string, password: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 450)); // simulate network round-trip
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) throw new AuthError("Enter your email and password.");

  if (normalized === LIBRARIAN.email) {
    if (password !== DEMO_PASSWORDS.librarian) throw new AuthError("Email or password is incorrect.");
    return { role: "librarian", memberId: LIBRARIAN.id };
  }

  const member = data.members.find((m) => m.email.toLowerCase() === normalized);
  // Same message for unknown email and wrong password, so accounts can't be probed.
  if (!member || password !== DEMO_PASSWORDS.member) throw new AuthError("Email or password is incorrect.");
  if (member.membershipStatus !== "active") throw new AuthError("This membership is inactive. Please contact the library desk.");
  return { role: "member", memberId: member.id };
}

/** Paths anyone can open without signing in. */
export function isPublicPath(path: string): boolean {
  return path === "/" || path === "/login" || path === "/catalog" || path.startsWith("/books/");
}
