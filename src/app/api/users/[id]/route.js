import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireUser, adminRoles } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { accessError, badRequest, ok } from '@/lib/api-response';
import { writeAudit } from '@/lib/equipment';

const roles = ['ADMIN', 'TECHNICIAN', 'LECTURER', 'STUDENT'];
const statuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];

/**
 * Cập nhật người dùng — chỉ quản trị viên.
 * Hỗ trợ: đổi vai trò (`role`), khoá/mở tài khoản (`status`), đặt lại mật khẩu (`password`).
 */
export async function PATCH(request, { params }) {
  const access = await requireUser(adminRoles);
  if (access.error) return accessError(access.error, 'Chỉ quản trị viên được sửa người dùng');
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const data = {};
  if (body.role !== undefined) {
    if (!roles.includes(body.role)) return badRequest('Vai trò không hợp lệ');
    data.role = body.role;
  }
  if (body.status !== undefined) {
    if (!statuses.includes(body.status)) return badRequest('Trạng thái tài khoản không hợp lệ');
    data.status = body.status;
  }
  if (body.password !== undefined) {
    if (!body.password || String(body.password).length < 8) return badRequest('Mật khẩu tối thiểu 8 ký tự');
    data.passwordHash = await bcrypt.hash(String(body.password), 12);
  }
  if (!Object.keys(data).length) return badRequest('Không có thay đổi nào được gửi lên');

  // Chặn quản trị viên tự hạ quyền / tự khoá chính mình để tránh mất quyền truy cập.
  if (id === access.user.id && ((data.role && data.role !== 'ADMIN') || (data.status && data.status !== 'ACTIVE'))) {
    return badRequest('Không thể tự hạ quyền hoặc tự khoá tài khoản của chính mình');
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, fullName: true, email: true, studentCode: true, role: true, status: true }
  }).catch(() => null);
  if (!user) return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });

  await writeAudit('UPDATE_USER', { userId: access.user.id, detail: { targetUserId: id, changes: Object.keys(data).filter((key) => key !== 'passwordHash'), role: user.role, status: user.status } });
  return ok(user);
}
