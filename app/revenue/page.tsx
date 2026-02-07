'use client';

import { useState, useEffect } from 'react';

const ADMIN_PIN = '1234';

type Tx = {
  id: string;
  time: string;
  name: string;
  service: string;
  tech: string;
  amount: string;
  amountNum: number;
};

export default function RevenuePage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      setLoading(true);
      setRevenueError(null);
      try {
        const res = await fetch('/api/revenue');
        const json = await res.json();
        setTxs(json.txs ?? []);
        if (json.error && !(json.txs?.length)) setRevenueError(json.error);
      } catch {
        setTxs([]);
        setRevenueError('Could not load revenue.');
      } finally {
        setLoading(false);
      }
    })();
  }, [unlocked]);

  function handlePin(e: React.FormEvent) {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 p-6 sm:p-8 rounded-sm">
          <div className="text-center mb-6">
            <span className="text-3xl">🔒</span>
            <h2 className="text-lg font-bold uppercase text-white mt-3 tracking-wider">Admin</h2>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">Enter PIN</p>
          </div>
          <form onSubmit={handlePin} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-black border border-neutral-800 p-4 text-white text-2xl font-bold text-center tracking-[0.4em] outline-none focus:border-red-600 rounded-sm"
              placeholder="••••"
              maxLength={4}
              autoFocus
            />
            {error && <p className="text-red-600 text-xs font-bold uppercase text-center">{error}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 py-4 font-bold uppercase tracking-wider text-white rounded-sm active:scale-[0.98]">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

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
          {['Today', 'Week', 'Month', 'Year'].map((label, i) => (
            <button
              key={label}
              type="button"
              className={`flex-1 sm:flex-none px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors ${
                i === 0 ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Gross revenue</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-500 mt-1">
            ${txs.reduce((s, t) => s + t.amountNum, 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Avg ticket</p>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
            {txs.length ? `$${(txs.reduce((s, t) => s + t.amountNum, 0) / txs.length).toFixed(2)}` : '$0.00'}
          </p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm text-center sm:text-left">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Jobs done</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-500 mt-1">{txs.length}</p>
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
          <div className="col-span-4">Customer</div>
          <div className="col-span-3">Service</div>
          <div className="col-span-1 text-center">Tech</div>
          <div className="col-span-2 text-right">Amount</div>
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
                <div className="col-span-4 font-bold text-white uppercase text-sm">{tx.name}</div>
                <div className="col-span-3 text-neutral-500 text-xs uppercase">{tx.service}</div>
                <div className="col-span-1 text-center">
                  <span className="text-[10px] font-bold px-2 py-1 bg-neutral-800 rounded-sm">{tx.tech}</span>
                </div>
                <div className="col-span-2 text-right font-bold text-green-500">{tx.amount}</div>
              </div>
              <div className="sm:hidden flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase">{tx.time} · {tx.tech}</p>
                    <h4 className="font-bold text-white uppercase">{tx.name}</h4>
                  </div>
                  <span className="font-bold text-green-500">{tx.amount}</span>
                </div>
                <p className="text-[10px] text-neutral-500 uppercase border-l-2 border-red-600 pl-2">{tx.service}</p>
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
}
