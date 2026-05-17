import { db } from "@/lib/db/db";

export type NotificationType = "GOAL_SUBMITTED" | "GOAL_APPROVED" | "GOAL_REJECTED" | "CHECKIN_DUE";

export class NotificationService {
  /**
   * Creates a notification for a user
   */
  static async create({
    userId,
    title,
    message,
    type,
    link,
  }: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
  }) {
    return await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    });
  }

  /**
   * Marks a notification as read
   */
  static async markAsRead(notificationId: string) {
    return await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Fetches unread notifications for a user
   */
  static async getUnread(userId: string) {
    return await db.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
