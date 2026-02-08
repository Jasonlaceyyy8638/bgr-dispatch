'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Invalid email or password');
        setLoading(false);
        return;
      }
      if (data.user) {
        localStorage.setItem('tech_user', JSON.stringify(data.user));
        window.location.href = '/';
      }
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img src="/logo.png" alt="BGR Logo" className="w-40 sm:w-48 h-auto mb-8 object-contain" />
        <h2 className="text-lg font-bold uppercase text-white tracking-wider mb-2">Admin sign in</h2>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-6">Email and password</p>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-4 text-white font-semibold outline-none focus:border-red-600 rounded-sm placeholder:text-neutral-600"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-4 text-white font-semibold outline-none focus:border-red-600 rounded-sm placeholder:text-neutral-600"
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="text-red-600 text-xs font-bold uppercase text-center animate-pulse">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 py-4 font-bold uppercase tracking-wider text-white rounded-sm active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link
          href="/login/admin/reset"
          className="mt-4 text-[10px] font-bold uppercase text-neutral-500 hover:text-white tracking-wider"
        >
          Forgot password? Reset with reset code
        </Link>
        <Link
          href="/login"
          className="mt-4 text-[10px] font-bold uppercase text-neutral-500 hover:text-white tracking-wider"
        >
          ← Tech sign in (name + PIN)
        </Link>
      </div>
    </div>
  );
}
