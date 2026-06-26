"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy } from "lucide-react";

type CertificateDisplayProps = {
  certificateCode: string;
  issuedAt: string | Date;
  finalScore?: number | null;
};

export function CertificateDisplay({ certificateCode, issuedAt, finalScore }: CertificateDisplayProps & { finalScore?: number | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(certificateCode);
      setCopied(true);
      toast.success("Certificate code copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const verifyUrl = `/cert/${certificateCode}`;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
        <CheckCircle2 className="size-4" /> Certificate earned
      </div>

      {finalScore != null && (
        <div className="mt-2">
          <Badge variant="secondary">Final Score: {finalScore}%</Badge>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-2">
        <p className="text-xs text-muted-foreground">
          Code: <span className="font-mono text-foreground font-medium">{certificateCode}</span>
        </p>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5" onClick={handleCopy}>
          {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>

      <p className="mt-1 text-[10px] text-muted-foreground">
        Issued {new Date(issuedAt).toLocaleDateString()}
      </p>

      <div className="mt-3 flex gap-2 justify-center">
        <Button asChild size="sm" variant="outline">
          <a href={verifyUrl} target="_blank" rel="noopener">View &amp; Verify</a>
        </Button>
        <Button size="sm" onClick={() => window.open(verifyUrl, "_blank")}>
          Open Printable Version
        </Button>
      </div>
    </div>
  );
}
