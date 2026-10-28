import { NextResponse } from 'next/server';
import { requireUser, staffRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, badRequest, ok } from '@/lib/api-response';
import { suggestRestock } from '@/lib/loans';
import { writeAudit } from '@/lib/equipment';

/** Danh sách đề xuất nhập bổ sung. */
export async function GET(request) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền xem đề xuất');
  const status = request.nextUrl.searchParams.get('status')?.trim();
  const proposals = await prisma.restockProposal.findMany({
    where: status ? { status } : {},
    include: { equipment: { select: { code: true, name: true, condition: true } }, category: { select: { name: true } }, createdBy: { select: { fullName: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
  });
  return ok(proposals);
}

/**
 * Tạo đề xuất nhập bổ sung.
 * - `auto: true`: hệ thống tự quét thiết bị hỏng/mất và nhóm hàng sắp hết.
 * - Ngược lại: cán bộ tạo đề xuất thủ công.
 */
export async function POST(request) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền tạo đề xuất');
  const body = await request.json().catch(() => ({}));

  if (body.auto) {
    const created = await suggestRestock({ userId: access.user.id });
    await writeAudit('AUTO_RESTOCK_PROPOSAL', { userId: access.user.id, detail: { count: created.length } });
    return ok({ created: created.length, proposals: created }, 201);
  }

  const quantity = Number.parseInt(body.suggestedQty, 10);
  if (!body.title?.trim() || !body.reason?.trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return badRequest('Cần nhập tiêu đề, lý do và số lượng đề xuất hợp lệ');
  }
  const proposal = await prisma.restockProposal.create({
    data: {
      equipmentId: body.equipmentId || null,
      categoryId: body.categoryId || null,
      title: body.title.trim(),
      reason: body.reason.trim(),
      suggestedQty: quantity,
      createdById: access.user.id
    }
  });
  await writeAudit('CREATE_RESTOCK_PROPOSAL', { userId: access.user.id, detail: { title: proposal.title } });
  return ok(proposal, 201);
}
