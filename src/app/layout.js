import './globals.css';
import AppNav from '@/components/AppNav';

export const metadata = { title: 'Quản lý mượn/trả | Khoa CNTT', description: 'Hệ thống quản lý linh kiện và thiết bị thực hành' };

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
