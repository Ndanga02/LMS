import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Email from "next-auth/providers/email";
import { Resend } from "resend";
import type { PlatformRole } from "@/lib/generated/prisma";
import { env } from "./env";
import { prisma } from "./db";
import { resolvePlatformRole, upsertUserFromAuth } from "./users";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Set RESEND_FROM to a verified domain email for production, or leave unset to use
// the default onboarding@resend.dev (Resend sandbox — only delivers to the account owner's email).
const RESEND_FROM = process.env.RESEND_FROM || "SemtexTechLMS <onboarding@resend.dev>";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(env.RESEND_API_KEY
      ? [
          Email({
            // We provide a minimal server config for Auth.js validation (it still references Nodemailer shape internally),
            // but we completely override sendVerificationRequest to use the Resend SDK directly.
            server: {
              host: "smtp.resend.com",
              port: 465,
              auth: {
                user: "resend",
                pass: env.RESEND_API_KEY,
              },
            },
            from: RESEND_FROM,
            sendVerificationRequest: async ({ identifier: email, url }) => {
              if (!resend) {
                console.error("Resend not configured");
                throw new Error("Email provider not configured");
              }

              // In development, always log the link so you can test without email delivery
              if (process.env.NODE_ENV === "development") {
                console.log(`[DEV] Magic link for ${email}: ${url}`);
              }

              const { error } = await resend.emails.send({
                from: RESEND_FROM,
                to: email,
                subject: "Sign in to SemtexTech LMS",
                html: `
                  <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                    <h1 style="font-size: 24px; margin-bottom: 16px; color: #f97316;">Sign in to SemtexTech LMS</h1>
                    <p style="margin-bottom: 24px; color: #374151;">Click the button below to sign in to your account. This link will expire in 24 hours.</p>
                    <a href="${url}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                      Sign in to LMS
                    </a>
                    <p style="margin-top: 24px; font-size: 14px; color: #6b7280;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </div>
                `,
                text: `Sign in to SemtexTech LMS: ${url}`,
              });

              if (error) {
                if (process.env.NODE_ENV === "development") {
                  console.warn(`[DEV] Resend email failed for ${email} (sandbox only delivers to the Resend account owner). Link was logged above.`);
                  return; // Don't throw in dev — the console link is enough to test
                }
                console.error("Resend email error:", error);
                throw new Error("Failed to send verification email");
              }
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 }, // 7 days — balances UX with security; rotate via token refresh
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request", // For magic link sent page
  },
  events: {
    async signIn({ user }) {
      if (!user.email) return;

      try {
        await upsertUserFromAuth({
          email: user.email,
          name: user.name,
          image: user.image,
        });
      } catch (error) {
        console.error("Failed to sync user to database:", error);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        token.picture = user.image ?? token.picture;
      }

      const email = (user?.email ?? token.email) as string | undefined;
      if (!email) return token;

      if (user) {
        token.id = user.id ?? `email:${email}`;
        token.platformRole = resolvePlatformRole(email);
      } else {
        token.id ??= `email:${email}`;
        token.platformRole ??= resolvePlatformRole(email);
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const email = session.user.email ?? (token.email as string | undefined);
        session.user.id =
          (token.id as string | undefined) ??
          (email ? `email:${email}` : "");
        session.user.platformRole =
          (token.platformRole as PlatformRole | undefined) ??
          (email ? resolvePlatformRole(email) : "USER");
      }
      return session;
    },
  },
});