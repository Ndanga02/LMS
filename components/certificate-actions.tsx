"use client";

import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import Link from "next/link";

type CertificateActionsProps = {
  certificateCode: string;
  courseTitle: string;
  tenantName: string;
  tenantSlug: string;
};

export function CertificateActions({
  certificateCode,
  courseTitle,
  tenantName,
  tenantSlug,
}: CertificateActionsProps) {
  const handlePrint = () => {
    window.print();
  };

  const shareText = `I just earned my certificate in ${encodeURIComponent(courseTitle)} from ${encodeURIComponent(tenantName)}! Code: ${certificateCode}`;

  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center print:hidden">
      <Button onClick={handlePrint} size="lg" variant="outline">
        <Download className="mr-2 h-4 w-4" /> Download / Print PDF
      </Button>
      <Button asChild size="lg">
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Share2 className="mr-2 h-4 w-4" /> Share Achievement
        </a>
      </Button>
      <Button asChild variant="ghost" size="lg">
        <Link href={tenantSlug === "platform" ? `/courses` : `/t/${tenantSlug}/courses`}>
          Back to Learning
        </Link>
      </Button>
    </div>
  );
}
