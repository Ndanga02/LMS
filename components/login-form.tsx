"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmail } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const errorMessages: Record<string, string> = {
  Configuration: "Email sign-in is not configured. Please contact support.",
  Default: "Something went wrong. Please try again.",
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode
    ? (errorMessages[errorCode] ?? errorMessages.Default)
    : null;

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!email) {
      setEmailError("Please enter your email");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("callbackUrl", callbackUrl);
      await signInWithEmail(formData);
      setEmailSent(true);
    } catch {
      setEmailError("Failed to send magic link. Please try again.");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-primary/10 shadow-lg shadow-primary/5">
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to access your courses and dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {errorMessage && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <Field>
              {!emailSent ? (
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full"
                    />
                  </div>
                  <input type="hidden" name="callbackUrl" value={callbackUrl} />
                  <Button type="submit" className="w-full">
                    Send magic link
                  </Button>
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground text-center">
                    We&apos;ll email you a secure link to sign in. No password needed.
                  </p>
                </form>
              ) : (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
                  <p className="text-sm font-medium">Check your email</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We sent a magic link to <span className="font-medium">{email}</span>.
                    It expires in 24 hours.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => {
                      setEmailSent(false);
                      setEmail("");
                    }}
                  >
                    Use a different email
                  </Button>
                </div>
              )}
            </Field>
          </FieldGroup>

          <div className="text-center text-xs mt-4">
            <a href="/forgot-password" className="text-primary hover:underline">
              Forgot access? Send magic link
            </a>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-xs">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </FieldDescription>
    </div>
  );
}
