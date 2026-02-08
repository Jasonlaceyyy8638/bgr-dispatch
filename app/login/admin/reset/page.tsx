'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (newPassword.trim().length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          newPassword: newPassword.trim(),
          resetCode: resetCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Reset failed');
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError('Something went wrong');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center">
          <img src="/logo.png" alt="BGR Logo" className="w-40 sm:w-48 h-auto mb-8 object-contain" />
          <p className="text-green-500 font-bold uppercase text-sm mb-4">Password reset.</p>
          <p className="text-neutral-500 text-xs mb-6">Sign in with your email and new password.</p>
          <Link
            href="/login/admin"
            className="w-full bg-red-600 hover:bg-red-500 py-4 font-bold uppercase tracking-wider text-white rounded-sm text-center"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img src="/logo.png" alt="BGR Logo" className="w-40 sm:w-48 h-auto mb-8 object-contain" />
        <h2 className="text-lg font-bold uppercase text-white tracking-wider mb-2">Reset admin password</h2>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-6 text-center">
          Enter your admin email, new password, and your reset code (stored in env)
        </p>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <input
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-4 text-white font-semibold outline-none focus:border-red-600 rounded-sm placeholder:text-neutral-600"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="New password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-4 text-white font-semibold outline-none focus:border-red-600 rounded-sm placeholder:text-neutral-600"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <input
            type="text"
            placeholder="Reset code"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 p-4 text-white font-semibold outline-none focus:border-red-600 rounded-sm placeholder:text-neutral-600"
            required
            autoComplete="off"
          />
          {error && (
            <p className="text-red-600 text-xs font-bold uppercase text-center animate-pulse">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 py-4 font-bold uppercase tracking-wider text-white rounded-sm active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
        <Link
          href="/login/admin"
          className="mt-6 text-[10px] font-bold uppercase text-neutral-500 hover:text-white tracking-wider"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
