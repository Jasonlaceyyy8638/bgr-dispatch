'use client';

import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import UserMenu from './components/UserMenu';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const isPublicWarranty = pathname?.includes?.('/invoice/') && pathname?.endsWith?.('/warranty');

  useEffect(() => {
    if (isPublicWarranty) {
      setLoading(false);
      return;
    }
    const userData = localStorage.getItem('tech_user');
    if (!userData && pathname !== '/login' && !pathname?.startsWith?.('/login/admin')) {
      router.replace('/login');
    } else if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role || 'tech');
      } catch {
        setUserRole('tech');
      }
    }
    setLoading(false);
  }, [pathname, router, isPublicWarranty]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black overflow-x-hidden max-w-[100vw]">
        <p className="text-white font-bold uppercase animate-pulse">Loading…</p>
      </div>
    );
  }

  if (pathname === '/login' || pathname === '/login/admin' || pathname?.startsWith?.('/login/admin/') || isPublicWarranty) {
    return <div className="bg-black text-white min-h-screen overflow-x-hidden max-w-[100vw]">{children}</div>;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen overflow-x-hidden max-w-[100vw]">
      {/* Mobile: fixed logo header + user menu */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 sm:h-20 bg-black border-b border-neutral-900 flex items-center justify-between px-4 z-50 safe-area-inset-top">
        <div className="flex-1 min-w-0 flex justify-center">
          <img src="/logo.png" alt="BGR Logo" className="h-9 sm:h-10 w-auto object-contain" />
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <UserMenu variant="mobile" />
        </div>
      </header>

      {/* Desktop: sidebar with logo */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content: below logo on mobile, beside sidebar on desktop */}
      <main className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden pt-16 sm:pt-20 md:pt-6 md:pl-72 p-4 md:p-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav userRole={userRole} />
    </div>
  );
}
