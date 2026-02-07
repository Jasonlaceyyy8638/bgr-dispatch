'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('tech_user');
    if (!raw) {
      setLoading(false);
      return;
    }
    try {
      const user = JSON.parse(raw);
      if (user?.id) fetchJobs(user.id);
      else setLoading(false);
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
  const closedToday = jobs.filter((j) => j.status === 'Closed' && isToday(j.created_at));
  const earnedToday = closedToday.reduce((sum, j) => sum + Number(j.payment_amount ?? j.price ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto pb-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Active</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600">{activeJobs.length}</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Done</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{closedToday.length}</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Earned</p>
          <p className="text-xl sm:text-2xl font-bold text-white">${earnedToday.toFixed(2)}</p>
        </div>
      </div>

      <h2 className="text-lg sm:text-xl font-bold uppercase text-white mb-4 tracking-tight">
        My <span className="text-red-600">Schedule</span>
      </h2>

      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="p-8 sm:p-12 text-center bg-neutral-950 border border-neutral-800 border-dashed rounded-sm">
            <p className="text-neutral-500 font-semibold uppercase text-sm">Loading…</p>
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-neutral-950 border border-neutral-800 border-dashed rounded-sm">
            <p className="text-neutral-500 font-semibold uppercase text-sm">No active jobs</p>
          </div>
        ) : (
          activeJobs.map((job) => (
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
          ))
        )}
      </div>
    </div>
  );
}
