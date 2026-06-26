import Link from "next/link";
import { AlertTriangle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DbUnavailableProps = {
  title?: string;
};

export function DbUnavailable({
  title = "Database unavailable",
}: DbUnavailableProps) {
  return (
    <Card className="border-primary/10 shadow-sm shadow-primary/5">
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Database className="size-6" />
        </div>
        <CardTitle className="flex items-center gap-2 font-serif text-xl">
          <AlertTriangle className="size-5 text-destructive" />
          {title}
        </CardTitle>
        <CardDescription>
          You are signed in. LMS data needs a database connection to load.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-xl border border-primary/10 bg-muted/50 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Database connection required.</strong>{" "}
          Make sure your SUPABASE_URL (Supabase connection string) is correctly set in .env.
          Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            pnpm db:test
          </code>{" "}
          to verify.
        </p>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
          <li><strong>IPv6 issue (ENETUNREACH)?</strong> Use the <strong>Session Pooler</strong> URL from Supabase dashboard (recommended for most local networks).</li>
          <li>Copy the full connection string under "Session Pooler" and set it as SUPABASE_URL.</li>
          <li>Ensure the Supabase project is active.</li>
          <li>Then run: pnpm db:seed (if needed)</li>
        </ul>
      </CardContent>
      <CardFooter className="gap-2">
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild>
          <Link href="/courses">Browse courses</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}