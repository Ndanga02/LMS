"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="mx-auto max-w-md border-destructive/20 shadow-sm shadow-destructive/5">
        <CardHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <CardTitle className="font-serif text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again or return home.
          </CardDescription>
        </CardHeader>
        {error.digest && (
          <CardContent>
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground break-all font-mono">
              Error ID: {error.digest}
            </p>
          </CardContent>
        )}
        <CardFooter className="gap-2">
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="size-4" />
              Home
            </Link>
          </Button>
          <Button onClick={reset}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
