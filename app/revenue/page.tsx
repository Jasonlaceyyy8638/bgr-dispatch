'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tx = {
  id: string;
  time: string;
  name: string;
  service: string;
  tech: string;
  amount: string;
  amountNum: number;
  costAmount?: number;
  cardFeeAmount?: number;
  paymentMethod?: string;
};

export default function RevenuePage() {
  const router = useRouter();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalCardFees, setTotalCardFees] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [cardFeeRate, setCardFeeRate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');

  function getDateRange(p: 'today' | 'week' | 'month' | 'year') {
    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    let from = new Date(now);
    from.setHours(0, 0, 0, 0);
    if (p === 'today') {
      // from already today 00:00, to today 23:59
    } else if (p === 'week') {
      const day = from.getDay();
      const diff = from.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      from.setDate(diff);
    } else if (p === 'month') {
      from.setDate(1);
    } else if (p === 'year') {
      from.setMonth(0, 1);
    }
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }

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

  async function fetchRevenue() {
    setLoading(true);
    setRevenueError(null);
    try {
      const { from, to } = getDateRange(period);
      const res = await fetch(`/api/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const json = await res.json();
      setTxs(json.txs ?? []);
      setTotalRevenue(Number(json.totalRevenue) || 0);
      setTotalCost(Number(json.totalCost) || 0);
      setTotalCardFees(Number(json.totalCardFees) || 0);
      setNetProfit(Number(json.netProfit) ?? 0);
      const pct = json.cardFeePercent != null ? Number(json.cardFeePercent) : null;
      const fix = json.cardFeeFixed != null ? Number(json.cardFeeFixed) : null;
      setCardFeeRate(pct != null ? `${pct}%${fix != null && fix > 0 ? ` + $${fix.toFixed(2)}` : ''}` : null);
      if (json.error && !(json.txs?.length)) setRevenueError(json.error);
    } catch {
      setTxs([]);
      setRevenueError('Could not load revenue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) fetchRevenue();
  }, [allowed, period]);

  async function setJobCost(jobId: string | number, costAmount: number) {
    const id = String(jobId ?? '').trim();
    if (!id) return;
    try {
      const res = await fetch('/api/jobs/update-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, cost_amount: costAmount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Could not update cost.');
        return;
      }
      setTxs((prev) =>
        prev.map((t) => (String(t.id) === id ? { ...t, costAmount } : t))
      );
      fetchRevenue();
    } catch {
      alert('Could not update cost.');
    }
  }

  async function removeJob(jobId: string | number) {
    if (!confirm('Remove this job from revenue? It will be deleted permanently.')) return;
    const id = String(jobId ?? '').trim();
    if (!id) return;
    try {
      const res = await fetch('/api/jobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Could not delete job.');
        return;
      }
      setTxs((prev) => prev.filter((t) => String(t.id) !== id));
    } catch {
      alert('Could not delete job.');
    }
  }

  if (allowed !== true) return null;

  return (
    <div className="max-w-5xl mx-auto pb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 sm:mb-8 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
            Revenue <span className="text-green-600">Secure</span>
          </h1>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
            Transaction history
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-sm">
          {(['today', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`flex-1 sm:flex-none px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors touch-manipulation min-h-[44px] sm:min-h-0 ${
                period === p ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 sm:mb-8">
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Gross revenue</p>
          <p className="text-xl sm:text-2xl font-bold text-green-500 mt-1">
            ${totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Total cost</p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-400 mt-1">
            ${totalCost.toFixed(2)}
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            {totalCardFees > 0 && cardFeeRate ? `Includes card fees below` : 'Set cost per job below'}
          </p>
        </div>
        <div className="bg-neutral-950 border border-amber-900/50 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Card fees</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-500 mt-1">
            ${totalCardFees.toFixed(2)}
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">
            {cardFeeRate ? cardFeeRate : 'Card payments only'}
          </p>
        </div>
        <div className="bg-neutral-950 border border-green-900/50 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Net profit (margin)</p>
          <p className="text-xl sm:text-2xl font-bold text-green-500 mt-1">
            ${netProfit.toFixed(2)}
          </p>
          <p className="text-[10px] text-neutral-600 mt-0.5">After all costs (incl. card fees)</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Avg ticket</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">
            {txs.length ? `$${(totalRevenue / txs.length).toFixed(2)}` : '$0.00'}
          </p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Jobs done</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-500 mt-1">{txs.length}</p>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-bold uppercase text-white text-sm tracking-wider">Recent transactions</h3>
          <button type="button" className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
            View all
          </button>
        </div>
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 p-4 bg-neutral-900/50 text-[10px] font-bold uppercase text-neutral-500 tracking-wider border-b border-neutral-800">
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Customer</div>
          <div className="col-span-2">Service</div>
          <div className="col-span-2 text-center">Tech</div>
          <div className="col-span-1 text-right">Cost</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        <div className="divide-y divide-neutral-800">
          {loading ? (
            <div className="p-8 text-center text-neutral-500 font-bold uppercase text-sm">Loading…</div>
          ) : txs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-neutral-500 font-semibold uppercase text-sm">No closed jobs yet</p>
              {revenueError && <p className="text-red-500 text-xs mt-2 max-w-sm mx-auto">{revenueError}</p>}
              <p className="text-neutral-600 text-[10px] uppercase mt-2">Close jobs with cash, check, or card to see them here.</p>
            </div>
          ) : (
          txs.map((tx) => (
            <div key={tx.id} className="p-4 sm:p-5 hover:bg-neutral-900/30">
              <div className="hidden sm:grid sm:grid-cols-12 gap-4 items-center">
                <div className="col-span-2 text-neutral-500 text-sm">{tx.time}</div>
                <div className="col-span-2 font-bold text-white uppercase text-sm truncate">{tx.name}</div>
                <div className="col-span-2 text-neutral-500 text-xs uppercase min-w-0 truncate">{tx.service}</div>
                <div className="col-span-2 text-center min-w-0">
                  <span className="text-[10px] font-bold px-2 py-1 bg-neutral-800 rounded-sm whitespace-nowrap" title={tx.tech}>{tx.tech}</span>
                </div>
                <div className="col-span-1 text-right flex items-center justify-end gap-1">
                  <span className="text-neutral-400 text-sm">{(tx.costAmount ?? 0) > 0 ? `$${Number(tx.costAmount).toFixed(2)}` : '—'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const v = prompt('Cost for this job ($):', (tx.costAmount ?? 0) > 0 ? String(tx.costAmount) : '');
                      if (v != null && v.trim() !== '') {
                        const num = parseFloat(v.trim());
                        if (!Number.isNaN(num) && num >= 0) setJobCost(tx.id, num);
                      }
                    }}
                    className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white"
                  >
                    Set
                  </button>
                </div>
                <div className="col-span-1 text-right font-bold text-green-500 shrink-0">{tx.amount}</div>
                <div className="col-span-2 text-right flex flex-col gap-2 justify-center items-end">
                  <Link
                    href={`/tech/invoice/${tx.id}?view=1`}
                    className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white whitespace-nowrap"
                  >
                    View invoice
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeJob(tx.id)}
                    className="text-[10px] font-bold uppercase text-red-600 hover:text-red-500 whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="sm:hidden flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase">{tx.time} · <span className="whitespace-nowrap">{tx.tech}</span></p>
                    <h4 className="font-bold text-white uppercase">{tx.name}</h4>
                  </div>
                  <span className="font-bold text-green-500">{tx.amount}</span>
                </div>
                <p className="text-[10px] text-neutral-500 uppercase border-l-2 border-red-600 pl-2">{tx.service}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500">Cost: {(tx.costAmount ?? 0) > 0 ? `$${Number(tx.costAmount).toFixed(2)}` : '—'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const v = prompt('Cost for this job ($):', (tx.costAmount ?? 0) > 0 ? String(tx.costAmount) : '');
                      if (v != null && v.trim() !== '') {
                        const num = parseFloat(v.trim());
                        if (!Number.isNaN(num) && num >= 0) setJobCost(tx.id, num);
                      }
                    }}
                    className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white"
                  >
                    Set cost
                  </button>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/tech/invoice/${tx.id}?view=1`}
                    className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white touch-manipulation"
                  >
                    View invoice (check photo)
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeJob(tx.id)}
                    className="text-[10px] font-bold uppercase text-red-600 self-start touch-manipulation"
                  >
                    Remove from revenue
                  </button>
                </div>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
