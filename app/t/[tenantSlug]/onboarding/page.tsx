export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/color-picker";
import { DbUnavailable } from "@/components/db-unavailable";
import { requireSessionUser } from "@/lib/session";
import { hasTenantRole } from "@/lib/permissions";
import { isDbError } from "@/lib/db";
import { getTenantBySlug } from "@/lib/tenant";
import { updateTenantAction } from "@/app/actions/tenant";

type Props = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function OnboardingPage({ params }: Props) {
  const { tenantSlug } = await params;
  const sessionUser = await requireSessionUser(`/login?callbackUrl=/t/${tenantSlug}/onboarding`);

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) notFound();

    const allowed = await hasTenantRole(tenant.id, sessionUser.id, ["TENANT_ADMIN"]);
    if (!allowed) redirect(`/t/${tenantSlug}`);

    // If already completed, redirect to admin
    if (tenant.onboardingComplete) {
      redirect(`/t/${tenantSlug}/admin`);
    }

    return (
    <AppShell title={`Set up ${tenant.name}`} tenant={{ name: tenant.name, slug: tenant.slug, logoUrl: tenant.logoUrl, logoDarkUrl: tenant.logoDarkUrl, primaryColor: tenant.primaryColor }}>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {tenant.name}</CardTitle>
            <CardDescription>
              Let&apos;s get your LMS instance set up. Fill in the details below to customize your learning platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateTenantAction.bind(null, tenantSlug)} className="space-y-6">
              <div>
                <Label htmlFor="name">Tenant Name</Label>
                <Input id="name" name="name" defaultValue={tenant.name} required />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={tenant.description ?? ""} rows={3} placeholder="Describe what your organization teaches..." />
              </div>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={tenant.websiteUrl ?? ""} placeholder="https://your-company.com" />
              </div>

              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input id="supportEmail" name="supportEmail" type="email" defaultValue={tenant.supportEmail ?? ""} placeholder="support@your-company.com" />
              </div>

              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <ColorPicker name="primaryColor" defaultValue={tenant.primaryColor ?? "#f97316"} />
              </div>

              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" name="logoUrl" defaultValue={tenant.logoUrl ?? ""} placeholder="https://your-company.com/logo.png" />
                <p className="mt-1 text-xs text-muted-foreground">A square logo works best (32x32 or larger).</p>
              </div>

              <input type="hidden" name="onboardingComplete" value="true" />

              <Button type="submit" variant="secondary" className="w-full">
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell>
          <DbUnavailable title="Onboarding unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
