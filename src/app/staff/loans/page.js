'use client';

import { useCallback, useEffect, useState } from 'react';
import { conditionLabels, formatDateTime, statusLabels } from '@/lib/labels';

export default function StaffLoansPage() {
  const [loans, setLoans] = useState([]);
  const [alerts, setAlerts] = useState({ overdue: [], dueSoon: [] });
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState(null);
  const [returning, setReturning] = useState(null);
  const [returnForm, setReturnForm] = useState({});
  const [role, setRole] = useState(null);

  const isAdmin = role === 'ADMIN';

  const load = useCallback(async () => {
    const query = statusFilter ? `?status=${statusFilter}` : '';
    const [loanResponse, alertResponse] = await Promise.all([fetch(`/api/loans${query}`), fetch('/api/loans/alerts')]);
    setLoans(loanResponse.ok ? (await loanResponse.json()).loans : []);
    setAlerts(alertResponse.ok ? await alertResponse.json() : { overdue: [], dueSoon: [] });
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload) => setRole(payload.user?.role ?? null));
  }, []);

  async function update(id, action, body = {}) {
    const response = await fetch(`/api/loans/${id}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã cập nhật phiếu mượn.' } : { type: 'error', text: payload.message });
    if (response.ok) load();
  }

  async function removeLoan(loan) {
    if (!window.confirm(`Xoá vĩnh viễn phiếu ${loan.code}?`)) return;
    const response = await fetch(`/api/loans/${loan.id}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã xoá phiếu mượn.' } : { type: 'error', text: payload.message });
    if (response.ok) load();
  }

  async function sendReminders() {
    const response = await fetch('/api/loans/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: `Đã gửi nhắc nhở cho ${payload.reminded} phiếu quá hạn.` } : { type: 'error', text: payload.message });
    load();
  }

  function openReturn(loan) {
    setReturning(loan.id);
    const initial = {};
    for (const item of loan.items) initial[item.equipmentId] = { conditionIn: 'GOOD', returnNote: '' };
    setReturnForm(initial);
  }

  async function submitReturn(loan) {
    const items = loan.items.map((item) => ({ equipmentId: item.equipmentId, ...returnForm[item.equipmentId] }));
    await update(loan.id, 'return', { items });
    setReturning(null);
  }

  return (
    <main>
      <div className="row">
        <div>
          <h1>Phiếu mượn: xác nhận · bàn giao · nhận trả</h1>
          <p className="muted">Cán bộ xưởng xác nhận yêu cầu, bàn giao thiết bị và đánh giá tình trạng khi nhận trả.</p>
        </div>
        <button type="button" onClick={sendReminders} disabled={alerts.overdue.length === 0}>
          Nhắc trả {alerts.overdue.length} phiếu quá hạn
        </button>
      </div>

      {message && <div className={`notice ${message.type}`}>{message.text}</div>}

      <section className="grid">
        <div className="stat danger">
          <div className="value">{alerts.overdue.length}</div>
          <div className="label">Phiếu quá hạn trả</div>
        </div>
        <div className="stat warn">
          <div className="value">{alerts.dueSoon.length}</div>
          <div className="label">Sắp tới hạn (24 giờ)</div>
        </div>
        <div className="stat">
          <div className="value">{loans.filter((loan) => loan.status === 'PENDING').length}</div>
          <div className="label">Chờ duyệt</div>
        </div>
        <div className="stat info">
          <div className="value">{loans.filter((loan) => loan.status === 'APPROVED').length}</div>
          <div className="label">Chờ bàn giao</div>
        </div>
      </section>

      {alerts.overdue.length > 0 && (
        <section className="card" style={{ borderLeft: '4px solid #b42318' }}>
          <h2>Cảnh báo quá hạn trả</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Phiếu</th>
                  <th>Sinh viên</th>
                  <th>Hạn trả</th>
                  <th>Trễ</th>
                  <th>Đã nhắc</th>
                </tr>
              </thead>
              <tbody>
                {alerts.overdue.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.code}</td>
                    <td>
                      {loan.borrower.fullName} · {loan.borrower.studentCode}
                    </td>
                    <td>{formatDateTime(loan.expectedReturnAt)}</td>
                    <td>
                      <span className="badge danger">{loan.daysLate} ngày</span>
                    </td>
                    <td>{loan.reminderCount} lần</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card">
        <div className="row">
          <h2>Danh sách phiếu mượn</h2>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
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
                <th>Phiếu</th>
                <th>Người mượn</th>
                <th>Thiết bị</th>
                <th>Hạn trả</th>
                <th>Trạng thái</th>
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
                    {loan.borrower.fullName}
                    <div className="muted">{loan.borrower.studentCode ?? loan.borrower.email}</div>
                  </td>
                  <td>
                    {loan.items.map((item) => (
                      <div key={item.id}>
                        {item.equipment.code}
                        {item.conditionIn && <span className={`badge ${item.conditionIn}`} style={{ marginLeft: 6 }}>{conditionLabels[item.conditionIn]}</span>}
                      </div>
                    ))}
                  </td>
                  <td>{formatDateTime(loan.expectedReturnAt)}</td>
                  <td>
                    <span className={`badge ${loan.status}`}>{statusLabels[loan.status]}</span>
                  </td>
                  <td>
                    {loan.status === 'PENDING' && (
                      <div className="filters">
                        <button type="button" onClick={() => update(loan.id, 'approve', { approved: true })}>
                          Duyệt
                        </button>
                        <button type="button" className="danger" onClick={() => update(loan.id, 'approve', { approved: false, note: 'Thiết bị không đủ điều kiện' })}>
                          Từ chối
                        </button>
                      </div>
                    )}
                    {loan.status === 'APPROVED' && (
                      <button type="button" onClick={() => update(loan.id, 'checkout')}>
                        Bàn giao
                      </button>
                    )}
                    {['CHECKED_OUT', 'OVERDUE'].includes(loan.status) && returning !== loan.id && (
                      <button type="button" onClick={() => openReturn(loan)}>
                        Nhận trả
                      </button>
                    )}
                    {returning === loan.id && (
                      <div>
                        {loan.items.map((item) => (
                          <div key={item.id} style={{ marginBottom: 8 }}>
                            <b>{item.equipment.code}</b>
                            <select
                              value={returnForm[item.equipmentId]?.conditionIn ?? 'GOOD'}
                              onChange={(event) => setReturnForm({ ...returnForm, [item.equipmentId]: { ...returnForm[item.equipmentId], conditionIn: event.target.value } })}
                            >
                              {Object.entries(conditionLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <input
                              placeholder="Ghi chú tình trạng"
                              value={returnForm[item.equipmentId]?.returnNote ?? ''}
                              onChange={(event) => setReturnForm({ ...returnForm, [item.equipmentId]: { ...returnForm[item.equipmentId], returnNote: event.target.value } })}
                            />
                          </div>
                        ))}
                        <div className="filters">
                          <button type="button" onClick={() => submitReturn(loan)}>
                            Xác nhận nhận trả
                          </button>
                          <button type="button" className="ghost" onClick={() => setReturning(null)}>
                            Huỷ
                          </button>
                        </div>
                      </div>
                    )}
                    {isAdmin && ['CANCELLED', 'REJECTED'].includes(loan.status) && (
                      <button type="button" className="ghost" onClick={() => removeLoan(loan)}>
                        Xoá
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={6}>Chưa có phiếu mượn nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
