import { requireUser, adminRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';

/** Nhật ký truy vết thao tác quan trọng — chỉ quản trị viên. */
export async function GET(request) {
  const access = await requireUser(adminRoles);
  if (access.error) return accessError(access.error, 'Chỉ quản trị viên được xem nhật ký truy vết');
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action')?.trim();
  const take = Math.min(Number.parseInt(searchParams.get('take') ?? '100', 10) || 100, 500);

  const logs = await prisma.auditLog.findMany({
    where: action ? { action } : {},
    include: {
      user: { select: { fullName: true, email: true, role: true } },
      equipment: { select: { code: true, name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take
  });
  return ok(logs);
}
