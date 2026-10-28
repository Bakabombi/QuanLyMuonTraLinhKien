'use client';

import { useCallback, useEffect, useState } from 'react';
import { conditionLabels, formatDateTime, statusLabels } from '@/lib/labels';

export default function StudentLoansPage() {
  const [loans, setLoans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [loanResponse, notificationResponse] = await Promise.all([fetch('/api/loans'), fetch('/api/notifications')]);
    setLoans(loanResponse.ok ? (await loanResponse.json()).loans : []);
    setNotifications(notificationResponse.ok ? (await notificationResponse.json()).notifications : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(loan) {
    const response = await fetch(`/api/loans/${loan.id}/cancel`, { method: 'PATCH' });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: `Đã huỷ phiếu ${loan.code}.` } : { type: 'error', text: payload.message });
    if (response.ok) load();
  }

  async function markRead() {
    await fetch('/api/notifications', { method: 'PATCH' });
    load();
  }

  const active = loans.filter((loan) => ['PENDING', 'APPROVED', 'CHECKED_OUT', 'OVERDUE'].includes(loan.status));
  const overdue = active.filter((loan) => loan.status === 'OVERDUE');

  if (loading) return <main>Đang tải dữ liệu…</main>;

  return (
    <main>
      <div className="row">
        <div>
          <h1>Phiếu mượn của tôi</h1>
          <p className="muted">Theo dõi trạng thái phiếu, hạn trả và thông báo từ cán bộ xưởng.</p>
        </div>
        {notifications.some((item) => !item.readAt) && (
          <button type="button" className="ghost" onClick={markRead}>
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      {message && <div className={`notice ${message.type}`}>{message.text}</div>}

      {overdue.length > 0 && (
        <div className="notice error">
          Bạn có {overdue.length} phiếu quá hạn trả. Vui lòng mang thiết bị đến xưởng để tránh phát sinh phí đền bù.
        </div>
      )}

      <section className="grid">
        <div className="stat">
          <div className="value">{active.length}</div>
          <div className="label">Phiếu đang xử lý</div>
        </div>
        <div className="stat danger">
          <div className="value">{overdue.length}</div>
          <div className="label">Phiếu quá hạn</div>
        </div>
        <div className="stat ok">
          <div className="value">{loans.filter((loan) => loan.status === 'RETURNED').length}</div>
          <div className="label">Phiếu đã hoàn tất</div>
        </div>
        <div className="stat warn">
          <div className="value">{notifications.filter((item) => !item.readAt).length}</div>
          <div className="label">Thông báo chưa đọc</div>
        </div>
      </section>

      <section className="card">
        <h2>Danh sách phiếu</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Phiếu</th>
                <th>Thiết bị</th>
                <th>Hạn trả</th>
                <th>Trạng thái</th>
                <th>Ghi chú của xưởng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>
                    <b>{loan.code}</b>
                    <div className="muted">{loan.purpose}</div>
                  </td>
                  <td>
                    {loan.items.map((item) => (
                      <div key={item.id}>
                        {item.equipment.code} · {item.equipment.name}
                        {item.conditionIn && (
                          <span className={`badge ${item.conditionIn}`} style={{ marginLeft: 6 }}>
                            trả: {conditionLabels[item.conditionIn]}
                            {Number(item.penaltyFee) > 0 ? ` · ${Number(item.penaltyFee).toLocaleString('vi-VN')} đ` : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </td>
                  <td>{formatDateTime(loan.expectedReturnAt)}</td>
                  <td>
                    <span className={`badge ${loan.status}`}>{statusLabels[loan.status]}</span>
                  </td>
                  <td>{loan.note ?? '—'}</td>
                  <td>
                    {loan.status === 'PENDING' && (
                      <button type="button" className="danger" onClick={() => cancel(loan)}>
                        Huỷ phiếu
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={6}>Bạn chưa có phiếu mượn nào. Hãy đăng ký tại mục "Đăng ký mượn".</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Thông báo</h2>
        {notifications.length === 0 && <p className="muted">Chưa có thông báo.</p>}
        {notifications.map((item) => (
          <div key={item.id} className={item.readAt ? 'muted' : ''} style={{ padding: '8px 0', borderBottom: '1px solid #eef1f7' }}>
            <b>{item.title}</b> {!item.readAt && <span className="badge info">Mới</span>}
            <div>{item.message}</div>
            <div className="muted">{formatDateTime(item.createdAt)}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
