import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';

/** Cán bộ xưởng xác nhận (hoặc từ chối) yêu cầu mượn thiết bị. */
export async function PATCH(request, { params }) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền xác nhận');
  const { id } = await params;
  const { approved = true, note } = await request.json().catch(() => ({}));
  const loan = await prisma.loan.findUnique({ where: { id }, include: { items: true } });
  if (!loan || loan.status !== 'PENDING') return NextResponse.json({ message: 'Phiếu không thể xác nhận' }, { status: 409 });

  const equipmentIds = loan.items.map((item) => item.equipmentId);
  const updated = await prisma.$transaction(async (tx) => {
    if (!approved) {
      await tx.equipment.updateMany({ where: { id: { in: equipmentIds }, status: 'RESERVED' }, data: { status: 'AVAILABLE' } });
    }
    const result = await tx.loan.update({
      where: { id },
      data: { status: approved ? 'APPROVED' : 'REJECTED', approvedById: access.user.id, handledById: access.user.id, note: note?.trim() || null }
    });
    await tx.notification.create({
      data: {
        userId: loan.borrowerId,
        loanId: loan.id,
        type: approved ? 'LOAN_APPROVED' : 'LOAN_REJECTED',
        title: approved ? 'Yêu cầu mượn đã được duyệt' : 'Yêu cầu mượn bị từ chối',
        message: approved
          ? `Phiếu ${loan.code} đã được duyệt. Vui lòng đến xưởng nhận thiết bị theo hạn trả đã đăng ký.`
          : `Phiếu ${loan.code} bị từ chối${note?.trim() ? `: ${note.trim()}` : '.'}`
      }
    });
    await writeAudit(approved ? 'APPROVE_LOAN' : 'REJECT_LOAN', { userId: access.user.id, detail: { code: loan.code } });
    return result;
  });
  return ok(updated);
}
