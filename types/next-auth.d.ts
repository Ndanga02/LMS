import type { DefaultSession } from "next-auth";
import type { PlatformRole } from "@/lib/generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      platformRole?: PlatformRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    platformRole?: PlatformRole;
  }
}