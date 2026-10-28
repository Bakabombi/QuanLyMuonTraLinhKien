import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSession, sessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';

export async function POST(request) {
  try {
    const { fullName, email, password, studentCode } = await request.json();
    if (!fullName?.trim() || !email?.trim() || !studentCode?.trim() || !password || password.length < 8) {
      return NextResponse.json({ message: 'Vui lòng điền đủ thông tin; mật khẩu tối thiểu 8 ký tự' }, { status: 400 });
    }
    const user = await prisma.user.create({ data: { fullName: fullName.trim(), email: email.trim().toLowerCase(), studentCode: studentCode.trim(), passwordHash: await bcrypt.hash(password, 12) } });
    const response = NextResponse.json({ user: { id: user.id, fullName: user.fullName, role: user.role } }, { status: 201 });
    response.cookies.set(sessionCookie(await createSession(user)));
    return response;
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ message: 'Email hoặc mã sinh viên đã tồn tại' }, { status: 409 });
    return serverError(error);
  }
}
