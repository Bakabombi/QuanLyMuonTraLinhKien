'use client';

import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import { conditionLabels, equipmentStatusLabels, formatMoney, proposalStatusLabels } from '@/lib/labels';

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip);

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState(6);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/dashboard?months=${months}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message ?? 'Không tải được dữ liệu dashboard');
        }
        return response.json();
      })
      .then(setData)
      .catch((caught) => setError(caught.message));
  }, [months]);

  if (error) return <main><div className="notice error">{error}</div></main>;
  if (!data) return <main>Đang tải dashboard…</main>;

  const wearDoughnut = {
    labels: ['Tốt', 'Hỏng', 'Mất'],
    datasets: [
      {
        data: [data.wear.returnedCount - data.wear.damagedCount - data.wear.lostCount, data.wear.damagedCount, data.wear.lostCount],
        backgroundColor: ['#2e90fa', '#f79009', '#d92d20']
      }
    ]
  };

  const trendLine = {
    labels: data.trend.map((row) => row.label),
    datasets: [
      {
        type: 'line',
        label: 'Tỷ lệ hư hao (%)',
        data: data.trend.map((row) => row.wearRate),
        borderColor: '#d92d20',
        backgroundColor: '#d92d20',
        yAxisID: 'y'
      },
      {
        type: 'bar',
        label: 'Lượt trả thiết bị',
        data: data.trend.map((row) => row.returned),
        backgroundColor: '#93b8f0',
        yAxisID: 'y1'
      }
    ]
  };

  const categoryBar = {
    labels: data.byCategory.map((row) => row.name),
    datasets: [{ label: 'Số thiết bị', data: data.byCategory.map((row) => row.count), backgroundColor: '#1455c0' }]
  };

  const statusBar = {
    labels: data.byStatus.map((row) => equipmentStatusLabels[row.status] ?? row.status),
    datasets: [{ label: 'Số thiết bị', data: data.byStatus.map((row) => row.count), backgroundColor: '#2e90fa' }]
  };

  const conditionBar = {
    labels: data.byCondition.map((row) => conditionLabels[row.condition] ?? row.condition),
    datasets: [
      {
        label: 'Số thiết bị',
        data: data.byCondition.map((row) => row.count),
        backgroundColor: data.byCondition.map((row) => (row.condition === 'GOOD' ? '#2e90fa' : row.condition === 'DAMAGED' ? '#f79009' : '#d92d20'))
      }
    ]
  };

  const openProposals = data.proposals.filter((proposal) => proposal.status === 'OPEN');

  return (
    <main>
      <div className="row">
        <div>
          <h1>Dashboard thống kê kho thiết bị</h1>
          <p className="muted">Tỷ lệ hư hao, cảnh báo quá hạn và đề xuất nhập bổ sung cho xưởng CNTT.</p>
        </div>
        <label>
          Khoảng thống kê
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))}>
            <option value={3}>3 tháng</option>
            <option value={6}>6 tháng</option>
            <option value={12}>12 tháng</option>
          </select>
        </label>
      </div>

      <section className="grid">
        <div className="stat">
          <div className="value">{data.total}</div>
          <div className="label">Tổng thiết bị trong kho</div>
        </div>
        <div className="stat danger">
          <div className="value">{data.overdue}</div>
          <div className="label">Phiếu quá hạn trả</div>
        </div>
        <div className="stat warn">
          <div className="value">{data.dueSoon}</div>
          <div className="label">Sắp tới hạn (24 giờ)</div>
        </div>
        <div className="stat">
          <div className="value">{data.openLoans}</div>
          <div className="label">Phiếu đang xử lý</div>
        </div>
        <div className="stat warn">
          <div className="value">{data.wear.wearRate}%</div>
          <div className="label">Tỷ lệ hư hao ({data.wear.returnedCount} lượt trả)</div>
        </div>
        <div className="stat danger">
          <div className="value">{formatMoney(data.wear.compensationTotal)}</div>
          <div className="label">Tổng phí đền bù ghi nhận</div>
        </div>
      </section>

      <section className="card">
        <h2>Tỷ lệ hư hao theo thời gian</h2>
        <Line
          data={trendLine}
          options={{
            responsive: true,
            scales: {
              y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Tỷ lệ (%)' } },
              y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Lượt trả' } }
            }
          }}
        />
      </section>

      <section className="grid">
        <div className="card" style={{ margin: 0 }}>
          <h2>Cơ cấu tình trạng khi nhận trả</h2>
          <Doughnut data={wearDoughnut} />
          <p className="muted">
            Hỏng: {data.wear.damagedCount} · Mất: {data.wear.lostCount} · Trên tổng {data.wear.returnedCount} thiết bị được trả.
          </p>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h2>Tình trạng hiện tại</h2>
          <Bar data={conditionBar} />
        </div>
      </section>

      <section className="grid">
        <div className="card" style={{ margin: 0 }}>
          <h2>Thiết bị theo trạng thái</h2>
          <Bar data={statusBar} />
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h2>Thiết bị theo danh mục</h2>
          <Bar data={categoryBar} />
        </div>
      </section>

      <section className="card">
        <h2>Thiết bị hư hao nhiều nhất</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên thiết bị</th>
                <th>Danh mục</th>
                <th>Số lần hỏng/mất</th>
              </tr>
            </thead>
            <tbody>
              {data.topHarmed.map((item) => (
                <tr key={item.code}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    <span className="badge danger">{item.count} lần</span>
                  </td>
                </tr>
              ))}
              {data.topHarmed.length === 0 && (
                <tr>
                  <td colSpan={4}>Chưa ghi nhận hư hao trong khoảng thời gian này.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="row">
          <h2>Đề xuất nhập bổ sung ({openProposals.length} đang chờ)</h2>
          <a href="/staff/proposals">
            <button type="button">Quản lý đề xuất</button>
          </a>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Số lượng đề xuất</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.proposals.slice(0, 8).map((proposal) => (
                <tr key={proposal.id}>
                  <td>{proposal.title}</td>
                  <td>{proposal.suggestedQty}</td>
                  <td className="muted">{proposal.reason}</td>
                  <td>
                    <span className={`badge ${proposal.status === 'OPEN' ? 'warn' : 'good'}`}>{proposalStatusLabels[proposal.status]}</span>
                  </td>
                </tr>
              ))}
              {data.proposals.length === 0 && (
                <tr>
                  <td colSpan={4}>Chưa có đề xuất nhập bổ sung.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
