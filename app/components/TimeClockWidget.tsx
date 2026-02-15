'use client';

import { useState, useEffect } from 'react';

type TimeEntry = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_start?: string | null;
  break_end?: string | null;
};

export default function TimeClockWidget() {
  const [techId, setTechId] = useState<string | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user?.id) setTechId(user.id);
    } catch {}
  }, []);

  useEffect(() => {
    if (!techId) return;
    const date = new Date().toISOString().slice(0, 10);
    fetch(`/api/time-clock?tech_id=${encodeURIComponent(techId)}&date=${date}`)
      .then((r) => r.json())
      .then((json) => setTimeEntries(Array.isArray(json.entries) ? json.entries : []))
      .catch(() => setTimeEntries([]));
  }, [techId]);

  async function fetchEntries() {
    if (!techId) return;
    const date = new Date().toISOString().slice(0, 10);
    const res = await fetch(`/api/time-clock?tech_id=${encodeURIComponent(techId)}&date=${date}`);
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
    if (res.ok && json.ok) fetchEntries();
    else if (json?.error) alert(json.error);
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
    if (res.ok && json.ok) fetchEntries();
    else if (json?.error) alert(json.error);
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
    if (res.ok && json.ok) fetchEntries();
    else if (json?.error) alert(json.error);
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
    if (res.ok && json.ok) fetchEntries();
    else if (json?.error) alert(json.error);
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

  if (!techId) return null;

  return (
    <div className="p-3 border-b border-neutral-800 space-y-2">
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Time clock</p>
      <div className="flex flex-wrap items-center gap-2">
        {isClockedIn ? (
          isOnBreak ? (
            <button
              type="button"
              onClick={handleBreakOut}
              disabled={clockLoading}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2 px-3 uppercase text-[10px] rounded-sm w-full"
            >
              {clockLoading ? '…' : 'End break'}
            </button>
          ) : (
            <>
              <span className="text-[10px] text-green-500 font-semibold uppercase">
                In {lastEntry ? new Date(lastEntry.clock_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
              </span>
              <div className="flex gap-1.5 w-full">
                <button
                  type="button"
                  onClick={handleBreakIn}
                  disabled={clockLoading}
                  className="flex-1 bg-neutral-600 hover:bg-neutral-500 disabled:opacity-50 text-white font-bold py-2 px-2 uppercase text-[10px] rounded-sm"
                >
                  {clockLoading ? '…' : 'Break'}
                </button>
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={clockLoading}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2 px-2 uppercase text-[10px] rounded-sm"
                >
                  {clockLoading ? '…' : 'Out'}
                </button>
              </div>
            </>
          )
        ) : (
          <button
            type="button"
            onClick={handleClockIn}
            disabled={clockLoading}
            className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2 px-4 uppercase text-[10px] rounded-sm w-full"
          >
            {clockLoading ? '…' : 'Clock in'}
          </button>
        )}
        {(timeEntries.length > 0 || totalMinutesToday > 0) && (
          <p className="text-[10px] text-neutral-500 uppercase w-full">
            Today: {hoursToday}h {minsToday}m
          </p>
        )}
      </div>
    </div>
  );
}
