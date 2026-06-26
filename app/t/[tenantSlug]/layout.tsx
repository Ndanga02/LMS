import { getTenantBySlug } from "@/lib/tenant";
import { notFound } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
};

export default async function TenantLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  return (
    <div
      style={{
        "--tenant-primary": tenant.primaryColor ?? "#f97316",
        "--tenant-secondary": tenant.secondaryColor ?? "#171717",
        "--tenant-accent": tenant.accentColor ?? "#f97316",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
