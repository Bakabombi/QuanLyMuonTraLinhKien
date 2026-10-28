'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { roleLabels } from '@/lib/labels';

const linksByRole = {
  ADMIN: [
    { href: '/staff/inventory', label: 'Kho thiết bị' },
    { href: '/staff/qr', label: 'Quét QR / in nhãn' },
    { href: '/staff/loans', label: 'Phiếu mượn' },
    { href: '/staff/proposals', label: 'Đề xuất nhập' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/admin/users', label: 'Người dùng' },
    { href: '/admin/audit', label: 'Nhật ký truy vết' }
  ],
  TECHNICIAN: [
    { href: '/staff/inventory', label: 'Kho thiết bị' },
    { href: '/staff/qr', label: 'Quét QR / in nhãn' },
    { href: '/staff/loans', label: 'Phiếu mượn' },
    { href: '/staff/proposals', label: 'Đề xuất nhập' },
    { href: '/dashboard', label: 'Dashboard' }
  ],
  LECTURER: [
    { href: '/student', label: 'Đăng ký mượn' },
    { href: '/student/loans', label: 'Phiếu của tôi' }
  ],
  STUDENT: [
    { href: '/student', label: 'Đăng ký mượn' },
    { href: '/student/loans', label: 'Phiếu của tôi' }
  ]
};

export default function AppNav() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/auth/me').then((response) => (response.ok ? response.json() : { user: null })),
      fetch('/api/notifications').then((response) => (response.ok ? response.json() : { unread: 0 }))
    ]).then(([me, notifications]) => {
      if (!active) return;
      setUser(me.user ?? null);
      setUnread(notifications.unread ?? 0);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  if (!user) return null;
  const links = linksByRole[user.role] ?? [];

  return (
    <nav className="nav">
      <strong style={{ color: '#0f3d8a' }}>Khoa CNTT · Quản lý mượn/trả</strong>
      {links.map((link) => (
        <a key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
          {link.label}
          {link.href === '/student/loans' && unread > 0 ? ` (${unread})` : ''}
        </a>
      ))}
      <span className="spacer" />
      <span className="muted">
        {user.fullName} · {roleLabels[user.role] ?? user.role}
      </span>
      <button className="ghost" type="button" onClick={logout}>
        Đăng xuất
      </button>
    </nav>
  );
}
