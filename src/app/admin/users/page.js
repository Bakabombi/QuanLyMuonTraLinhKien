'use client';

import { useCallback, useEffect, useState } from 'react';
import { roleLabels, userStatusLabels, formatDateTime } from '@/lib/labels';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ q: '', role: '' });
  const [message, setMessage] = useState(null);
  const [me, setMe] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const response = await fetch(`/api/users?${params}`);
    setUsers(response.ok ? await response.json() : []);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload) => setMe(payload.user));
  }, []);

  async function updateUser(id, data) {
    setBusyId(id);
    const response = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã cập nhật người dùng.' } : { type: 'error', text: payload.message });
    if (response.ok) load();
    setBusyId(null);
  }

  async function resetPassword(user) {
    const password = window.prompt(`Đặt lại mật khẩu cho ${user.fullName} (tối thiểu 8 ký tự):`);
    if (password === null) return;
    await updateUser(user.id, { password });
  }

  return (
    <main>
      <div className="row">
        <div>
          <h1>Quản lý người dùng</h1>
          <p className="muted">Đổi vai trò, khoá/mở tài khoản và đặt lại mật khẩu. Chỉ quản trị viên truy cập được.</p>
        </div>
      </div>

      {message && <div className={`notice ${message.type}`}>{message.text}</div>}

      <section className="card">
        <div className="filters">
          <input placeholder="Tìm theo tên / email / mã sinh viên" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
          <select value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}>
            <option value="">Tất cả vai trò</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Họ tên / Email</th>
                <th>Mã SV</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = me?.id === user.id;
                return (
                  <tr key={user.id}>
                    <td>
                      <b>{user.fullName}</b>
                      {isSelf && <span className="muted"> (bạn)</span>}
                      <div className="muted">{user.email}</div>
                    </td>
                    <td>{user.studentCode ?? '—'}</td>
                    <td>
                      <select value={user.role} disabled={busyId === user.id || isSelf} onChange={(event) => updateUser(user.id, { role: event.target.value })}>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${user.status === 'ACTIVE' ? 'good' : user.status === 'LOCKED' ? 'danger' : 'warn'}`}>{userStatusLabels[user.status]}</span>
                    </td>
                    <td className="muted">{formatDateTime(user.createdAt)}</td>
                    <td>
                      <div className="filters">
                        {user.status === 'ACTIVE' ? (
                          <button type="button" className="ghost" disabled={busyId === user.id || isSelf} onClick={() => updateUser(user.id, { status: 'LOCKED' })}>
                            Khoá
                          </button>
                        ) : (
                          <button type="button" disabled={busyId === user.id} onClick={() => updateUser(user.id, { status: 'ACTIVE' })}>
                            Mở khoá
                          </button>
                        )}
                        <button type="button" className="ghost" disabled={busyId === user.id} onClick={() => resetPassword(user)}>
                          Đặt lại mật khẩu
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6}>Không có người dùng phù hợp bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
