import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';

/** Danh mục và vị trí kho, dùng cho bộ lọc và form thêm thiết bị. */
export async function GET() {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');
  const [categories, locations] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { equipment: true } } } }),
    prisma.location.findMany({ orderBy: { code: 'asc' } })
  ]);
  return ok({ categories, locations });
}
