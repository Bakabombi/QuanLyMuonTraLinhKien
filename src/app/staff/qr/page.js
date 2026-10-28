'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { conditionLabels, equipmentStatusLabels } from '@/lib/labels';

export default function QrPage() {
  const [equipment, setEquipment] = useState([]);
  const [scanValue, setScanValue] = useState('');
  const [found, setFound] = useState(null);
  const [message, setMessage] = useState(null);
  const [labelCode, setLabelCode] = useState('');

  useEffect(() => {
    fetch('/api/equipment')
      .then((response) => (response.ok ? response.json() : []))
      .then(setEquipment);
  }, []);

  async function lookup(event) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch(`/api/equipment/scan?value=${encodeURIComponent(scanValue)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFound(null);
      return setMessage({ type: 'error', text: payload.message });
    }
    setFound(payload);
    setMessage({ type: 'info', text: 'Đã tìm thấy thiết bị. Chọn tình trạng kiểm kê bên dưới.' });
  }

  async function check(condition) {
    const response = await fetch('/api/equipment/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: scanValue, condition })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? { type: 'ok', text: `Đã ghi nhận tình trạng "${conditionLabels[condition]}" cho ${payload.code}.` } : { type: 'error', text: payload.message });
    if (response.ok) {
      setFound(payload);
      setEquipment((current) => current.map((item) => (item.id === payload.id ? { ...item, ...payload } : item)));
    }
  }

  return (
    <main>
      <h1>Quét QR & in nhãn thiết bị</h1>
      <p className="muted">Dùng đầu đọc mã vạch/QR quét nhãn đã dán trên thiết bị để kiểm kê nhanh tình trạng.</p>

      {message && <div className={`notice ${message.type}`}>{message.text}</div>}

      <section className="card">
        <h2>Kiểm kê bằng mã QR</h2>
        <form onSubmit={lookup} className="filters">
          <input
            autoFocus
            placeholder="Quét mã QR hoặc nhập mã thiết bị (ví dụ ARD-001)"
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            style={{ minWidth: 320 }}
          />
          <button type="submit">Tra cứu</button>
        </form>

        {found && (
          <div>
            <p>
              <b>{found.code}</b> · {found.name}{' '}
              <span className={`badge ${found.condition}`}>{conditionLabels[found.condition]}</span>{' '}
              <span className={`badge ${found.status}`}>{equipmentStatusLabels[found.status]}</span>
            </p>
            <p className="muted">
              {found.category?.name ?? 'Chưa phân loại'} · {found.location?.name ?? 'Chưa xác định'}
            </p>
            <div className="filters">
              <button type="button" onClick={() => check('GOOD')}>
                Ghi nhận: Tốt
              </button>
              <button type="button" className="ghost" onClick={() => check('DAMAGED')}>
                Ghi nhận: Hỏng
              </button>
              <button type="button" className="danger" onClick={() => check('LOST')}>
                Ghi nhận: Mất
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="row">
          <div>
            <h2>In nhãn QR hàng loạt</h2>
            <p className="muted">Nhập danh sách mã thiết bị cần in (phân tách bằng dấu phẩy), để trống để in toàn bộ.</p>
          </div>
          <button type="button" className="ghost" onClick={() => window.print()}>
            In nhãn
          </button>
        </div>
        <div className="filters">
          <input placeholder="ARD-001, ESP-001, CAB-003" value={labelCode} onChange={(event) => setLabelCode(event.target.value)} style={{ minWidth: 320 }} />
        </div>
        <div className="grid">
          {equipment
            .filter((item) => {
              if (!labelCode.trim()) return true;
              const wanted = labelCode.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean);
              return wanted.includes(item.code.toUpperCase());
            })
            .map((item) => (
              <div key={item.id} className="stat" style={{ textAlign: 'center' }}>
                <div className="qr">
                  <QRCode value={item.qrPayload} size={110} />
                </div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>{item.code}</div>
                <div className="muted">{item.name}</div>
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
