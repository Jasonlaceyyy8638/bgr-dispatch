'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useRouter } from 'next/navigation';

type TimeEntry = { id: string; clock_in: string; clock_out: string | null; break_start?: string | null; break_end?: string | null; job_id?: number | null };

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [techId, setTechId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [clockLoading, setClockLoading] = useState(false);

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
        setUserRole(user.role ?? 'tech');
        fetchJobs(user.id);
        fetchTimeEntries(user.id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  async function fetchTimeEntries(techIdParam: string) {
    const date = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/time-clock?tech_id=${encodeURIComponent(techIdParam)}&date=${date}`);
    const json = await res.json().catch(() => ({}));
    setTimeEntries(Array.isArray(json.entries) ? json.entries : []);
  }

  async function handleClockIn() {
    if (!techId || clockLoading) return;
    setClockLoading(true);
    const res = await fetch('/api/time-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'in', tech_id: techId }),
    });
    const json = await res.json().catch(() => ({}));
    setClockLoading(false);
    if (res.ok && json.ok) fetchTimeEntries(techId);
    else if (json.error) alert(json.error);
  }

  async function handleClockOut() {
    if (!techId || clockLoading) return;
    setClockLoading(true);
    const res = await fetch('/api/time-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'out', tech_id: techId }),
    });
    const json = await res.json().catch(() => ({}));
    setClockLoading(false);
    if (res.ok && json.ok) fetchTimeEntries(techId);
    else if (json.error) alert(json.error);
  }

  async function handleBreakIn() {
    if (!techId || clockLoading) return;
    setClockLoading(true);
    const res = await fetch('/api/time-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'break_in', tech_id: techId }),
    });
    const json = await res.json().catch(() => ({}));
    setClockLoading(false);
    if (res.ok && json.ok) fetchTimeEntries(techId);
    else if (json.error) alert(json.error);
  }

  async function handleBreakOut() {
    if (!techId || clockLoading) return;
    setClockLoading(true);
    const res = await fetch('/api/time-clock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'break_out', tech_id: techId }),
    });
    const json = await res.json().catch(() => ({}));
    setClockLoading(false);
    if (res.ok && json.ok) fetchTimeEntries(techId);
    else if (json.error) alert(json.error);
  }

  const isClockedIn = timeEntries.some((e) => !e.clock_out);
  const lastEntry = timeEntries.length > 0 ? timeEntries[timeEntries.length - 1] : null;
  const isOnBreak = lastEntry?.break_start && !lastEntry?.break_end;
  const totalMinutesToday = timeEntries.reduce((sum, e) => {
    const end = e.clock_out ? new Date(e.clock_out).getTime() : Date.now();
    let mins = (end - new Date(e.clock_in).getTime()) / 60000;
    if (e.break_start && e.break_end) mins -= (new Date(e.break_end).getTime() - new Date(e.break_start).getTime()) / 60000;
    else if (e.break_start && !e.clock_out) mins -= (Date.now() - new Date(e.break_start).getTime()) / 60000;
    return sum + mins;
  }, 0);
  const hoursToday = Math.floor(totalMinutesToday / 60);
  const minsToday = Math.round(totalMinutesToday % 60);

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

      {/* Time clock — techs, dispatchers, admins */}
      {techId && ['tech', 'dispatcher', 'admin'].includes(userRole || 'tech') && (
        <section className="mb-8 bg-neutral-950 border border-neutral-800 rounded-sm p-4 sm:p-5">
          <h2 className="text-sm font-bold uppercase text-white tracking-wider mb-3">Time clock</h2>
          <div className="flex flex-wrap items-center gap-3">
            {isClockedIn ? (
              <>
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">
                  {isOnBreak ? 'On break' : `Clocked in ${lastEntry ? new Date(lastEntry.clock_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}`}
                </span>
                {isOnBreak ? (
                  <button
                    type="button"
                    onClick={handleBreakOut}
                    disabled={clockLoading}
                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 uppercase text-xs rounded-sm"
                  >
                    {clockLoading ? '…' : 'End break'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleBreakIn}
                      disabled={clockLoading}
                      className="bg-neutral-600 hover:bg-neutral-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 uppercase text-xs rounded-sm"
                    >
                      {clockLoading ? '…' : 'Break'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClockOut}
                      disabled={clockLoading}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 uppercase text-xs rounded-sm"
                    >
                      {clockLoading ? '…' : 'Clock out'}
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={clockLoading}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 uppercase text-xs rounded-sm"
              >
                {clockLoading ? '…' : 'Clock in'}
              </button>
            )}
            {(timeEntries.length > 0 || totalMinutesToday > 0) && (
              <span className="text-[10px] text-neutral-500 uppercase">
                Worked today: {hoursToday}h {minsToday}m
              </span>
            )}
          </div>
        </section>
      )}

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
