'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Users, Package, Wallet, Menu, X, Calendar, BarChart2, Camera, Building2, UserCog, LogIn, Clock } from 'lucide-react';
import TimeClockWidget from './TimeClockWidget';

export default function MobileNav({ userRole }: { userRole: string | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const link = (href: string, label: string, Icon: React.ComponentType<{ size?: number; className?: string }>, accentGreen?: boolean) => {
    const isActive = pathname === href;
    const color = isActive ? (accentGreen ? 'text-green-600' : 'text-red-600') : 'text-neutral-500';
    return (
      <Link
        href={href}
        className="flex flex-col items-center gap-1 min-w-0 flex-1 py-2 px-1 touch-manipulation"
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon size={22} className={color} />
        <span className={`text-[10px] font-bold uppercase tracking-wide truncate w-full text-center ${isActive ? 'text-white' : 'text-neutral-500'}`}>
          {label}
        </span>
      </Link>
    );
  };

  const isDispatch = userRole === 'admin' || userRole === 'dispatcher';
  const showHamburger = true;

  const menuLink = (href: string, label: string, Icon: React.ComponentType<{ size?: number; className?: string }>) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={() => setMenuOpen(false)}
        className={`flex items-center gap-3 px-4 py-3.5 font-semibold uppercase tracking-wider text-sm rounded-r-md ${
          isActive ? 'bg-neutral-900 text-white border-l-4 border-red-600' : 'text-neutral-400 hover:text-white hover:bg-neutral-900/50'
        }`}
      >
        <Icon size={20} className="shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-neutral-900 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-stretch">
        {link('/', 'Home', LayoutDashboard)}
        {isDispatch && link('/dispatch', 'Dispatch', Truck)}
        {userRole === 'admin' && link('/inventory', 'Inventory', Package)}
        {userRole === 'admin' && link('/revenue', 'Revenue', Wallet, true)}
        {showHamburger && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 min-w-0 flex-1 py-2 px-1 touch-manipulation"
            aria-label="Open menu"
          >
            <Menu size={22} className="text-neutral-500" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Menu</span>
          </button>
        )}
      </nav>

      {/* Hamburger drawer */}
      {showHamburger && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Close menu"
            className={`fixed inset-0 z-[60] bg-black/60 transition-opacity md:hidden ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}
          />
          <div
            className={`fixed top-0 right-0 bottom-0 z-[61] w-[min(280px,85vw)] bg-black border-l border-neutral-900 shadow-xl flex flex-col transition-transform duration-200 ease-out md:hidden ${
              menuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-900">
              <span className="font-bold uppercase tracking-wider text-white text-sm">Menu</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 -m-2 text-neutral-500 hover:text-white"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <TimeClockWidget />
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
              {menuLink('/', 'Dashboard', LayoutDashboard)}
              {isDispatch && menuLink('/dispatch', 'Dispatch', Truck)}
              {isDispatch && menuLink('/dispatch/schedule', 'Schedule', Calendar)}
              {isDispatch && menuLink('/customers', 'Customers', Users)}
              {isDispatch && menuLink('/photos', 'Photos', Camera)}
              {isDispatch && menuLink('/admin/time-clocks', 'Time clocks', Clock)}
              {userRole === 'admin' && (
                <>
                  <div className="my-4 mx-4 h-px bg-neutral-800" />
                  {menuLink('/admin/reports', 'Reports & export', BarChart2)}
                  {menuLink('/admin/business', 'Business settings', Building2)}
                  {menuLink('/admin/techs', 'User Mgmt', UserCog)}
                  {menuLink('/admin/settings', 'Admin sign-in', LogIn)}
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
