export const dynamic = "force-dynamic";

import { DbUnavailable } from "@/components/db-unavailable";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { isDbError, prisma } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { updateProfileAction } from "@/app/actions/settings";
import { Mail, User, Link as LinkIcon, Info } from "lucide-react";

export default async function SettingsPage() {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/settings");

  try {
    const userId = await resolveDbUserId(sessionUser);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        bio: true,
        title: true,
        websiteUrl: true,
        emailNotifications: true,
      },
    });

    if (!user) {
      return (
        <AppShell title="Settings">
          <div className="flex flex-1 flex-col gap-6">
            <PageHeader title="Settings" description="Manage your profile and preferences." />
            <p className="text-sm text-muted-foreground">User not found.</p>
          </div>
        </AppShell>
      );
    }

    return (
      <AppShell title="Settings">
        <div className="flex flex-1 flex-col gap-6 @container/main">
          <PageHeader
            title="Settings"
            description="Manage your profile and preferences."
          />

          <form action={updateProfileAction}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <User className="size-5 text-primary" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Update your personal information and public profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar size="lg" className="size-16">
                    <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                    <AvatarFallback className="text-lg">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Avatar</p>
                    <p className="text-xs text-muted-foreground">
                      Enter a URL for your profile image above.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Your full name"
                      defaultValue={user.name ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user.email}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email is managed via your authentication provider.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Professional title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. Senior Software Engineer @ Acme"
                    defaultValue={user.title ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Tell us about yourself..."
                    rows={4}
                    defaultValue={user.bio ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Avatar URL</Label>
                  <Input
                    id="image"
                    name="image"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    defaultValue={user.image ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    defaultValue={user.websiteUrl ?? ""}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif">
                  <Mail className="size-5 text-primary" />
                  Email preferences
                </CardTitle>
                <CardDescription>
                  Control which emails you receive from the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="emailNotifications"
                    name="emailNotifications"
                    defaultChecked={user.emailNotifications ?? true}
                  />
                  <div>
                    <Label htmlFor="emailNotifications" className="text-sm font-medium">
                      Email notifications
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Receive streak reminders, certificate notifications, and course updates.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg">
                Save changes
              </Button>
            </div>
          </form>
        </div>
      </AppShell>
    );
  } catch (error) {
    if (isDbError(error)) {
      return (
        <AppShell title="Settings">
          <DbUnavailable title="Settings unavailable" />
        </AppShell>
      );
    }
    throw error;
  }
}
