'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Users, Package, Wallet, Settings, Calendar, BarChart2, Camera } from 'lucide-react';

export default function MobileNav({ userRole }: { userRole: string | null }) {
  const pathname = usePathname();

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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-neutral-900 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-stretch">
      {link('/', 'Home', LayoutDashboard)}
      {isDispatch && link('/dispatch', 'Dispatch', Truck)}
      {isDispatch && link('/dispatch/schedule', 'Schedule', Calendar)}
      {isDispatch && link('/customers', 'Customers', Users)}
      {userRole === 'admin' && link('/inventory', 'Inventory', Package)}
      {link('/photos', 'Photos', Camera)}
      {userRole === 'admin' && link('/revenue', 'Revenue', Wallet, true)}
      {userRole === 'admin' && link('/admin/reports', 'Reports', BarChart2)}
      {userRole === 'admin' && link('/admin/techs', 'Admin', Settings)}
    </nav>
  );
}
