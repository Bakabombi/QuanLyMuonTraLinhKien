import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, ok } from '@/lib/api-response';
import { alertLoans, syncOverdueLoans } from '@/lib/loans';
import { writeAudit } from '@/lib/equipment';

/** Danh sách cảnh báo: phiếu quá hạn trả và phiếu sắp tới hạn. */
export async function GET() {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền xem cảnh báo');
  await syncOverdueLoans();
  return ok(await alertLoans());
}

/** Gửi nhắc nhở trả thiết bị cho toàn bộ phiếu quá hạn (hoặc một phiếu cụ thể). */
export async function POST(request) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền gửi nhắc nhở');
  const body = await request.json().catch(() => ({}));
  const { overdue } = await alertLoans();
  const targets = body.loanId ? overdue.filter((loan) => loan.id === body.loanId) : overdue;
  if (targets.length === 0) return ok({ reminded: 0 });

  await prisma.$transaction([
    prisma.notification.createMany({
      data: targets.map((loan) => ({
        userId: loan.borrowerId,
        loanId: loan.id,
        type: 'OVERDUE',
        title: 'Nhắc nhở: thiết bị quá hạn trả',
        message: `Phiếu ${loan.code} đã quá hạn ${loan.daysLate} ngày. Vui lòng trả thiết bị cho cán bộ xưởng để tránh phát sinh phí đền bù.`
      }))
    }),
    prisma.loan.updateMany({
      where: { id: { in: targets.map((loan) => loan.id) } },
      data: { reminderCount: { increment: 1 }, lastRemindedAt: new Date(), status: 'OVERDUE' }
    })
  ]);
  await writeAudit('SEND_OVERDUE_REMINDER', { userId: access.user.id, detail: { count: targets.length } });
  return NextResponse.json({ reminded: targets.length });
}
