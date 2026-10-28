import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, badRequest, ok } from '@/lib/api-response';
import { qrPayloadFor, writeAudit } from '@/lib/equipment';

export async function GET(request) {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');

  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get('q')?.trim();
  const categoryId = searchParams.get('categoryId')?.trim();
  const status = searchParams.get('status')?.trim();
  const condition = searchParams.get('condition')?.trim();
  const group = searchParams.get('group');

  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
    ...(condition ? { condition } : {}),
    ...(keyword
      ? {
          OR: [
            { code: { contains: keyword, mode: 'insensitive' } },
            { name: { contains: keyword, mode: 'insensitive' } },
            { serialNumber: { contains: keyword, mode: 'insensitive' } }
          ]
        }
      : {})
  };

  const equipment = await prisma.equipment.findMany({
    where,
    include: { category: true, location: true },
    orderBy: { code: 'asc' }
  });

  if (group === 'category') {
    const byCategory = new Map();
    for (const item of equipment) {
      const key = item.category?.name ?? 'Chưa phân loại';
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
    }
    return ok({ equipment, byCategory: [...byCategory].map(([name, count]) => ({ name, count })) });
  }
  return ok(equipment);
}

export async function POST(request) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền quản lý kho');
  const body = await request.json().catch(() => ({}));
  const code = body.code?.trim().toUpperCase();
  if (!code || !body.name?.trim()) return badRequest('Mã và tên thiết bị là bắt buộc');
  const quantity = Number.parseInt(body.quantity, 10);
  const fee = Number(body.replacementFee);
  try {
    const equipment = await prisma.equipment.create({
      data: {
        code,
        name: body.name.trim(),
        model: body.model?.trim() || null,
        serialNumber: body.serialNumber?.trim() || null,
        qrPayload: qrPayloadFor(code),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        replacementFee: Number.isFinite(fee) ? fee : 0,
        categoryId: body.categoryId || null,
        locationId: body.locationId || null,
        notes: body.notes?.trim() || null
      },
      include: { category: true, location: true }
    });
    await writeAudit('CREATE_EQUIPMENT', { userId: access.user.id, equipmentId: equipment.id, detail: { code } });
    return ok(equipment, 201);
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ message: 'Mã hoặc serial thiết bị đã tồn tại' }, { status: 409 });
    throw error;
  }
}
