import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export type TenantBranding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  primaryColor: string | null;
};

type LmsShellProps = {
  children: React.ReactNode;
  title?: string;
  tenant?: TenantBranding | null;
};

export async function LmsShell({ children, title, tenant }: LmsShellProps) {
  const session = await auth();

  const sidebarUser = session?.user
    ? {
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        avatar: session.user.image ?? "",
      }
    : null;

  const sessionUserId = session?.user?.id;
  let notificationData = { unread: 0, notifications: [] as any[] };
  if (sessionUserId && session.user?.email) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser) {
        const [unread, notifications] = await Promise.all([
          prisma.notification.count({ where: { userId: dbUser.id, readAt: null } }),
          prisma.notification.findMany({
            where: { userId: dbUser.id },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        ]);
        notificationData = { unread, notifications };
      }
    } catch {
      // Notifications unavailable - silently degrade
    }
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={sidebarUser}
        isSuperAdmin={session?.user?.platformRole === "SUPER_ADMIN"}
        tenant={tenant ?? undefined}
      />
      <SidebarInset>
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          {title && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-serif">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {session?.user && (
              <NotificationBell
                initialUnread={notificationData.unread}
                initialNotifications={notificationData.notifications}
              />
            )}
            {session?.user && (
              <form action={handleSignOut}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 bg-muted/20 p-4 pt-0 md:gap-6 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}