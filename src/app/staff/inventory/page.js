'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { equipmentStatusLabels, conditionLabels, formatMoney } from '@/lib/labels';

const emptyForm = { code: '', name: '', model: '', serialNumber: '', quantity: 1, replacementFee: 0, categoryId: '', locationId: '' };

export default function InventoryPage() {
  const [equipment, setEquipment] = useState([]);
  const [catalog, setCatalog] = useState({ categories: [], locations: [] });
  const [filters, setFilters] = useState({ q: '', categoryId: '', status: '', condition: '' });
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState(null);

  const isAdmin = role === 'ADMIN';

  const load = useCallback(async () => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    const response = await fetch(`/api/equipment?${params}`);
    setEquipment(response.ok ? await response.json() : []);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/catalog')
      .then((response) => (response.ok ? response.json() : { categories: [], locations: [] }))
      .then(setCatalog);
    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((payload) => setRole(payload.user?.role ?? null));
  }, []);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã thêm thiết bị. Mở trang "Quét QR / in nhãn" để in và dán nhãn.' } : { type: 'error', text: payload.message });
    if (response.ok) {
      setForm(emptyForm);
      load();
    }
    setBusy(false);
  }

  async function updateItem(id, data) {
    const response = await fetch(`/api/equipment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã cập nhật thiết bị.' } : { type: 'error', text: payload.message });
    if (response.ok) load();
  }

  async function removeItem(item) {
    if (!window.confirm(`Xoá vĩnh viễn thiết bị ${item.code} · ${item.name}?`)) return;
    const response = await fetch(`/api/equipment/${item.id}`, { method: 'DELETE' });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: 'Đã xoá thiết bị.' } : { type: 'error', text: payload.message });
    if (response.ok) load();
  }

  const totals = equipment.reduce(
    (accumulator, item) => {
      accumulator.total += 1;
      if (item.condition === 'DAMAGED') accumulator.damaged += 1;
      if (item.condition === 'LOST') accumulator.lost += 1;
      if (item.status === 'AVAILABLE') accumulator.available += 1;
      return accumulator;
    },
    { total: 0, damaged: 0, lost: 0, available: 0 }
  );

  return (
    <main>
      <div className="row">
        <div>
          <h1>Quản lý kho thiết bị</h1>
          <p className="muted">Thêm thiết bị, in nhãn QR và cập nhật tình trạng (tốt / hỏng / mất).</p>
        </div>
        <a href="/staff/qr">
          <button type="button">Quét QR / In nhãn</button>
        </a>
      </div>

      {message && <div className={`notice ${message.type}`}>{message.text}</div>}

      <section className="grid">
        <div className="stat">
          <div className="value">{totals.total}</div>
          <div className="label">Tổng thiết bị</div>
        </div>
        <div className="stat ok">
          <div className="value">{totals.available}</div>
          <div className="label">Sẵn sàng cho mượn</div>
        </div>
        <div className="stat warn">
          <div className="value">{totals.damaged}</div>
          <div className="label">Đang hỏng</div>
        </div>
        <div className="stat danger">
          <div className="value">{totals.lost}</div>
          <div className="label">Đã mất</div>
        </div>
      </section>

      <section className="card">
        <h2>Thêm thiết bị mới</h2>
        <form onSubmit={submit}>
          <label>
            Mã thiết bị *
            <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="Ví dụ ARD-004" required />
          </label>
          <label>
            Tên thiết bị *
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Arduino Uno R3" required />
          </label>
          <label>
            Model
            <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="ATmega328P" />
          </label>
          <label>
            Số serial
            <input value={form.serialNumber} onChange={(event) => setForm({ ...form, serialNumber: event.target.value })} placeholder="ARD-UNO-0004" />
          </label>
          <label>
            Danh mục
            <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              <option value="">-- Chưa phân loại --</option>
              {catalog.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vị trí
            <select value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })}>
              <option value="">-- Chưa xác định --</option>
              {catalog.locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số lượng
            <input type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </label>
          <label>
            Phí đền bù nếu hỏng/mất (đồng)
            <input type="number" min="0" step="1000" value={form.replacementFee} onChange={(event) => setForm({ ...form, replacementFee: event.target.value })} />
          </label>
          <button disabled={busy}>{busy ? 'Đang lưu…' : 'Thêm thiết bị'}</button>
        </form>
      </section>

      <section className="card">
        <h2>Danh sách thiết bị và nhãn QR</h2>
        <div className="filters">
          <input placeholder="Tìm theo mã / tên / serial" value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} />
          <select value={filters.categoryId} onChange={(event) => updateFilter('categoryId', event.target.value)}>
            <option value="">Tất cả danh mục</option>
            {catalog.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(equipmentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select value={filters.condition} onChange={(event) => updateFilter('condition', event.target.value)}>
            <option value="">Tất cả tình trạng</option>
            {Object.entries(conditionLabels).map(([value, label]) => (
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
                <th>QR</th>
                <th>Mã / Tên</th>
                <th>Danh mục · Vị trí</th>
                <th>Tình trạng</th>
                <th>Trạng thái</th>
                <th>Đền bù</th>
                <th>Cập nhật</th>
                {isAdmin && <th>Xoá</th>}
              </tr>
            </thead>
            <tbody>
              {equipment.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="qr">
                      <QRCode value={item.qrPayload} size={64} />
                    </div>
                  </td>
                  <td>
                    <b>{item.code}</b>
                    <br />
                    {item.name}
                    <div className="muted">{item.serialNumber ?? 'Không có serial'}</div>
                  </td>
                  <td>
                    {item.category?.name ?? 'Chưa phân loại'}
                    <div className="muted">{item.location?.name ?? 'Chưa xác định'}</div>
                  </td>
                  <td>
                    <span className={`badge ${item.condition}`}>{conditionLabels[item.condition]}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.status}`}>{equipmentStatusLabels[item.status]}</span>
                  </td>
                  <td>{formatMoney(item.replacementFee)}</td>
                  <td>
                    <select value={item.condition} onChange={(event) => updateItem(item.id, { condition: event.target.value })}>
                      {Object.entries(conditionLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <select value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value })}>
                      {Object.entries(equipmentStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {isAdmin && (
                    <td>
                      <button type="button" className="ghost" onClick={() => removeItem(item)}>
                        Xoá
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {equipment.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7}>Không có thiết bị phù hợp bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
