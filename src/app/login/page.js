'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => ({ message: 'Đăng nhập thất bại. Hãy thử lại hoặc kiểm tra máy chủ.' }));
    if (!response.ok) return setError(payload.message);
    window.location.href = '/';
  }
  return (
    <main>
      <section className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
        <h1>Hệ thống quản lý mượn/trả thiết bị</h1>
        <p className="muted">Khoa Công nghệ thông tin · Đăng nhập để đăng ký mượn hoặc quản lý kho xưởng.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" placeholder="Email" required />
          </label>
          <label>
            Mật khẩu
            <input name="password" type="password" placeholder="Mật khẩu" required />
          </label>
          <button>Đăng nhập</button>
          {error && <p className="error">{error}</p>}
        </form>
        <p className="muted">
          Sinh viên chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
        </p>
      </section>
    </main>
  );
}
