'use client';

import { useEffect, useMemo, useState } from 'react';
import { conditionLabels } from '@/lib/labels';

function defaultReturnAt() {
  const date = new Date(Date.now() + 7 * 86400000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function StudentPage() {
  const [equipment, setEquipment] = useState([]);
  const [catalog, setCatalog] = useState({ categories: [] });
  const [selected, setSelected] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedReturnAt, setExpectedReturnAt] = useState(defaultReturnAt);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/equipment')
      .then((response) => (response.ok ? response.json() : []))
      .then(setEquipment);
    fetch('/api/catalog')
      .then((response) => (response.ok ? response.json() : { categories: [] }))
      .then(setCatalog);
  }, []);

  const available = useMemo(
    () =>
      equipment.filter((item) => {
        if (item.status !== 'AVAILABLE' || item.condition !== 'GOOD') return false;
        if (categoryId && item.categoryId !== categoryId) return false;
        if (keyword.trim()) {
          const text = `${item.code} ${item.name} ${item.model ?? ''}`.toLowerCase();
          if (!text.includes(keyword.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [equipment, keyword, categoryId]
  );

  const toggle = (id) => setSelected((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose, expectedReturnAt, equipmentIds: selected })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: `Đã gửi phiếu ${payload.code} tới cán bộ xưởng. Theo dõi tại mục "Phiếu của tôi".` } : { type: 'error', text: payload.message });
    if (response.ok) {
      setSelected([]);
      setPurpose('');
    }
    setBusy(false);
  }

  return (
    <main>
      <h1>Đăng ký mượn thiết bị thực hành</h1>
      <p className="muted">Chọn thiết bị còn sẵn sàng, gửi yêu cầu và đến xưởng nhận thiết bị sau khi cán bộ xác nhận.</p>

      {message && <div className={`notice ${message.type}`}>{message.text}</div>}

      <section className="card">
        <h2>Thiết bị sẵn sàng ({available.length})</h2>
        <div className="filters">
          <input placeholder="Tìm theo mã hoặc tên thiết bị" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ minWidth: 260 }} />
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Tất cả danh mục</option>
            {catalog.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Chọn</th>
                <th>Mã QR</th>
                <th>Tên thiết bị</th>
                <th>Danh mục</th>
                <th>Vị trí</th>
                <th>Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {available.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                  </td>
                  <td>{item.code}</td>
                  <td>
                    {item.name}
                    {item.model && <div className="muted">{item.model}</div>}
                  </td>
                  <td>{item.category?.name ?? '—'}</td>
                  <td>{item.location?.name ?? 'Chưa xác định'}</td>
                  <td>
                    <span className={`badge ${item.condition}`}>{conditionLabels[item.condition]}</span>
                  </td>
                </tr>
              ))}
              {available.length === 0 && (
                <tr>
                  <td colSpan={6}>Không có thiết bị phù hợp đang sẵn sàng.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Tạo yêu cầu mượn ({selected.length} thiết bị)</h2>
        <form onSubmit={submit}>
          <label>
            Mục đích sử dụng *
            <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} placeholder="Ví dụ: Làm bài tập lớn môn Vi xử lý, cần board và cảm biến." required />
          </label>
          <label>
            Thời gian dự kiến trả *
            <input type="datetime-local" value={expectedReturnAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setExpectedReturnAt(event.target.value)} required />
          </label>
          <button disabled={busy || selected.length === 0}>{busy ? 'Đang gửi…' : `Gửi yêu cầu (${selected.length} thiết bị)`}</button>
        </form>
      </section>
    </main>
  );
}
