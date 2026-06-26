"use server";

import { prisma, isDbError } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfileAction(formData: FormData) {
  const sessionUser = await requireSessionUser("/login?callbackUrl=/settings");

  const name = formData.get("name") as string | null;
  const bio = formData.get("bio") as string | null;
  const image = formData.get("image") as string | null;
  const title = formData.get("title") as string | null;
  const websiteUrl = formData.get("websiteUrl") as string | null;
  const emailNotifications = formData.get("emailNotifications") === "on";

  try {
    const userId = await resolveDbUserId(sessionUser);

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || null,
        bio: bio || null,
        image: image || null,
        title: title || null,
        websiteUrl: websiteUrl || null,
        emailNotifications,
      },
    });

    revalidatePath("/settings");
  } catch (error) {
    if (isDbError(error)) {
      throw new Error("Database unavailable. Please try again later.");
    }
    throw error;
  }

  redirect("/settings");
}
