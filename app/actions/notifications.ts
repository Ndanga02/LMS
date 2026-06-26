"use server";

import { revalidatePath } from "next/cache";
import { prisma, isDbError } from "@/lib/db";
import { requireSessionUser, resolveDbUserId } from "@/lib/session";

export type CreateNotificationParams = {
  userId: string;
  type: "comment_reply" | "achievement_unlocked" | "course_update" | "enrollment" | "streak_reminder";
  title: string;
  body?: string;
  link?: string;
};

export async function createNotification(params: CreateNotificationParams) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function getUnreadNotificationCount() {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function getNotifications(page = 1, pageSize = 20) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return { notifications, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function markNotificationReadAction(notificationId: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
}

export async function dismissNotificationAction(notificationId: string) {
  const sessionUser = await requireSessionUser();
  const userId = await resolveDbUserId(sessionUser);

  await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });

  revalidatePath("/notifications");
}
