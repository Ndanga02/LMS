import { notFound } from "next/navigation";
import { prisma, isDbError } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home } from "lucide-react";
import { CertificateActions } from "@/components/certificate-actions";
import Link from "next/link";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function CertificateVerificationPage({ params }: Props) {
  const { code } = await params;

  try {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateCode: code.toUpperCase() },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true, tenant: { select: { name: true, slug: true } } } },
        enrollment: { select: { progressPercent: true } },
      },
    });

    if (!certificate) {
      notFound();
    }

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-svh bg-muted/30 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">Official Certificate</Badge>
          <h1 className="font-serif text-4xl tracking-tight">Certificate of Completion</h1>
          <p className="text-muted-foreground mt-2">Verified on {issuedDate}</p>
        </div>

        <Card className="certificate border-2 border-primary/30 bg-card p-8 md:p-12 print:shadow-none print:border print:p-8">
          <div className="text-center space-y-6">
            <div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="font-serif text-3xl md:text-4xl tracking-tight">
                {certificate.user.name || "Learner"}
              </h2>
              <p className="text-muted-foreground">has successfully completed</p>
            </div>

            <div className="py-4">
              <h3 className="text-2xl md:text-3xl font-semibold text-primary tracking-tight">
                {certificate.course.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {certificate.course.tenant.name}
              </p>
            </div>

            {certificate.finalScore !== null && (
              <div>
                <Badge variant="outline" className="text-base px-4 py-1">
                  Final Score: {certificate.finalScore}%
                </Badge>
              </div>
            )}

            <div className="pt-6 border-t text-sm text-muted-foreground space-y-1">
              <p>Certificate Code: <span className="font-mono font-medium text-foreground">{certificate.certificateCode}</span></p>
              <p>Issued: {issuedDate}</p>
              <p>Progress at completion: {certificate.enrollment?.progressPercent || 100}%</p>
            </div>

            <div className="pt-4 text-xs text-muted-foreground">
              This certificate verifies that the above named individual has demonstrated
              proficiency in the course material through assessment and engagement.
            </div>
          </div>
        </Card>

        <CertificateActions
          certificateCode={certificate.certificateCode}
          courseTitle={certificate.course.title}
          tenantName={certificate.course.tenant.name}
          tenantSlug={certificate.course.tenant.slug}
        />

        <p className="text-center text-[10px] text-muted-foreground mt-8 print:hidden">
          Verify this certificate anytime at this URL. Code: {certificate.certificateCode}
        </p>
      </div>
    </div>
  );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <div className="min-h-svh bg-muted/30 py-12 px-4">
          <div className="mx-auto max-w-md text-center space-y-4">
            <h1 className="font-serif text-2xl">Certificate unavailable</h1>
            <p className="text-muted-foreground">The certificate database is currently unavailable. Please try again later.</p>
            <Button asChild>
              <Link href="/"><Home className="size-4" /> Home</Link>
            </Button>
          </div>
        </div>
      );
    }
    throw error;
  }
}
