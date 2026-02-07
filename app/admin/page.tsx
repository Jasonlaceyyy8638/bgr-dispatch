'use client';

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="max-w-2xl mx-auto pb-6 text-center">
      <h1 className="text-2xl font-bold uppercase text-white tracking-tight mb-4">Admin</h1>
      <p className="text-neutral-500 text-sm mb-6">Manage users and revenue from the nav.</p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/admin/techs" className="bg-neutral-900 border border-neutral-800 py-3 px-6 font-bold uppercase text-sm text-white rounded-sm hover:bg-neutral-800">
          User management
        </Link>
        <Link href="/revenue" className="bg-neutral-900 border border-neutral-800 py-3 px-6 font-bold uppercase text-sm text-white rounded-sm hover:bg-neutral-800">
          Revenue
        </Link>
      </div>
    </div>
  );
}
