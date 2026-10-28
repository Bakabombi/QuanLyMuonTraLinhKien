import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';

/** Thông báo của người dùng hiện tại (phiếu được duyệt, quá hạn, nhắc trả...). */
export async function GET() {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');
  const notifications = await prisma.notification.findMany({
    where: { userId: access.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  const unread = notifications.filter((item) => !item.readAt).length;
  return ok({ notifications, unread });
}

/** Đánh dấu đã đọc toàn bộ thông báo. */
export async function PATCH() {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');
  await prisma.notification.updateMany({ where: { userId: access.user.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
