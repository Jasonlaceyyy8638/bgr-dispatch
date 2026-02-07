'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TechInvoicePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-neutral-500 font-bold uppercase animate-pulse">Redirecting…</p>
    </div>
  );
}
