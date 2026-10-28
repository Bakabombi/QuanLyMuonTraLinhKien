import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const cookieName = 'equipment_session';
const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

// Cờ Secure của cookie chỉ nên bật khi chạy HTTPS thật.
// Mặc định: bật khi production, tắt khi dev. Có thể ép bằng COOKIE_SECURE=true/false.
// Lưu ý: nếu bật Secure mà truy cập qua http:// thì trình duyệt sẽ ÂM THẦM bỏ cookie
// khiến đăng nhập thất bại dù API trả 200.
const secureCookie = () => {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return process.env.NODE_ENV === 'production';
};

export async function createSession(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET chưa được cấu hình');
  return new SignJWT({ role: user.role, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret());
}

export function sessionCookie(token) {
  return { name: cookieName, value: token, httpOnly: true, sameSite: 'lax', secure: secureCookie(), path: '/', maxAge: 60 * 60 * 8 };
}

export async function currentUser() {
  try {
    const token = (await cookies()).get(cookieName)?.value;
    if (!token || !process.env.JWT_SECRET) return null;
    const { payload } = await jwtVerify(token, secret());
    return await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, fullName: true, email: true, studentCode: true, role: true, status: true } });
  } catch { return null; }
}

export async function requireUser(roles = []) {
  const user = await currentUser();
  if (!user || user.status !== 'ACTIVE') return { error: 'UNAUTHORIZED' };
  if (roles.length && !roles.includes(user.role)) return { error: 'FORBIDDEN' };
  return { user };
}

// Nghiệp vụ kho hằng ngày: cán bộ xưởng và quản trị viên cùng làm được.
export const staffRoles = ['ADMIN', 'TECHNICIAN'];
// Đặc quyền quản trị: chỉ ADMIN. Dùng cho các thao tác không thể hoàn tác
// (quản lý người dùng, duyệt cấp cao nhất, xóa dữ liệu, xem nhật ký truy vết).
export const adminRoles = ['ADMIN'];
