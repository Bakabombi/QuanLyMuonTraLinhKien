import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { syncOverdueLoans } from '@/lib/loans';

/**
 * Số liệu dashboard: tồn kho theo trạng thái/tình trạng, tỷ lệ hư hao,
 * cảnh báo quá hạn và đề xuất nhập bổ sung.
 */
export async function GET(request) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền xem báo cáo');
  await syncOverdueLoans();

  const months = Math.min(Math.max(Number.parseInt(request.nextUrl.searchParams.get('months') ?? '6', 10) || 6, 1), 24);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [total, byStatus, byCondition, byCategory, dueSoon, overdue, openLoans, returnedLoans, harmedItems, proposals] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.equipment.groupBy({ by: ['condition'], _count: { _all: true } }),
    prisma.category.findMany({ select: { name: true, _count: { select: { equipment: true } } } }),
    prisma.loan.count({ where: { status: { in: ['CHECKED_OUT', 'OVERDUE'] }, expectedReturnAt: { gte: new Date(), lte: new Date(Date.now() + 86400000) } } }),
    prisma.loan.count({ where: { status: { in: ['CHECKED_OUT', 'OVERDUE'] }, expectedReturnAt: { lt: new Date() } } }),
    prisma.loan.count({ where: { status: { in: ['PENDING', 'APPROVED', 'CHECKED_OUT', 'OVERDUE'] } } }),
    prisma.loan.count({ where: { status: 'RETURNED', returnedAt: { gte: since } } }),
    prisma.loanItem.findMany({
      where: { loan: { returnedAt: { gte: since } }, conditionIn: { not: null } },
      select: { conditionIn: true, penaltyFee: true, equipment: { select: { code: true, name: true, category: { select: { name: true } } } }, loan: { select: { returnedAt: true } } },
      orderBy: { loan: { returnedAt: 'asc' } }
    }),
    prisma.restockProposal.findMany({ include: { equipment: { select: { code: true, name: true } }, category: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 20 })
  ]);

  const returnedCount = harmedItems.length;
  const damagedCount = harmedItems.filter((item) => item.conditionIn === 'DAMAGED').length;
  const lostCount = harmedItems.filter((item) => item.conditionIn === 'LOST').length;
  const compensationTotal = harmedItems.reduce((sum, item) => sum + Number(item.penaltyFee ?? 0), 0);
  const wearRate = returnedCount > 0 ? Number((((damagedCount + lostCount) / returnedCount) * 100).toFixed(2)) : 0;

  // Tỷ lệ hư hao theo tháng, phục vụ biểu đồ đường của Chart.js.
  const monthKeys = [];
  for (let index = 0; index < months; index += 1) {
    const date = new Date(since);
    date.setMonth(since.getMonth() + index);
    monthKeys.push({ key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: `T${date.getMonth() + 1}/${date.getFullYear()}` });
  }
  const trend = monthKeys.map(({ key, label }) => {
    const items = harmedItems.filter((item) => {
      const date = new Date(item.loan.returnedAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === key;
    });
    const damaged = items.filter((item) => item.conditionIn === 'DAMAGED').length;
    const lost = items.filter((item) => item.conditionIn === 'LOST').length;
    return { label, returned: items.length, damaged, lost, wearRate: items.length > 0 ? Number((((damaged + lost) / items.length) * 100).toFixed(2)) : 0 };
  });

  // Thiết bị hư hao nhiều nhất để ưu tiên nhập bổ sung.
  const harmedByEquipment = new Map();
  for (const item of harmedItems) {
    if (item.conditionIn === 'GOOD') continue;
    const key = item.equipment.code;
    const current = harmedByEquipment.get(key) ?? { code: item.equipment.code, name: item.equipment.name, category: item.equipment.category?.name ?? 'Chưa phân loại', count: 0 };
    current.count += 1;
    harmedByEquipment.set(key, current);
  }
  const topHarmed = [...harmedByEquipment.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  return ok({
    total,
    openLoans,
    returnedLoans,
    dueSoon,
    overdue,
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    byCondition: byCondition.map((row) => ({ condition: row.condition, count: row._count._all })),
    byCategory: byCategory.map((row) => ({ name: row.name, count: row._count.equipment })),
    wear: { returnedCount, damagedCount, lostCount, wearRate, compensationTotal },
    trend,
    topHarmed,
    proposals
  });
}
