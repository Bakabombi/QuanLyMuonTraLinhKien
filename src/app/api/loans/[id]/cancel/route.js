import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';

/** Sinh viên tự huỷ phiếu mượn khi phiếu còn ở trạng thái chờ duyệt. */
export async function PATCH(_request, { params }) {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');
  const { id } = await params;
  const loan = await prisma.loan.findUnique({ where: { id }, include: { items: true } });
  if (!loan || loan.borrowerId !== access.user.id) {
    return NextResponse.json({ message: 'Không tìm thấy phiếu mượn của bạn' }, { status: 404 });
  }
  if (loan.status !== 'PENDING') {
    return NextResponse.json({ message: 'Chỉ có thể huỷ phiếu đang chờ duyệt' }, { status: 409 });
  }

  const equipmentIds = loan.items.map((item) => item.equipmentId);
  const result = await prisma.$transaction(async (tx) => {
    await tx.equipment.updateMany({ where: { id: { in: equipmentIds }, status: 'RESERVED' }, data: { status: 'AVAILABLE' } });
    await writeAudit('CANCEL_LOAN', { userId: access.user.id, detail: { code: loan.code } });
    return tx.loan.update({ where: { id }, data: { status: 'CANCELLED' } });
  });
  return ok(result);
}
