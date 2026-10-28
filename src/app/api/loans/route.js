import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, badRequest, ok } from '@/lib/api-response';
import { nextLoanCode, writeAudit } from '@/lib/equipment';
import { syncOverdueLoans } from '@/lib/loans';

const MAX_BORROW_DAYS = 30;

export async function GET(request) {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');
  await syncOverdueLoans();

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status')?.trim();
  const scope = searchParams.get('scope')?.trim();
  const isStaff = staffRoles.includes(access.user.role);

  const where = {
    ...(isStaff ? {} : { borrowerId: access.user.id }),
    ...(status ? { status } : {}),
    ...(scope === 'active' ? { status: { in: ['PENDING', 'APPROVED', 'CHECKED_OUT', 'OVERDUE'] } } : {})
  };

  const loans = await prisma.loan.findMany({
    where,
    include: {
      borrower: { select: { fullName: true, studentCode: true, email: true } },
      approvedBy: { select: { fullName: true } },
      items: { include: { equipment: { select: { id: true, code: true, name: true, condition: true, status: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return ok({ loans, role: access.user.role });
}

export async function POST(request) {
  const access = await requireUser();
  if (access.error) return accessError(access.error, 'Chưa đăng nhập');
  const body = await request.json().catch(() => ({}));
  const { purpose, expectedReturnAt, equipmentIds } = body;
  if (!purpose?.trim() || !expectedReturnAt || !Array.isArray(equipmentIds) || equipmentIds.length === 0) {
    return badRequest('Thiếu mục đích, hạn trả hoặc thiết bị');
  }

  const uniqueIds = [...new Set(equipmentIds)];
  const returnAt = new Date(expectedReturnAt);
  if (Number.isNaN(returnAt.getTime()) || returnAt.getTime() <= Date.now()) {
    return badRequest('Hạn trả phải là mốc thời gian trong tương lai');
  }
  if (returnAt.getTime() > Date.now() + MAX_BORROW_DAYS * 86400000) {
    return badRequest(`Thời gian mượn tối đa ${MAX_BORROW_DAYS} ngày`);
  }

  const equipment = await prisma.equipment.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, code: true, status: true, condition: true } });
  if (equipment.length !== uniqueIds.length) return badRequest('Có thiết bị không tồn tại');
  const unavailable = equipment.filter((item) => item.status !== 'AVAILABLE' || item.condition !== 'GOOD');
  if (unavailable.length > 0) {
    return NextResponse.json(
      { message: `Thiết bị không sẵn sàng: ${unavailable.map((item) => item.code).join(', ')}` },
      { status: 409 }
    );
  }

  const code = await nextLoanCode();
  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        code,
        borrowerId: access.user.id,
        purpose: purpose.trim(),
        expectedReturnAt: returnAt,
        status: 'PENDING',
        items: { create: uniqueIds.map((equipmentId) => ({ equipmentId })) }
      },
      include: { items: { include: { equipment: true } } }
    });
    await tx.equipment.updateMany({ where: { id: { in: uniqueIds } }, data: { status: 'RESERVED' } });
    await tx.notification.create({
      data: {
        userId: access.user.id,
        loanId: created.id,
        type: 'LOAN_SUBMITTED',
        title: 'Đã gửi yêu cầu mượn thiết bị',
        message: `Phiếu ${code} đã được gửi tới cán bộ xưởng và đang chờ xác nhận.`
      }
    });
    await writeAudit('CREATE_LOAN', { userId: access.user.id, detail: { code, equipmentIds: uniqueIds } });
    return created;
  });
  return ok(loan, 201);
}
