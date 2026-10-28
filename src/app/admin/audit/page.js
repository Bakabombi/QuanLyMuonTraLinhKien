'use client';

import { useCallback, useEffect, useState } from 'react';
import { auditActionLabels, roleLabels, formatDateTime } from '@/lib/labels';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams(action ? { action } : {});
    const response = await fetch(`/api/audit?${params}`);
    setLogs(response.ok ? await response.json() : []);
  }, [action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main>
      <div className="row">
        <div>
          <h1>Nhật ký truy vết</h1>
          <p className="muted">Mọi thao tác quan trọng trên thiết bị và phiếu mượn đều được ghi lại để phục vụ truy vết. Chỉ quản trị viên xem được.</p>
        </div>
      </div>

      <section className="card">
        <div className="filters">
          <select value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">Tất cả hành động</option>
            {Object.entries(auditActionLabels).map(([value, label]) => (
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
                <th>Thời điểm</th>
                <th>Hành động</th>
                <th>Người thực hiện</th>
                <th>Thiết bị</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="muted">{formatDateTime(log.createdAt)}</td>
                  <td>
                    <span className="badge">{auditActionLabels[log.action] ?? log.action}</span>
                  </td>
                  <td>
                    {log.user ? (
                      <>
                        {log.user.fullName}
                        <div className="muted">{roleLabels[log.user.role] ?? log.user.role}</div>
                      </>
                    ) : (
                      <span className="muted">Hệ thống</span>
                    )}
                  </td>
                  <td>{log.equipment ? `${log.equipment.code} · ${log.equipment.name}` : '—'}</td>
                  <td className="muted">{log.detail ? JSON.stringify(log.detail) : '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5}>Chưa có bản ghi nhật ký nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
