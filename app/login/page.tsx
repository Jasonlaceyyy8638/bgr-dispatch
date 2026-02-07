'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const changePinMode = searchParams.get('change') === '1';
  const [users, setUsers] = useState<{ id: string; name: string; must_change_pin?: boolean }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('tech_users').select('id, name, must_change_pin').order('name');
      if (data) setUsers(data);
    }
    load();
    localStorage.removeItem('tech_user');
  }, []);

  async function handleLogin() {
    setError('');
    if (!selectedUser) {
      setError('Select your name');
      return;
    }
    const { data } = await supabase
      .from('tech_users')
      .select('*')
      .eq('id', selectedUser.id)
      .eq('pin', pin.trim())
      .single();
    if (data) {
      if (data.must_change_pin) {
        setIsChangingPin(true);
      } else {
        localStorage.setItem('tech_user', JSON.stringify(data));
        window.location.href = '/';
      }
    } else {
      setError('Invalid PIN. Try again.');
      setPin('');
    }
  }

  async function handlePinUpdate() {
    if (newPin.length < 4) {
      setError('PIN must be 4+ digits');
      return;
    }
    if (!selectedUser) return;
    const { error: err } = await supabase
      .from('tech_users')
      .update({ pin: newPin, must_change_pin: false })
      .eq('id', selectedUser.id);
    if (!err) {
      alert('PIN updated. Please log in again.');
      window.location.reload();
    }
  }

  async function handleChangePinOnly() {
    setError('');
    if (!selectedUser) {
      setError('Select your name');
      return;
    }
    if (pin.trim().length < 4) {
      setError('Enter current PIN');
      return;
    }
    if (newPin.length < 4) {
      setError('New PIN must be 4+ digits');
      return;
    }
    const { data } = await supabase
      .from('tech_users')
      .select('id')
      .eq('id', selectedUser.id)
      .eq('pin', pin.trim())
      .single();
    if (!data) {
      setError('Current PIN is wrong');
      setPin('');
      return;
    }
    const { error: err } = await supabase
      .from('tech_users')
      .update({ pin: newPin })
      .eq('id', selectedUser.id);
    if (!err) {
      alert('PIN updated. You can log in with your new PIN.');
      window.location.href = '/login';
    } else {
      setError('Could not update PIN');
    }
  }

  if (changePinMode && !isChangingPin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm flex flex-col items-center">
          <img src="/logo.png" alt="BGR Logo" className="w-40 sm:w-48 h-auto mb-6 object-contain" />
          <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-4">Change your PIN</p>
          <div className="w-full space-y-4">
            <select
              value={selectedUser?.id ?? ''}
              onChange={(e) => setSelectedUser(users.find((u) => u.id === e.target.value) ?? null)}
              className="w-full bg-neutral-900 border border-neutral-800 p-4 text-white font-semibold uppercase text-center outline-none focus:border-red-600 rounded-sm appearance-none cursor-pointer"
            >
              <option value="">— Select name —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>
              ))}
            </select>
            <input
              type="password"
              placeholder="Current PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 p-4 text-white text-xl font-bold text-center tracking-widest focus:border-red-600 outline-none rounded-sm"
            />
            <input
              type="password"
              placeholder="New PIN (4+ digits)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChangePinOnly()}
              className="w-full bg-neutral-950 border border-neutral-800 p-4 text-white text-xl font-bold text-center tracking-widest focus:border-green-600 outline-none rounded-sm"
            />
            {error && <p className="text-red-600 text-xs font-bold uppercase text-center">{error}</p>}
            <button
              type="button"
              onClick={handleChangePinOnly}
              className="w-full bg-green-600 hover:bg-green-500 py-4 font-bold uppercase text-sm text-white rounded-sm"
            >
              Update PIN
            </button>
          </div>
          <Link href="/login" className="mt-4 text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <img src="/logo.png" alt="BGR Logo" className="w-40 sm:w-48 h-auto mb-8 object-contain" />

        {!isChangingPin ? (
          <div className="w-full space-y-4">
            <select
              value={selectedUser?.id ?? ''}
              onChange={(e) => setSelectedUser(users.find((u) => u.id === e.target.value) ?? null)}
              className="w-full bg-neutral-900 border border-neutral-800 p-4 sm:p-5 text-white font-semibold uppercase text-center outline-none focus:border-red-600 rounded-sm appearance-none cursor-pointer"
            >
              <option value="">— Select name —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full bg-neutral-950 border border-neutral-800 p-4 sm:p-5 text-white text-2xl sm:text-3xl font-bold text-center tracking-[0.4em] focus:border-red-600 outline-none rounded-sm"
            />

            {error && (
              <p className="text-red-600 text-xs font-bold uppercase text-center animate-pulse">{error}</p>
            )}

            <button
              type="button"
              onClick={handleLogin}
              className="w-full bg-red-600 hover:bg-red-500 py-4 sm:py-5 font-bold uppercase tracking-wider text-white rounded-sm active:scale-[0.98] transition-transform"
            >
              Unlock
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4 bg-neutral-950 p-6 sm:p-8 border border-neutral-800 rounded-sm">
            <p className="text-sm font-bold text-white uppercase text-center tracking-wider">Set new PIN</p>
            <input
              type="password"
              placeholder="New PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinUpdate()}
              className="w-full bg-black border border-neutral-800 p-4 text-white text-xl font-bold text-center tracking-widest focus:border-green-600 outline-none rounded-sm"
            />
            {error && <p className="text-red-600 text-xs font-bold uppercase text-center">{error}</p>}
            <button
              type="button"
              onClick={handlePinUpdate}
              className="w-full bg-green-600 hover:bg-green-500 py-4 font-bold uppercase text-sm text-white rounded-sm active:scale-[0.98]"
            >
              Save & log in again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
