export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Search, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/permissions";
import { requireSessionUser } from "@/lib/session";

const ITEMS_PER_PAGE = 50;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AuditLogPage({ searchParams }: Props) {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/admin/audit");
  if (sessionUser.platformRole !== "SUPER_ADMIN") {
    const allowed = await isSuperAdmin(sessionUser.id).catch(() => false);
    if (!allowed) redirect("/dashboard");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const actionFilter = typeof params.action === "string" ? params.action : "";
  const search = typeof params.q === "string" ? params.q : "";

  const where: Record<string, unknown> = {};
  if (actionFilter) where.action = actionFilter;
  if (search) {
    where.OR = [
      { actorId: { contains: search } },
      { targetId: { contains: search } },
      { action: { contains: search } },
    ];
  }

  const [total, logs, actions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: true,
      orderBy: { _count: { action: "desc" } },
    }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const buildHref = (overrides: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    if (actionFilter && !overrides.action) sp.set("action", actionFilter);
    if (overrides.page) sp.set("page", overrides.page);
    if (overrides.action) sp.set("action", overrides.action);
    return `/admin/audit?${sp.toString()}`;
  };

  return (
    <AppShell title="Audit Log">
      <PageHeader
        title="Audit Log"
        description="Immutable record of security-sensitive operations across all tenants."
        action={
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 size-4" />
              Back to Admin
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Search by actor, target, or action name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input name="q" defaultValue={search} placeholder="Actor ID, target ID, action..." className="pl-8" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
              <select name="action" className="rounded-md border bg-background p-2 text-sm min-w-[180px]" defaultValue={actionFilter}>
                <option value="">All actions</option>
                {actions.map((a) => (
                  <option key={a.action} value={a.action}>
                    {a.action} ({a._count})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">Apply</Button>
            {(search || actionFilter) && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/audit">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Shield className="size-5 text-primary" />
            Events ({total} total)
          </CardTitle>
          <CardDescription>Page {page} of {totalPages || 1}</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events match your filters.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border px-3 py-2 text-xs">
                  <Shield className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <Badge variant="secondary" className="font-mono text-[10px]">{log.action}</Badge>
                    <span className="ml-2 text-muted-foreground">
                      by <span className="font-mono">{log.actorId.slice(0, 12)}</span>
                      {log.tenantId && <> · tenant: <span className="font-mono">{log.tenantId.slice(0, 12)}</span></>}
                      {log.targetId && <> · target: <span className="font-mono">{log.targetId.slice(0, 12)}</span></>}
                    </span>
                  </div>
                  <span className="shrink-0 text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)} of {total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={buildHref({ page: String(page - 1) })}>
                      <ChevronLeft className="mr-1 size-3" />
                      Previous
                    </Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={buildHref({ page: String(page + 1) })}>
                      Next
                      <ChevronRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
