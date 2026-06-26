"use server";

import { headers } from "next/headers";
import { signIn } from "@/lib/auth";
import { loginRateLimit, getClientIp } from "@/lib/rate-limit";

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email")?.toString();
  const callbackUrl = formData.get("callbackUrl")?.toString() || "/dashboard";

  if (!email) {
    return { error: "Email is required" };
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);
  const { success } = await loginRateLimit(`email:${email}:${ip}`);

  if (!success) {
    return { error: "Too many requests. Please wait before trying again." };
  }

  await signIn("email", { email, redirectTo: callbackUrl });
}
