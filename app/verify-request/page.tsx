import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Image from "next/image";
import logo from "@/public/logo.png";

export default function VerifyRequestPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-muted p-6 md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.18_27/0.12),transparent_55%)]"
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-primary/10 shadow-lg shadow-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="size-6 text-primary" />
            </div>
            <CardTitle className="font-serif text-2xl">Check your email</CardTitle>
            <CardDescription className="text-base">
              We sent you a secure magic link. Click it to sign in instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              The link expires in 24 hours. If you don't see it, check your spam folder.
            </p>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <Image src={logo} alt="SemtexTech" width={16} height={16} className="h-4 w-4 rounded" />
            SemtexTech LMS
          </Link>
        </div>
      </div>
    </div>
  );
}
