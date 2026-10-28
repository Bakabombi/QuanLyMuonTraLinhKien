import { NextResponse } from 'next/server';

export function serverError(error) {
  console.error(error);
  return NextResponse.json(
    { message: 'Máy chủ không thể xử lý yêu cầu. Hãy kiểm tra kết nối cơ sở dữ liệu.' },
    { status: 500 }
  );
}
