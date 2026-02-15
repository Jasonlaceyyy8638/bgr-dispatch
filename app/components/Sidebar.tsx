'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import UserMenu from './UserMenu';

export default function Sidebar() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      setUserRole(user.role || 'tech');
    } catch {
      setUserRole('tech');
    }
  }, [pathname]);

  const navLink = (href: string, label: string, active?: boolean) => (
    <Link
      href={href}
      className={`block px-4 py-3.5 font-semibold uppercase tracking-wider text-sm transition-colors rounded-r-md ${
        pathname === href
          ? 'bg-neutral-900 text-white border-l-4 border-red-600'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <aside className="fixed left-0 top-0 z-40 h-full w-72 flex flex-col border-r border-neutral-900 bg-black">
      {/* Logo - same placement as before */}
      <div className="flex justify-center py-8 px-4 border-b border-neutral-900">
        <img src="/logo.png" alt="BGR Logo" className="w-full max-w-[200px] h-auto object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navLink('/', 'Dashboard')}
        {(userRole === 'admin' || userRole === 'dispatcher') && navLink('/dispatch', 'Dispatch Center')}
        {(userRole === 'admin' || userRole === 'dispatcher') && navLink('/dispatch/schedule', 'Schedule')}
        {(userRole === 'admin' || userRole === 'dispatcher') && navLink('/customers', 'Customers')}
        {(userRole === 'admin' || userRole === 'dispatcher') && navLink('/photos', 'Photos')}
        {(userRole === 'admin' || userRole === 'dispatcher') && navLink('/admin/time-clocks', 'Time clocks')}

        {userRole === 'admin' && (
          <>
            <div className="my-4 mx-4 h-px bg-neutral-800" />
            {navLink('/inventory', 'Inventory')}
            {navLink('/revenue', 'Revenue')}
            {navLink('/admin/reports', 'Reports & export')}
            {navLink('/admin/business', 'Business settings')}
            {navLink('/admin/techs', 'User Mgmt')}
            {navLink('/admin/settings', 'Admin sign-in')}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-neutral-900">
        <UserMenu variant="sidebar" />
      </div>
    </aside>
  );
}
