'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tx = { id: string; name: string; tech: string; amountNum: number };

export default function AdminReportsPage() {
  const router = useRouter();
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [txs, setTxs] = useState<Tx[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user.role !== 'admin') {
        router.replace('/');
        return;
      }
      setAllowed(true);
    } catch {
      router.replace('/');
    }
  }, [router]);

  async function loadReport() {
    if (!from || !to) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const json = await res.json();
      setTxs(json.txs ?? []);
      setTotalRevenue(Number(json.totalRevenue) || 0);
      setTotalCost(Number(json.totalCost) || 0);
      setNetProfit(Number(json.netProfit) ?? 0);
    } catch {
      setTxs([]);
      setTotalRevenue(0);
      setTotalCost(0);
      setNetProfit(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed && from && to) loadReport();
  }, [allowed, from, to]);

  const byTech = txs.reduce((acc, t) => {
    const tech = t.tech || 'Unassigned';
    if (!acc[tech]) acc[tech] = { revenue: 0, count: 0 };
    acc[tech].revenue += t.amountNum;
    acc[tech].count += 1;
    return acc;
  }, {} as Record<string, { revenue: number; count: number }>);

  function exportUrl(type: 'jobs' | 'revenue') {
    const params = new URLSearchParams({ type });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `/api/export?${params.toString()}`;
  }

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm min-h-[44px]';

  if (allowed !== true) return null;

  return (
    <div className="max-w-4xl mx-auto pb-24 sm:pb-8">
      <div className="mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
          Reports <span className="text-red-600"> & export</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          Revenue by period, by tech · Export CSV
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">From date</label>
          <input
            type="date"
            className={inputClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">To date</label>
          <input
            type="date"
            className={inputClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500 font-bold uppercase animate-pulse py-8">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Revenue</p>
              <p className="text-lg sm:text-xl font-bold text-green-500 mt-1">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Cost</p>
              <p className="text-lg sm:text-xl font-bold text-neutral-400 mt-1">${totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Net</p>
              <p className="text-lg sm:text-xl font-bold text-white mt-1">${netProfit.toFixed(2)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Jobs</p>
              <p className="text-lg sm:text-xl font-bold text-red-600 mt-1">{txs.length}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase text-white tracking-wider mb-3">By tech</h2>
            <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
              {Object.entries(byTech).length === 0 ? (
                <p className="p-4 text-neutral-500 text-sm uppercase">No closed jobs in range</p>
              ) : (
                <ul className="divide-y divide-neutral-800">
                  {Object.entries(byTech).map(([tech, { revenue, count }]) => (
                    <li key={tech} className="flex justify-between items-center p-4">
                      <span className="font-bold text-white uppercase text-sm">{tech}</span>
                      <span className="text-neutral-400 text-sm">{count} job{count !== 1 ? 's' : ''} · ${revenue.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={exportUrl('revenue')}
              download
              className="inline-flex justify-center items-center min-h-[48px] px-6 bg-green-700 hover:bg-green-600 text-white font-bold uppercase text-sm tracking-wider rounded-sm touch-manipulation"
            >
              Download revenue CSV
            </a>
            <a
              href={exportUrl('jobs')}
              download
              className="inline-flex justify-center items-center min-h-[48px] px-6 bg-neutral-800 hover:bg-neutral-700 text-white font-bold uppercase text-sm tracking-wider rounded-sm touch-manipulation"
            >
              Download jobs CSV
            </a>
          </div>
        </>
      )}

      <Link href="/admin/techs" className="inline-block mt-6 text-[10px] font-bold uppercase text-neutral-500 hover:text-white touch-manipulation">
        ← User Mgmt
      </Link>
    </div>
  );
}
