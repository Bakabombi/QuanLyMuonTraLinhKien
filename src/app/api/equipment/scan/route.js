import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, badRequest, ok } from '@/lib/api-response';
import { findEquipmentByQr, writeAudit } from '@/lib/equipment';

/** Tra cứu thiết bị theo nội dung QR quét được. */
export async function GET(request) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền tra cứu QR');
  const value = request.nextUrl.searchParams.get('value');
  if (!value?.trim()) return badRequest('Thiếu nội dung QR cần tra cứu');
  const equipment = await findEquipmentByQr(value);
  if (!equipment) return NextResponse.json({ message: 'Không tìm thấy thiết bị với mã QR này' }, { status: 404 });
  return ok(equipment);
}

/** Cán bộ xưởng quét QR để kiểm kê: cập nhật tình trạng (tốt/hỏng/mất) và trạng thái. */
export async function POST(request) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền kiểm kê QR');
  const body = await request.json().catch(() => ({}));
  const equipment = await findEquipmentByQr(body.value);
  if (!equipment) return NextResponse.json({ message: 'Không tìm thấy thiết bị với mã QR này' }, { status: 404 });

  const conditions = ['GOOD', 'DAMAGED', 'LOST'];
  const data = {};
  if (body.condition) {
    if (!conditions.includes(body.condition)) return badRequest('Tình trạng không hợp lệ');
    data.condition = body.condition;
    data.status = body.condition === 'GOOD' ? 'AVAILABLE' : body.condition === 'DAMAGED' ? 'MAINTENANCE' : 'LOST';
  }
  if (Object.keys(data).length === 0) return badRequest('Cần gửi tình trạng kiểm kê');

  const updated = await prisma.equipment.update({
    where: { id: equipment.id },
    data: { ...data, lastCheckedAt: new Date() },
    include: { category: true, location: true }
  });
  await writeAudit('QR_CHECK', { userId: access.user.id, equipmentId: updated.id, detail: { condition: updated.condition, status: updated.status } });
  return ok(updated);
}
