'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstTime = searchParams.get('first') === '1';
  const [admin, setAdmin] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user.role !== 'admin') {
        router.replace('/');
        return;
      }
      setAdmin({ id: user.id, name: user.name, email: user.email || '' });
      setNewEmail(user.email || '');
    } catch {
      router.replace('/');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!newEmail.trim()) {
      setError('Email is required');
      return;
    }
    if (newPassword.trim().length > 0 && newPassword.trim().length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (isFirstTime && newPassword.trim().length < 6) {
      setError('Set a password (min 6 characters)');
      return;
    }
    if (!isFirstTime) {
      if (!currentPassword) {
        setError('Current password required to save changes');
        return;
      }
      if (!newEmail.trim() && !newPassword.trim()) {
        setError('Enter new email and/or new password');
        return;
      }
    }
    setSaving(true);
    try {
      if (isFirstTime) {
        const res = await fetch('/api/auth/admin-set-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: admin?.id,
            email: newEmail.trim(),
            password: newPassword.trim(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Setup failed');
          setSaving(false);
          return;
        }
        setMessage('Sign-in set. From now on use Admin sign-in (email + password). Signing you out…');
        setTimeout(() => {
          localStorage.removeItem('tech_user');
          window.location.href = '/login/admin';
        }, 2000);
      } else {
        const res = await fetch('/api/auth/admin-update-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: admin?.id,
            currentPassword,
            newEmail: newEmail.trim() || undefined,
            newPassword: newPassword.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Update failed');
          setSaving(false);
          return;
        }
        setMessage('Saved. Use your new email/password to sign in next time.');
        setCurrentPassword('');
        setNewPassword('');
        localStorage.setItem('tech_user', JSON.stringify({ ...admin, email: newEmail.trim() }));
      }
    } catch {
      setError('Something went wrong');
    }
    setSaving(false);
  }

  if (!admin) return null;

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 sm:p-4 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm';

  return (
    <div className="max-w-md mx-auto pb-6">
      <div className="mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase text-white tracking-tight">
          Admin <span className="text-red-600">sign-in</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          {isFirstTime
            ? 'Set your email and password — you’ll use these to sign in from now on'
            : 'Change email and password for admin sign-in'}
        </p>
      </div>
      <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Signed in as</p>
        <p className="text-white font-semibold">{admin.name}</p>
        {admin.email && (
          <p className="text-neutral-500 text-sm mt-0.5">Current email: {admin.email}</p>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isFirstTime && (
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                placeholder="Required to save changes"
                required
                autoComplete="current-password"
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">New email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass}
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
              {isFirstTime ? 'Password (min 6 characters)' : 'New password (min 6 characters)'}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder={isFirstTime ? 'Choose a password' : 'Leave blank to keep current'}
              required={isFirstTime}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-red-600 text-xs font-bold uppercase">{error}</p>}
          {message && <p className="text-green-500 text-xs font-bold uppercase">{message}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-500 py-3 font-bold uppercase text-sm text-white rounded-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save email / password'}
          </button>
        </form>
      </div>
      <Link href="/admin/techs" className="inline-block mt-4 text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
        ← User Mgmt
      </Link>
    </div>
  );
}
