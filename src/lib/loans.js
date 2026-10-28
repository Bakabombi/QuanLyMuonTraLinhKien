import { prisma } from '@/lib/prisma';

/** Số giờ trước hạn bắt đầu nhắc sinh viên chuẩn bị trả thiết bị. */
export const DUE_SOON_HOURS = 24;

export const openLoanStatuses = ['PENDING', 'APPROVED', 'CHECKED_OUT', 'OVERDUE'];

export const statusLabels = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt - chờ bàn giao',
  CHECKED_OUT: 'Đang mượn',
  OVERDUE: 'Quá hạn',
  RETURNED: 'Đã trả',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã huỷ'
};

export const conditionLabels = { GOOD: 'Tốt', DAMAGED: 'Hỏng', LOST: 'Mất' };

export const equipmentStatusLabels = {
  AVAILABLE: 'Sẵn sàng',
  RESERVED: 'Đã giữ chỗ',
  BORROWED: 'Đang cho mượn',
  MAINTENANCE: 'Đang sửa chữa',
  RETIRED: 'Thanh lý',
  LOST: 'Đã mất'
};

/** Chuyển phiếu đã bàn giao nhưng quá hạn sang OVERDUE và sinh cảnh báo còn thiếu. */
export async function syncOverdueLoans() {
  const overdue = await prisma.loan.findMany({
    where: { status: 'CHECKED_OUT', expectedReturnAt: { lt: new Date() } },
    select: { id: true, borrowerId: true, code: true, reminderCount: true }
  });
  if (overdue.length === 0) return 0;
  const ids = overdue.map((loan) => loan.id);
  await prisma.$transaction([
    prisma.loan.updateMany({ where: { id: { in: ids } }, data: { status: 'OVERDUE' } }),
    prisma.notification.createMany({
      data: overdue.map((loan) => ({
        userId: loan.borrowerId,
        loanId: loan.id,
        type: 'OVERDUE',
        title: 'Thiết bị quá hạn trả',
        message: `Phiếu ${loan.code} đã quá hạn trả. Vui lòng mang thiết bị đến xưởng để hoàn tất thủ tục.`
      }))
    }),
    prisma.loan.updateMany({ where: { id: { in: ids } }, data: { reminderCount: { increment: 1 }, lastRemindedAt: new Date() } })
  ]);
  return ids.length;
}

/** Danh sách phiếu cần cảnh báo: quá hạn hoặc sắp tới hạn. */
export async function alertLoans() {
  const dueSoonAt = new Date(Date.now() + DUE_SOON_HOURS * 60 * 60 * 1000);
  const [overdue, dueSoon] = await Promise.all([
    prisma.loan.findMany({
      where: { status: { in: ['CHECKED_OUT', 'OVERDUE'] }, expectedReturnAt: { lt: new Date() } },
      include: { borrower: { select: { fullName: true, studentCode: true, email: true } }, items: { include: { equipment: { select: { code: true, name: true } } } } },
      orderBy: { expectedReturnAt: 'asc' }
    }),
    prisma.loan.findMany({
      where: { status: { in: ['CHECKED_OUT', 'OVERDUE'] }, expectedReturnAt: { gte: new Date(), lte: dueSoonAt } },
      include: { borrower: { select: { fullName: true, studentCode: true, email: true } }, items: { include: { equipment: { select: { code: true, name: true } } } } },
      orderBy: { expectedReturnAt: 'asc' }
    })
  ]);
  const withDays = (loan) => ({
    ...loan,
    daysLate: Math.max(0, Math.floor((Date.now() - new Date(loan.expectedReturnAt).getTime()) / 86400000))
  });
  return { overdue: overdue.map(withDays), dueSoon: dueSoon.map(withDays) };
}

/** Tạo phiếu nháp khi phát hiện thiết bị hỏng/mất hoặc tồn kho sẵn sàng xuống thấp. */
export async function suggestRestock({ userId = null, minAvailable = 1 } = {}) {
  const [harmed, lowStock] = await Promise.all([
    prisma.equipment.findMany({
      where: { condition: { in: ['DAMAGED', 'LOST'] } },
      include: { category: true, proposals: { where: { status: { in: ['OPEN', 'APPROVED'] } } } }
    }),
    prisma.category.findMany({ include: { equipment: true } })
  ]);

  const created = [];
  for (const item of harmed) {
    if (item.proposals.length > 0) continue;
    const reason = item.condition === 'LOST'
      ? `Thiết bị ${item.code} bị mất, cần nhập bù để đảm bảo số lượng cho sinh viên mượn.`
      : `Thiết bị ${item.code} bị hỏng, cần nhập bù hoặc sửa chữa để bổ sung kho.`;
    created.push(await prisma.restockProposal.create({
      data: { equipmentId: item.id, title: `Nhập bổ sung ${item.name} (${item.code})`, suggestedQty: 1, reason, createdById: userId }
    }));
  }

  for (const category of lowStock) {
    const available = category.equipment.filter((item) => item.status === 'AVAILABLE' && item.condition === 'GOOD').length;
    if (category.equipment.length === 0 || available > minAvailable) continue;
    const existed = await prisma.restockProposal.findFirst({
      where: { categoryId: category.id, status: { in: ['OPEN', 'APPROVED'] } }
    });
    if (existed) continue;
    created.push(await prisma.restockProposal.create({
      data: {
        categoryId: category.id,
        title: `Nhập bổ sung nhóm ${category.name}`,
        suggestedQty: Math.max(2, category.equipment.length - available),
        reason: `Nhóm ${category.name} chỉ còn ${available} thiết bị sẵn sàng trên tổng ${category.equipment.length}, dưới ngưỡng an toàn.`,
        createdById: userId
      }
    }));
  }
  return created;
}
