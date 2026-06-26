export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Building2, History, Shield, AlertTriangle, CheckCircle, Search, Download, ListOrdered } from "lucide-react";
import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { SectionCards } from "@/components/section-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureAppBootstrap } from "@/lib/bootstrap";
import { isDbError, prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/permissions";
import { requireSessionUser } from "@/lib/session";
import { CreateTenantForm } from "@/components/create-tenant-form";
import { TenantStatusSelect } from "@/components/tenant-status-select";
import { suspendUserAction, unsuspendUserAction } from "@/app/actions/admin";

const statusBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  PENDING: "secondary",
  SUSPENDED: "destructive",
};

export default async function PlatformAdminPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/admin");

  if (sessionUser.platformRole !== "SUPER_ADMIN") {
    const allowed = await isSuperAdmin(sessionUser.id).catch(() => false);
    if (!allowed) redirect("/dashboard");
  }

  try {
    await ensureAppBootstrap();

    const [tenants, courses, users, enrollments] = await Promise.all([
      prisma.tenant.count(),
      prisma.course.count(),
      prisma.user.count(),
      prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    ]);

    const [allTenants, recentUsers, recentAuditLogs] = await Promise.all([
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { memberships: true, courses: true } } },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          name: true,
          email: true,
          platformRole: true,
          suspendedAt: true,
          createdAt: true,
          _count: { select: { enrollments: true, memberships: true } },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return (
      <AppShell title="Platform Admin">
        <PageHeader
          title="Super Admin"
          description="Oversee tenants, users, and platform-wide activity."
          action={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin/audit">
                  <History className="mr-2 size-4" />
                  Audit Log
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/t/platform/admin">Platform tenant</Link>
              </Button>
            </div>
          }
        />

        <SectionCards
          stats={[
            { label: "Tenants", value: tenants, description: "Organizations" },
            { label: "Courses", value: courses, description: "All courses" },
            { label: "Users", value: users, description: "Registered users" },
            { label: "Enrollments", value: enrollments, description: "Active enrollments" },
          ]}
        />

        {/* All Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Building2 className="size-5 text-primary" />
              All Tenants ({allTenants.length})
            </CardTitle>
            <CardDescription>Manage all organizations on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <Link href={`/t/${tenant.slug}/admin`} className="font-medium hover:underline">
                        {tenant.name}
                      </Link>
                      <span className="ml-2 text-xs text-muted-foreground">/{tenant.slug}</span>
                    </div>
                    <Badge variant={statusBadge[tenant.status] ?? "outline"}>{tenant.status}</Badge>
                    {tenant.isPlatform && <Badge variant="secondary">Platform</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{tenant._count.courses} courses</span>
                    <span>{tenant._count.memberships} members</span>
                    <TenantStatusSelect tenantId={tenant.id} currentStatus={tenant.status} />
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/t/${tenant.slug}/courses`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create New Tenant */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Tenant</CardTitle>
            <CardDescription>Spin up a new leased LMS instance for an organization (you will be added as TENANT_ADMIN).</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTenantForm />
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Users className="size-5 text-primary" />
              Users ({recentUsers.length} shown)
            </CardTitle>
            <CardDescription>View and manage platform users. Super admins cannot be suspended.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                    user.suspendedAt ? "border-destructive/20 bg-destructive/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{user.name ?? "Unnamed"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant={user.platformRole === "SUPER_ADMIN" ? "default" : "secondary"}>
                      {user.platformRole}
                    </Badge>
                    {user.suspendedAt ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                    <span className="text-muted-foreground">
                      {user._count.enrollments} enrollments
                    </span>
                    {user.platformRole !== "SUPER_ADMIN" && (
                      <form action={user.suspendedAt ? unsuspendUserAction : suspendUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className={user.suspendedAt ? "text-green-600" : "text-destructive"}
                        >
                          {user.suspendedAt ? "Unsuspend" : "Suspend"}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <History className="size-5 text-primary" />
              Audit Log (last 20)
            </CardTitle>
            <CardDescription>Immutable record of security-sensitive operations.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAuditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border px-3 py-2 text-xs">
                    <Shield className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="font-mono text-[10px]">{log.action}</Badge>
                      <span className="ml-2 text-muted-foreground">
                        by {log.actorId.slice(0, 8)}
                        {log.tenantId && <> · tenant: {log.tenantId.slice(0, 8)}</>}
                        {log.targetId && <> · target: {log.targetId.slice(0, 8)}</>}
                      </span>
                    </div>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/audit">
                  <ListOrdered className="mr-2 size-4" />
                  View full audit log with search & filters
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Download className="size-5 text-primary" />
              Export Data
            </CardTitle>
            <CardDescription>Download platform data as CSV or JSON.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(["users", "enrollments", "courses"] as const).map((resource) => (
                <div key={resource} className="flex items-center gap-1">
                  <span className="text-sm font-medium capitalize mr-1">{resource}</span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/v1/export?resource=${resource}&format=csv`}>CSV</a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/api/v1/export?resource=${resource}&format=json`}>JSON</a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="Platform Admin">
          <DbUnavailable title="Platform admin unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
