import { NextResponse } from 'next/server';
import { requireUser, staffRoles, adminRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';

const conditions = ['GOOD', 'DAMAGED', 'LOST'];
const statuses = ['AVAILABLE', 'RESERVED', 'BORROWED', 'MAINTENANCE', 'RETIRED', 'LOST'];

/** Cập nhật thông tin thiết bị, bao gồm tình trạng (tốt/hỏng/mất) sau khi kiểm kê. */
export async function PATCH(request, { params }) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền quản lý kho');
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const data = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.model !== undefined) data.model = body.model?.trim() || null;
  if (body.categoryId !== undefined) data.categoryId = body.categoryId || null;
  if (body.locationId !== undefined) data.locationId = body.locationId || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (Number.isFinite(Number(body.replacementFee))) data.replacementFee = Number(body.replacementFee);
  if (body.condition) {
    if (!conditions.includes(body.condition)) return NextResponse.json({ message: 'Tình trạng không hợp lệ' }, { status: 400 });
    data.condition = body.condition;
    data.lastCheckedAt = new Date();
  }
  if (body.status) {
    if (!statuses.includes(body.status)) return NextResponse.json({ message: 'Trạng thái không hợp lệ' }, { status: 400 });
    data.status = body.status;
  }
  try {
    const equipment = await prisma.equipment.update({
      where: { id },
      data,
      include: { category: true, location: true }
    });
    await writeAudit('UPDATE_EQUIPMENT', { userId: access.user.id, equipmentId: id, detail: { condition: body.condition, status: body.status } });
    return ok(equipment);
  } catch {
    return NextResponse.json({ message: 'Không tìm thấy thiết bị hoặc dữ liệu không hợp lệ' }, { status: 404 });
  }
}

export async function GET(_request, { params }) {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');
  const { id } = await params;
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: { category: true, location: true, loanItems: { include: { loan: { select: { code: true, status: true, expectedReturnAt: true, borrower: { select: { fullName: true, studentCode: true } } } } }, orderBy: { id: 'desc' }, take: 10 } }
  });
  if (!equipment) return NextResponse.json({ message: 'Không tìm thấy thiết bị' }, { status: 404 });
  return ok(equipment);
}

/**
 * Xoá thiết bị khỏi hệ thống — chỉ quản trị viên.
 * Chỉ cho xoá khi thiết bị không đang giữ chỗ/cho mượn và chưa từng gắn với phiếu mượn,
 * nhằm giữ nguyên lịch sử mượn/trả phục vụ truy vết.
 */
export async function DELETE(_request, { params }) {
  const access = await requireUser(adminRoles);
  if (access.error) return accessError(access.error, 'Chỉ quản trị viên được xoá thiết bị');
  const { id } = await params;

  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: { _count: { select: { loanItems: true } } }
  });
  if (!equipment) return NextResponse.json({ message: 'Không tìm thấy thiết bị' }, { status: 404 });
  if (['RESERVED', 'BORROWED'].includes(equipment.status)) {
    return NextResponse.json({ message: 'Thiết bị đang giữ chỗ hoặc cho mượn, hãy xử lý phiếu trước khi xoá' }, { status: 409 });
  }
  if (equipment._count.loanItems > 0) {
    return NextResponse.json({ message: 'Thiết bị đã có lịch sử mượn/trả nên không thể xoá; hãy chuyển trạng thái sang "Thanh lý"' }, { status: 409 });
  }

  await prisma.equipment.delete({ where: { id } });
  await writeAudit('DELETE_EQUIPMENT', { userId: access.user.id, detail: { code: equipment.code, name: equipment.name } });
  return ok({ id });
}
