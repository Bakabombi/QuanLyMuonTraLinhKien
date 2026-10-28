import { NextResponse } from 'next/server';

const statusByCode = { UNAUTHORIZED: 401, FORBIDDEN: 403 };

/** Trả về lỗi phân quyền thống nhất cho các route handler. */
export function accessError(error, message = 'Không có quyền thực hiện thao tác này') {
  return NextResponse.json({ message }, { status: statusByCode[error] ?? 401 });
}

export function badRequest(message) {
  return NextResponse.json({ message }, { status: 400 });
}

export function notFound(message) {
  return NextResponse.json({ message }, { status: 404 });
}

/** Chuyển đổi an toàn Decimal/Date của Prisma sang JSON thuần cho client. */
export function serialize(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      item && typeof item === 'object' && typeof item.toNumber === 'function' ? item.toNumber() : item
    )
  );
}

export function ok(data, status = 200) {
  return NextResponse.json(serialize(data), { status });
}
