import { auth } from "@/lib/auth";
import { getUserByEmail, getUserById, upsertUserFromAuth } from "@/lib/users";
import { redirect } from "next/navigation";

export function isSyntheticUserId(id: string): boolean {
  return id.startsWith("email:") || /^\d+$/.test(id);
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return session.user;
}

export async function requireSessionUser(redirectTo = "/login") {
  const session = await auth();
  if (!session?.user?.email) {
    redirect(redirectTo);
  }
  return session.user;
}

export async function resolveDbUserId(sessionUser: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<string> {
  // Prefer resolving by email (authoritative source of truth).
  // This guarantees we always return a real, existing User.id that satisfies FK constraints.
  if (sessionUser.email) {
    let dbUser = await getUserByEmail(sessionUser.email);

    if (!dbUser) {
      // Create on demand (defensive against missed signIn events, DB resets, stale sessions, etc.)
      dbUser = await upsertUserFromAuth({
        email: sessionUser.email,
        name: sessionUser.name ?? null,
        image: sessionUser.image ?? null,
      });
    }

    return dbUser.id;
  }

  // Fallback: only trust a non-synthetic ID if we have no email (should be rare)
  if (sessionUser.id && !isSyntheticUserId(sessionUser.id)) {
    return sessionUser.id;
  }

  throw new Error("Cannot resolve real database user ID: session has neither a valid email nor a real user id.");
}

export async function getCurrentDbUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.email) return null;

  try {
    const userId = await resolveDbUserId(sessionUser);
    if (isSyntheticUserId(userId)) {
      // Fallback (should be rare now that resolve is defensive)
      return getUserByEmail(sessionUser.email);
    }
    return getUserById(userId);
  } catch {
    return null;
  }
}