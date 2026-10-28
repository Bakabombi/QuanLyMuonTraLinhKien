'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDateTime, proposalStatusLabels } from '@/lib/labels';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [catalog, setCatalog] = useState({ categories: [] });
  const [equipment, setEquipment] = useState([]);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ title: '', reason: '', suggestedQty: 1, equipmentId: '', categoryId: '' });
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState(null);

  const isAdmin = role === 'ADMIN';

  const load = useCallback(async () => {
    const response = await fetch('/api/proposals');
    setProposals(response.ok ? await response.json() : []);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload) => setRole(payload.user?.role ?? null));
    fetch('/api/catalog')
      .then((response) => (response.ok ? response.json() : { categories: [] }))
      .then(setCatalog);
    fetch('/api/equipment')
      .then((response) => (response.ok ? response.json() : []))
      .then(setEquipment);
  }, [load]);

  async function autoScan() {
    setBusy(true);
    const response = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ auto: true }) });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: `Hệ thống đã tạo ${payload.created} đề xuất từ dữ liệu hỏng/mất và tồn kho thấp.` } : { type: 'error', text: payload.message });
    load();
    setBusy(false);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã tạo đề xuất nhập bổ sung.' } : { type: 'error', text: payload.message });
    if (response.ok) {
      setForm({ title: '', reason: '', suggestedQty: 1, equipmentId: '', categoryId: '' });
      load();
    }
    setBusy(false);
  }

  async function review(id, status) {
    const response = await fetch(`/api/proposals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã cập nhật đề xuất.' } : { type: 'error', text: payload.message });
    if (response.ok) load();
  }

  async function removeProposal(proposal) {
    if (!window.confirm(`Xoá vĩnh viễn đề xuất "${proposal.title}"?`)) return;
    const response = await fetch(`/api/proposals/${proposal.id}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã xoá đề xuất.' } : { type: 'error', text: payload.message });
    if (response.ok) load();
  }

  const open = proposals.filter((proposal) => proposal.status === 'OPEN');

  return (
    <main>
      <div className="row">
        <div>
          <h1>Đề xuất nhập bổ sung thiết bị</h1>
          <p className="muted">Tổng hợp từ thiết bị hỏng/mất và nhóm hàng sắp hết để đề xuất nhập bù cho khoa.</p>
        </div>
        <button type="button" onClick={autoScan} disabled={busy}>
          Quét tự động
        </button>
      </div>

      {message && <div className={`notice ${message.type}`}>{message.text}</div>}

      <section className="grid">
        <div className="stat warn">
          <div className="value">{open.length}</div>
          <div className="label">Đề xuất đang chờ duyệt</div>
        </div>
        <div className="stat ok">
          <div className="value">{proposals.filter((proposal) => proposal.status === 'APPROVED' || proposal.status === 'DONE').length}</div>
          <div className="label">Đã duyệt / hoàn tất</div>
        </div>
        <div className="stat">
          <div className="value">{proposals.reduce((sum, proposal) => sum + proposal.suggestedQty, 0)}</div>
          <div className="label">Tổng số lượng đề xuất nhập</div>
        </div>
      </section>

      <section className="card">
        <h2>Tạo đề xuất thủ công</h2>
        <form onSubmit={submit}>
          <label>
            Tiêu đề *
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nhập bổ sung cảm biến siêu âm" required />
          </label>
          <label>
            Lý do *
            <textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} rows={3} placeholder="Căn cứ số liệu hư hao / nhu cầu mượn" required />
          </label>
          <label>
            Số lượng đề xuất *
            <input type="number" min="1" value={form.suggestedQty} onChange={(event) => setForm({ ...form, suggestedQty: event.target.value })} required />
          </label>
          <label>
            Gắn với thiết bị (không bắt buộc)
            <select value={form.equipmentId} onChange={(event) => setForm({ ...form, equipmentId: event.target.value })}>
              <option value="">-- Không gắn thiết bị --</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Gắn với danh mục (không bắt buộc)
            <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              <option value="">-- Không gắn danh mục --</option>
              {catalog.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy}>Tạo đề xuất</button>
        </form>
      </section>

      <section className="card">
        <h2>Danh sách đề xuất</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Đối tượng</th>
                <th>Số lượng</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Người tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td>
                    <b>{proposal.title}</b>
                    <div className="muted">{formatDateTime(proposal.createdAt)}</div>
                  </td>
                  <td>{proposal.equipment ? `${proposal.equipment.code} · ${proposal.equipment.name}` : proposal.category?.name ?? '—'}</td>
                  <td>{proposal.suggestedQty}</td>
                  <td className="muted">{proposal.reason}</td>
                  <td>
                    <span className={`badge ${proposal.status === 'OPEN' ? 'warn' : proposal.status === 'REJECTED' ? 'danger' : 'good'}`}>{proposalStatusLabels[proposal.status]}</span>
                  </td>
                  <td>{proposal.createdBy?.fullName ?? 'Hệ thống'}</td>
                  <td>
                    {proposal.status === 'OPEN' && (
                      <div className="filters">
                        {isAdmin && (
                          <button type="button" onClick={() => review(proposal.id, 'APPROVED')}>
                            Duyệt
                          </button>
                        )}
                        <button type="button" className="ghost" onClick={() => review(proposal.id, 'REJECTED')}>
                          Từ chối
                        </button>
                      </div>
                    )}
                    {proposal.status === 'APPROVED' && isAdmin && (
                      <button type="button" className="ghost" onClick={() => review(proposal.id, 'DONE')}>
                        Đánh dấu đã nhập kho
                      </button>
                    )}
                    {isAdmin && (
                      <button type="button" className="ghost" onClick={() => removeProposal(proposal)}>
                        Xoá
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={7}>Chưa có đề xuất nào. Bấm "Quét tự động" để hệ thống tổng hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
