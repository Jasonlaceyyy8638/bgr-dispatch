'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type User = { id: string; name: string; role?: string };

export default function UserMenu({ variant = 'sidebar' }: { variant?: 'sidebar' | 'mobile' }) {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tech_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUser({ id: u.id, name: u.name, role: u.role });
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  function signOut() {
    localStorage.removeItem('tech_user');
    window.location.href = '/login';
  }

  if (!user) return null;

  const isMobile = variant === 'mobile';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          isMobile
            ? 'flex items-center justify-center w-10 h-10 rounded-full border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 transition-colors'
            : 'w-full flex items-center justify-between gap-2 py-3 px-3 text-left rounded-md border border-transparent hover:bg-neutral-900 hover:border-neutral-800 transition-colors'
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        {isMobile ? (
          <span className="text-sm font-bold uppercase truncate max-w-[80px]" title={user.name}>
            {user.name.split(' ').map((n) => n[0]).join('')}
          </span>
        ) : (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 truncate flex-1">
              {user.name}
            </span>
            <span className="text-neutral-600 text-xs">▼</span>
          </>
        )}
      </button>

      {open && (
        <div
          className={
            isMobile
              ? 'absolute right-0 top-full mt-2 w-48 py-1 bg-neutral-950 border border-neutral-800 rounded-sm shadow-xl z-[100]'
              : 'absolute left-0 right-0 bottom-full mb-1 py-1 bg-neutral-950 border border-neutral-800 rounded-sm shadow-xl z-10'
          }
        >
          <div className="px-3 py-2 border-b border-neutral-800">
            <p className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider">Signed in</p>
            <p className="text-white font-semibold text-sm truncate">{user.name}</p>
          </div>
          <Link
            href="/login?change=1"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            Change PIN
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400 hover:bg-neutral-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
