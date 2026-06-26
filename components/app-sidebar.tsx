"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpenIcon,
  GraduationCapIcon,
  HomeIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  BellIcon,
  BarChart3Icon,
  Calendar,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import logo from "@/public/logo.png";

export type SidebarUser = {
  name: string;
  email: string;
  avatar: string;
};

export type TenantInfo = {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  primaryColor: string | null;
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: SidebarUser | null;
  isSuperAdmin?: boolean;
  tenant?: TenantInfo;
};

export function AppSidebar({
  user,
  isSuperAdmin,
  tenant,
  ...props
}: AppSidebarProps) {
  const navMain = [
    {
      title: "Home",
      url: "/",
      icon: <HomeIcon />,
      items: [],
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
      items: [],
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: <BarChart3Icon />,
      items: [],
    },
    {
      title: "Courses",
      url: "/courses",
      icon: <BookOpenIcon />,
      items: [
        { title: "Marketplace", url: "/courses" },
        { title: "Platform tenant", url: "/t/platform/courses" },
      ],
    },
        ...(isSuperAdmin
          ? [
              {
                title: "Admin",
                url: "/admin",
                icon: <ShieldIcon />,
                items: [
                  { title: "Platform", url: "/admin" },
                  { title: "Analytics", url: "/analytics" },
                  { title: "Audit log", url: "/admin/audit" },
                ],
              },
            ]
          : []),
  ];

  const learning = [
    {
      name: "My learning",
      url: "/dashboard",
      icon: <GraduationCapIcon />,
    },
    {
      name: "Analytics",
      url: "/analytics",
      icon: <BarChart3Icon />,
    },
    {
      name: "Achievements",
      url: "/achievements",
      icon: <GraduationCapIcon />,
    },
    {
      name: "Browse catalog",
      url: "/courses",
      icon: <BookOpenIcon />,
    },
    {
      name: "Notifications",
      url: "/notifications",
      icon: <BellIcon />,
    },
    {
      name: "Calendar",
      url: "/calendar",
      icon: <Calendar />,
    },
    {
      name: "My Grades",
      url: "/my-learning/grades",
      icon: <GraduationCapIcon />,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={tenant ? `/t/${tenant.slug}` : "/"}>
                {tenant?.logoUrl ? (
                  <Image
                    src={tenant.logoUrl}
                    alt={tenant.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg object-contain"
                  />
                ) : (
                  <Image
                    src={logo}
                    alt="SemtexTech"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg"
                  />
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {tenant?.name ?? "SemtexTech"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {tenant ? `${tenant.name} LMS` : "Learning Platform"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <SidebarMenu className="px-2">
          <SidebarMenuItem className="px-2 pb-2 pt-4 text-xs font-medium text-muted-foreground">
            Quick links
          </SidebarMenuItem>
          {learning.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild tooltip={item.name}>
                <Link href={item.url}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser user={user} />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/login">Sign in</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}