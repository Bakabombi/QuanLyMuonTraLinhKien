'use client';
import { useState } from 'react';
export default function RegisterPage() {
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => ({ message: 'Đăng ký thất bại. Hãy thử lại hoặc kiểm tra máy chủ.' }));
    if (!response.ok) return setError(payload.message);
    window.location.href = '/student';
  }
  return (
    <main>
      <section className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
        <h1>Đăng ký tài khoản sinh viên</h1>
        <p className="muted">Dùng tài khoản này để đăng ký mượn linh kiện và thiết bị tại xưởng CNTT.</p>
        <form onSubmit={submit}>
          <label>
            Họ và tên
            <input name="fullName" placeholder="Họ và tên" required />
          </label>
          <label>
            Mã sinh viên
            <input name="studentCode" placeholder="Ví dụ SV2021003" required />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="Email" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" minLength="8" placeholder="Ít nhất 8 ký tự" required />
          </label>
          <button>Tạo tài khoản</button>
          {error && <p className="error">{error}</p>}
        </form>
        <p className="muted">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </section>
    </main>
  );
}
