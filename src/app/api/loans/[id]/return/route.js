import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, badRequest, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';

const validConditions = ['GOOD', 'DAMAGED', 'LOST'];
const statusByCondition = { GOOD: 'AVAILABLE', DAMAGED: 'MAINTENANCE', LOST: 'LOST' };

/** Cán bộ xưởng nhận trả: đánh giá tình trạng từng thiết bị (tốt/hỏng/mất). */
export async function PATCH(request, { params }) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền nhận trả');
  const { id } = await params;
  const { items } = await request.json().catch(() => ({}));
  const loan = await prisma.loan.findUnique({ where: { id }, include: { items: { include: { equipment: true } } } });
  if (!loan || !['CHECKED_OUT', 'OVERDUE'].includes(loan.status)) {
    return NextResponse.json({ message: 'Phiếu chưa bàn giao hoặc đã hoàn tất' }, { status: 409 });
  }
  if (!Array.isArray(items) || items.length !== loan.items.length || items.some((item) => !validConditions.includes(item.conditionIn))) {
    return badRequest('Cần đánh giá tình trạng trả của từng thiết bị (GOOD/DAMAGED/LOST)');
  }

  const itemByEquipment = new Map(loan.items.map((item) => [item.equipmentId, item]));
  const harmed = [];
  let penaltyTotal = 0;

  const result = await prisma.$transaction(async (tx) => {
    for (const submitted of items) {
      const loanItem = itemByEquipment.get(submitted.equipmentId);
      if (!loanItem) continue;
      const fee = submitted.conditionIn === 'GOOD' ? 0 : Number(loanItem.equipment.replacementFee ?? 0);
      penaltyTotal += fee;
      if (submitted.conditionIn !== 'GOOD') harmed.push(loanItem.equipment);

      await tx.loanItem.update({
        where: { loanId_equipmentId: { loanId: id, equipmentId: submitted.equipmentId } },
        data: { conditionIn: submitted.conditionIn, isLost: submitted.conditionIn === 'LOST', penaltyFee: fee, returnNote: submitted.returnNote?.trim() || null }
      });
      await tx.equipment.update({
        where: { id: submitted.equipmentId },
        data: { condition: submitted.conditionIn, status: statusByCondition[submitted.conditionIn], lastCheckedAt: new Date() }
      });
    }

    // Thiết bị hỏng/mất khiến kho thiếu hàng -> tự tạo đề xuất nhập bổ sung cho cán bộ duyệt.
    for (const equipment of harmed) {
      const existing = await tx.restockProposal.findFirst({
        where: { equipmentId: equipment.id, status: { in: ['OPEN', 'APPROVED'] } }
      });
      if (existing) continue;
      await tx.restockProposal.create({
        data: {
          equipmentId: equipment.id,
          title: `Nhập bổ sung ${equipment.name} (${equipment.code})`,
          suggestedQty: 1,
          reason: `Thiết bị ${equipment.code} bị ${equipment.condition === 'LOST' ? 'mất' : 'hỏng'} khi nhận trả phiếu ${loan.code}.`,
          createdById: access.user.id,
          status: 'OPEN'
        }
      });
    }

    await tx.notification.create({
      data: {
        userId: loan.borrowerId,
        loanId: loan.id,
        type: 'LOAN_RETURNED',
        title: 'Đã nhận trả thiết bị',
        message:
          harmed.length > 0
            ? `Phiếu ${loan.code} đã hoàn tất. Có ${harmed.length} thiết bị hỏng/mất${penaltyTotal > 0 ? `, phí đền bù ${penaltyTotal.toLocaleString('vi-VN')} đ` : ''}.`
            : `Phiếu ${loan.code} đã hoàn tất, tất cả thiết bị đều tốt.`
      }
    });
    await writeAudit('RETURN_LOAN', { userId: access.user.id, detail: { code: loan.code, harmed: harmed.length, penaltyTotal } });

    return tx.loan.update({
      where: { id },
      data: { status: 'RETURNED', returnedAt: new Date(), handledById: access.user.id }
    });
  });

  return ok({ loan: result, harmedCount: harmed.length, penaltyTotal });
}
