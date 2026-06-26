import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendCertificateEarnedEmail } from "@/lib/emails";

export async function issueCertificate(enrollmentId: string, userId: string, courseId: string, lessonId: string) {
  const existingCert = await prisma.certificate.findUnique({
    where: { enrollmentId },
  });
  if (existingCert) return existingCert;

  const code = `CERT-${courseId.slice(0, 6).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;

  let finalScore: number | null = null;
  try {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { type: true } });
    if (lesson?.type === "QUIZ") {
      const lastAttempt = await prisma.quizAttempt.findFirst({
        where: { userId, quiz: { lessonId } },
        orderBy: { completedAt: "desc" },
        select: { score: true },
      });
      if (lastAttempt) finalScore = lastAttempt.score;
    }
  } catch {}

  const newCert = await prisma.certificate.create({
    data: { enrollmentId, userId, courseId, certificateCode: code, finalScore },
  });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, tenant: { select: { name: true } } },
    });
    if (user?.email && course) {
      await sendCertificateEarnedEmail({
        to: user.email,
        learnerName: user.name || "",
        courseTitle: course.title,
        certificateCode: code,
        tenantName: course.tenant.name,
        finalScore,
      });
    }
  } catch (e) {
    console.error("Certificate email failed (non-fatal)", e);
  }

  return newCert;
}
