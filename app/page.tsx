'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [techId, setTechId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('tech_user');
    if (!raw) {
      setLoading(false);
      return;
    }
    try {
      const user = JSON.parse(raw);
      if (user?.id) {
        setTechId(user.id);
        fetchJobs(user.id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  function isToday(isoDate: string | null) {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  async function fetchJobs(techId: string) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('assigned_tech_id', techId);
      if (!error && data) setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const activeJobs = jobs.filter((j) => j.status !== 'Closed');
  // Techs see only their current (next) job; sort by scheduled date/time and take the first
  const sortedActive = [...activeJobs].sort((a, b) => {
    const dA = a.scheduled_date || a.created_at || '';
    const dB = b.scheduled_date || b.created_at || '';
    if (dA !== dB) return String(dA).localeCompare(String(dB));
    return String(a.start_time || '').localeCompare(String(b.start_time || ''));
  });
  const currentJob = sortedActive[0] ?? null;
  const closedToday = jobs.filter((j) => j.status === 'Closed' && isToday(j.created_at));
  const earnedToday = closedToday.reduce((sum, j) => sum + Number(j.payment_amount ?? j.price ?? 0), 0);

  const newJobBanner = currentJob && (() => {
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const updated = currentJob.updated_at ? new Date(currentJob.updated_at).getTime() : 0;
    const created = currentJob.created_at ? new Date(currentJob.created_at).getTime() : 0;
    return updated >= tenMinAgo || created >= tenMinAgo;
  })();

  return (
    <div className="max-w-4xl mx-auto pb-24 sm:pb-8">
      {newJobBanner && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-sm flex items-center justify-between gap-2">
          <span className="font-bold uppercase text-red-400 text-sm tracking-wider">New job assigned</span>
          <button
            type="button"
            onClick={() => currentJob && router.push(`/tech/job/${currentJob.id}`)}
            className="min-h-[44px] px-4 py-2 text-sm font-bold uppercase tracking-wider bg-red-600 text-white rounded-sm hover:bg-red-500 touch-manipulation"
          >
            Open job
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Current</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{currentJob ? 1 : 0}</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Done today</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{closedToday.length}</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Earned</p>
          <p className="text-xl sm:text-2xl font-bold text-white">${earnedToday.toFixed(2)}</p>
        </div>
      </div>

      <h2 className="text-lg sm:text-xl font-bold uppercase text-white mb-4 tracking-tight">
        Current <span className="text-red-600">Job</span>
      </h2>

      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="p-8 sm:p-12 text-center bg-neutral-950 border border-neutral-800 border-dashed rounded-sm">
            <p className="text-neutral-500 font-semibold uppercase text-sm">Loading…</p>
          </div>
        ) : !currentJob ? (
          <div className="p-8 sm:p-12 text-center bg-neutral-950 border border-neutral-800 border-dashed rounded-sm">
            <p className="text-neutral-500 font-semibold uppercase text-sm">No active jobs</p>
            <p className="text-neutral-600 text-xs mt-2">When a job is assigned and you close it, the next one will appear here.</p>
          </div>
        ) : (
          (() => {
            const job = currentJob;
            return (
            <div
              key={job.id}
              className="bg-neutral-950 border-l-4 border-red-600 p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 rounded-r-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 mb-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-900 px-2 py-1 rounded-sm">
                    {job.start_time || '—'}
                  </span>
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                    ● {job.status}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight truncate">
                  {job.customer_name}
                </h3>
                <p className="text-xs text-neutral-500 uppercase mt-0.5 truncate">
                  {job.city ?? 'Dayton'}, OH
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/tech/job/${job.id}`)}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 uppercase text-xs tracking-wider rounded-sm active:scale-[0.98]"
              >
                Open job
              </button>
            </div>
          );
          })()
        )}
      </div>

      {/* Today's summary */}
      {(closedToday.length > 0 || earnedToday > 0) && (
        <section className="mt-8 border-t border-neutral-800 pt-6">
          <h2 className="text-lg sm:text-xl font-bold uppercase text-white mb-4 tracking-tight">
            Today&apos;s <span className="text-green-600">summary</span>
          </h2>
          <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider p-3 border-b border-neutral-800">
              Jobs completed today: {closedToday.length} · Earned: ${earnedToday.toFixed(2)}
            </p>
            <ul className="divide-y divide-neutral-800">
              {closedToday.map((j) => (
                <li key={j.id} className="p-3 sm:p-4 flex justify-between items-center gap-2">
                  <span className="font-bold text-white uppercase text-sm truncate">{j.customer_name}</span>
                  <span className="text-green-500 font-bold shrink-0">${Number(j.payment_amount ?? j.price ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
