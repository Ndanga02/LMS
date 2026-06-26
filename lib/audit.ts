import { prisma } from "@/lib/db";

export type AuditAction =
  | "tenant.created"
  | "tenant.updated"
  | "tenant.deleted"
  | "course.created"
  | "course.updated"
  | "course.deleted"
  | "lesson.created"
  | "lesson.updated"
  | "lesson.deleted"
  | "enrollment.created"
  | "enrollment.revoked"
  | "user.role_changed"
  | "api_key.generated"
  | "api_key.rotated"
  | "settings.updated";

export async function recordAuditEvent(params: {
  action: AuditAction;
  actorId: string;
  tenantId?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        actorId: params.actorId,
        tenantId: params.tenantId ?? null,
        targetId: params.targetId ?? null,
        metadata: (params.metadata ?? {}) as any,
      },
    });
  } catch (error) {
    console.error("Failed to record audit event:", error);
  }
}
