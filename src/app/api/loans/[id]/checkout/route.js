import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { parseQrPayload, writeAudit } from '@/lib/equipment';

/** Cán bộ xưởng bàn giao thiết bị. Có thể truyền danh sách mã QR đã quét để đối chiếu. */
export async function PATCH(request, { params }) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền bàn giao');
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { items: { include: { equipment: { select: { id: true, code: true } } } } }
  });
  if (!loan || loan.status !== 'APPROVED') return NextResponse.json({ message: 'Phiếu chưa được duyệt hoặc đã bàn giao' }, { status: 409 });

  const equipmentIds = loan.items.map((item) => item.equipmentId);

  // Nếu cán bộ quét QR khi bàn giao, kiểm tra đủ và đúng thiết bị trong phiếu.
  if (Array.isArray(body.scannedCodes) && body.scannedCodes.length > 0) {
    const scanned = new Set(body.scannedCodes.map((value) => parseQrPayload(value)?.toUpperCase()));
    const missing = loan.items.filter((item) => !scanned.has(item.equipment.code.toUpperCase())).map((item) => item.equipment.code);
    if (missing.length > 0) {
      return NextResponse.json({ message: `Chưa quét đủ thiết bị: ${missing.join(', ')}` }, { status: 409 });
    }
  }

  const reserved = await prisma.equipment.findMany({ where: { id: { in: equipmentIds } }, select: { id: true, status: true } });
  const notReady = reserved.filter((item) => item.status === 'RESERVED');
  if (notReady.length !== equipmentIds.length) {
    return NextResponse.json({ message: 'Có thiết bị không ở trạng thái giữ chỗ, kiểm tra lại kho' }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.equipment.updateMany({ where: { id: { in: equipmentIds } }, data: { status: 'BORROWED', lastCheckedAt: new Date() } });
    const updated = await tx.loan.update({
      where: { id },
      data: { status: 'CHECKED_OUT', checkedOutAt: new Date(), handledById: access.user.id }
    });
    await tx.notification.create({
      data: {
        userId: loan.borrowerId,
        loanId: loan.id,
        type: 'LOAN_CHECKED_OUT',
        title: 'Đã bàn giao thiết bị',
        message: `Phiếu ${loan.code} đã bàn giao. Hạn trả: ${new Date(loan.expectedReturnAt).toLocaleString('vi-VN')}.`
      }
    });
    await writeAudit('CHECKOUT_LOAN', { userId: access.user.id, detail: { code: loan.code, equipmentIds } });
    return updated;
  });
  return ok(result);
}
