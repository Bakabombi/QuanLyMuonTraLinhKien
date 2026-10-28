import { NextResponse } from 'next/server';
import { requireUser, staffRoles, adminRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, badRequest, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';
const statuses = ['OPEN', 'APPROVED', 'REJECTED', 'DONE'];
// Duyệt cấp cao nhất và xác nhận đã nhập kho là đặc quyền quản trị viên.
const adminOnlyStatuses = ['APPROVED', 'DONE'];

/**
 * Xử lý đề xuất nhập bổ sung.
 * - Cán bộ xưởng: từ chối đề xuất (`REJECTED`).
 * - Quản trị viên: duyệt (`APPROVED`) và đánh dấu đã nhập kho (`DONE`).
 */
export async function PATCH(request, { params }) {
  const access = await requireUser(staffRoles);
  if (access.error) return accessError(access.error, 'Không có quyền xử lý đề xuất');
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!statuses.includes(body.status)) return badRequest('Trạng thái đề xuất không hợp lệ');

  if (adminOnlyStatuses.includes(body.status) && !adminRoles.includes(access.user.role)) {
    return accessError('FORBIDDEN', 'Chỉ quản trị viên được duyệt hoặc xác nhận nhập kho đề xuất');
  }

  const proposal = await prisma.restockProposal.update({
    where: { id },
    data: { status: body.status, reviewedAt: new Date() }
  }).catch(() => null);
  if (!proposal) return NextResponse.json({ message: 'Không tìm thấy đề xuất' }, { status: 404 });

  await writeAudit('REVIEW_RESTOCK_PROPOSAL', { userId: access.user.id, equipmentId: proposal.equipmentId, detail: { status: proposal.status } });
  return ok(proposal);
}

/** Xoá đề xuất nhập bổ sung — chỉ quản trị viên. */
export async function DELETE(_request, { params }) {
  const access = await requireUser(adminRoles);
  if (access.error) return accessError(access.error, 'Chỉ quản trị viên được xoá đề xuất');
  const { id } = await params;
  const proposal = await prisma.restockProposal.delete({ where: { id } }).catch(() => null);
  if (!proposal) return NextResponse.json({ message: 'Không tìm thấy đề xuất' }, { status: 404 });

  await writeAudit('DELETE_RESTOCK_PROPOSAL', { userId: access.user.id, detail: { title: proposal.title } });
  return ok({ id });
}
