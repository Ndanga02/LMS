import type { User } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

type AuthUser = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export function resolvePlatformRole(email: string) {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (superAdminEmail && email === superAdminEmail) {
    return "SUPER_ADMIN" as const;
  }
  return "USER" as const;
}

export async function upsertUserFromAuth(profile: AuthUser): Promise<User> {
  const email = profile.email;
  if (!email) {
    throw new Error("Auth profile is missing an email address.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const resolvedRole = resolvePlatformRole(email);
    return prisma.user.update({
      where: { email },
      data: {
        name: profile.name ?? null,
        image: profile.image ?? null,
        emailVerified: new Date(),
        ...(resolvedRole !== existing.platformRole ? { platformRole: resolvedRole } : {}),
      },
    });
  }

  return prisma.user.create({
    data: {
      email,
      name: profile.name ?? null,
      image: profile.image ?? null,
      platformRole: resolvePlatformRole(email),
      emailVerified: new Date(),
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}