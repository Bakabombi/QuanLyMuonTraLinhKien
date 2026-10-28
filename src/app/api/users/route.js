import { NextResponse } from 'next/server';
import { requireUser, adminRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';

/** Danh sách người dùng trong hệ thống — chỉ quản trị viên. */
export async function GET(request) {
  const access = await requireUser(adminRoles);
  if (access.error) return accessError(access.error, 'Chỉ quản trị viên được xem danh sách người dùng');
  const role = request.nextUrl.searchParams.get('role')?.trim();
  const q = request.nextUrl.searchParams.get('q')?.trim();
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { studentCode: { contains: q, mode: 'insensitive' } }] } : {})
    },
    select: { id: true, fullName: true, email: true, studentCode: true, role: true, status: true, createdAt: true },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }]
  });
  return ok(users);
}
