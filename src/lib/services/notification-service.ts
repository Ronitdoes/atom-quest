import { db } from "@/lib/db/db";
import { isInternalPath, NotFoundError } from "@/lib/security/api";

export type NotificationType =
  | "GOAL_SUBMITTED"
  | "GOAL_APPROVED"
  | "GOAL_REJECTED"
  | "GOAL_UNLOCKED"
  | "CHECKIN_DUE"
  | "CHECKIN_ESCALATED"
  | "USER_UPDATED";

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
        link: isInternalPath(link) ? link : undefined,
      },
    });
  }

  /**
   * Marks a notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await db.notification.findFirst({
      where: { id: notificationId, userId },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found.");
    }

    return await db.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
  }

  /**
   * Fetches unread notifications for a user with pagination
   */
  static async getUnread(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      db.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      db.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total,
      },
    };
  }
}
