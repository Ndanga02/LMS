export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DbUnavailable } from "@/components/db-unavailable";
import { requireSessionUser } from "@/lib/session";
import { isDbError, prisma } from "@/lib/db";
import { hasTenantRole } from "@/lib/permissions";
import { getTenantBySlug } from "@/lib/tenant";
import { inviteMemberAction, updateMemberRoleAction, removeMemberAction } from "@/app/actions/members";

type Props = {
  params: Promise<{ tenantSlug: string }>;
};

const roleBadge: Record<string, "default" | "secondary" | "outline"> = {
  TENANT_ADMIN: "default",
  INSTRUCTOR: "secondary",
  STUDENT: "outline",
};

export default async function MembersPage({ params }: Props) {
  const { tenantSlug } = await params;
  const sessionUser = await requireSessionUser(`/login?callbackUrl=/t/${tenantSlug}/admin/members`);

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) notFound();

    const allowed = await hasTenantRole(tenant.id, sessionUser.id, ["TENANT_ADMIN"]);
    if (!allowed) redirect(`/t/${tenantSlug}/courses`);

    const members = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });

    return (
    <AppShell title={`${tenant.name} Members`} tenant={{ name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl, logoDarkUrl: tenant.logoDarkUrl, primaryColor: tenant.primaryColor }}>
      <PageHeader
        title="Team Members"
        description="Invite members and manage roles."
        action={
          <Button variant="outline" asChild>
            <Link href={`/t/${tenantSlug}/admin`}>Back to admin</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Invite Member</CardTitle>
          <CardDescription>Add a new member by email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={inviteMemberAction.bind(null, tenantSlug)} className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email">Email address</Label>
              <Input id="invite-email" name="email" type="email" placeholder="colleague@company.com" required />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <select id="invite-role" name="role" className="w-full rounded-md border bg-background p-2 text-sm">
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="TENANT_ADMIN">Admin</option>
              </select>
            </div>
            <Button type="submit" variant="secondary">Invite</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {m.user.name?.[0] ?? m.user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.user.name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{m.user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={roleBadge[m.role] ?? "outline"}>{m.role.replace("_", " ")}</Badge>
                  <form action={updateMemberRoleAction.bind(null, tenantSlug)} className="flex items-center gap-1">
                    <input type="hidden" name="membershipId" value={m.id} />
                    <select name="role" className="rounded-md border bg-background px-2 py-1 text-xs">
                      <option value="STUDENT" disabled={m.role === "STUDENT"}>Student</option>
                      <option value="INSTRUCTOR" disabled={m.role === "INSTRUCTOR"}>Instructor</option>
                      <option value="TENANT_ADMIN" disabled={m.role === "TENANT_ADMIN"}>Admin</option>
                    </select>
                    <Button type="submit" variant="ghost" size="sm">Change</Button>
                  </form>
                  <form action={removeMemberAction.bind(null, tenantSlug)}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:text-destructive">Remove</Button>
                  </form>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No members yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable title="Members unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
