import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createSession, sessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const user = await prisma.user.findUnique({ where: { email: email?.trim().toLowerCase() } });
    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password ?? '', user.passwordHash))) {
      return NextResponse.json({ message: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }
    const response = NextResponse.json({ user: { id: user.id, fullName: user.fullName, role: user.role } });
    response.cookies.set(sessionCookie(await createSession(user)));
    return response;
  } catch (error) {
    return serverError(error);
  }
}
