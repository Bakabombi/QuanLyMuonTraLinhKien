import { NextResponse } from 'next/server';
import { requireUser, adminRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';

/**
 * Xoá phiếu mượn — chỉ quản trị viên.
 * Chỉ cho xoá phiếu đã kết thúc ở nhánh huỷ/từ chối (`CANCELLED` / `REJECTED`)
 * để không phá vỡ lịch sử mượn/trả và trạng thái thiết bị.
 */
export async function DELETE(_request, { params }) {
  const access = await requireUser(adminRoles);
  if (access.error) return accessError(access.error, 'Chỉ quản trị viên được xoá phiếu mượn');
  const { id } = await params;

  const loan = await prisma.loan.findUnique({ where: { id }, select: { id: true, code: true, status: true } });
  if (!loan) return NextResponse.json({ message: 'Không tìm thấy phiếu mượn' }, { status: 404 });
  if (!['CANCELLED', 'REJECTED'].includes(loan.status)) {
    return NextResponse.json(
      { message: 'Chỉ xoá được phiếu đã huỷ hoặc bị từ chối; các phiếu khác cần giữ lại để truy vết' },
      { status: 409 }
    );
  }

  await prisma.loan.delete({ where: { id } });
  await writeAudit('DELETE_LOAN', { userId: access.user.id, detail: { code: loan.code, status: loan.status } });
  return ok({ id });
}
