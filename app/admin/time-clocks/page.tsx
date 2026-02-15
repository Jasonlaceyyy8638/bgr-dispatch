'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TimeEntryRow = {
  id: string;
  tech_id: string;
  tech_name: string;
  clock_in: string;
  clock_out: string | null;
  break_start?: string | null;
  break_end?: string | null;
  job_id?: number | null;
  job_label?: string | null;
  edited_at?: string | null;
  edit_note?: string | null;
};

export default function AdminTimeClocksPage() {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [exportFrom, setExportFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [remindResult, setRemindResult] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<TimeEntryRow | null>(null);
  const [editForm, setEditForm] = useState({ clock_in: '', clock_out: '', edit_note: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user.role !== 'admin' && user.role !== 'dispatcher') {
        router.replace('/');
        return;
      }
      setAllowed(true);
      setUserRole(user.role || '');
    } catch {
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    if (!allowed) return;
    setLoading(true);
    fetch(`/api/time-clock?all=1&date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((json) => {
        setEntries(Array.isArray(json.entries) ? json.entries : []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [allowed, date]);

  const byTech = entries.reduce((acc, e) => {
    const id = e.tech_id;
    if (!acc[id]) acc[id] = { name: e.tech_name, rows: [] };
    acc[id].rows.push(e);
    return acc;
  }, {} as Record<string, { name: string; rows: TimeEntryRow[] }>);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  function formatDateTimeLocal(iso: string) {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${day}T${h}:${min}`;
  }

  function workedMinutes(r: TimeEntryRow) {
    const end = r.clock_out ? new Date(r.clock_out).getTime() : Date.now();
    let mins = (end - new Date(r.clock_in).getTime()) / 60000;
    if (r.break_start && r.break_end) {
      mins -= (new Date(r.break_end).getTime() - new Date(r.break_start).getTime()) / 60000;
    } else if (r.break_start && !r.clock_out) {
      mins -= (Date.now() - new Date(r.break_start).getTime()) / 60000;
    }
    return mins;
  }

  function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  }

  function openEdit(r: TimeEntryRow) {
    setEditEntry(r);
    setEditForm({
      clock_in: formatDateTimeLocal(r.clock_in),
      clock_out: r.clock_out ? formatDateTimeLocal(r.clock_out) : '',
      edit_note: r.edit_note || '',
    });
  }

  async function saveEdit() {
    if (!editEntry) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/time-clock/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clock_in: editForm.clock_in ? new Date(editForm.clock_in).toISOString() : undefined,
          clock_out: editForm.clock_out === '' ? null : editForm.clock_out ? new Date(editForm.clock_out).toISOString() : undefined,
          edit_note: editForm.edit_note || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setEditEntry(null);
        setEntries((prev) =>
          prev.map((e) => (e.id === editEntry.id ? { ...e, clock_in: json.entry?.clock_in ?? e.clock_in, clock_out: json.entry?.clock_out ?? e.clock_out, edited_at: json.entry?.edited_at, edit_note: json.entry?.edit_note ?? e.edit_note } : e))
        );
        if (date) {
          const r = await fetch(`/api/time-clock?all=1&date=${encodeURIComponent(date)}`);
          const j = await r.json().catch(() => ({}));
          if (Array.isArray(j.entries)) setEntries(j.entries);
        }
      } else {
        alert(json?.error || 'Update failed');
      }
    } finally {
      setSavingEdit(false);
    }
  }

  function handleExport() {
    setExporting(true);
    const url = `/api/time-clock/export?from=${encodeURIComponent(exportFrom)}&to=${encodeURIComponent(exportTo)}`;
    window.open(url, '_blank');
    setExporting(false);
  }

  async function handleRemind() {
    setReminding(true);
    setRemindResult(null);
    try {
      const res = await fetch('/api/time-clock/remind', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const msg = json.message || (json.reminded?.length ? `Reminded ${json.reminded.length} tech(s).` : 'Done.');
        setRemindResult(msg);
      } else {
        setRemindResult(json?.error || 'Failed');
      }
    } catch {
      setRemindResult('Request failed');
    } finally {
      setReminding(false);
    }
  }

  if (allowed === null) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-neutral-500 font-bold uppercase">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-6">
      <div className="mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
          Time <span className="text-red-600">clocks</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          View punches, export pay period, send “still clocked in” reminders, edit punches (admin).
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-black border border-neutral-800 px-3 py-2 text-white text-sm rounded-sm"
            />
          </label>
          <Link href="/admin/techs" className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
            User Mgmt
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-neutral-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Export</span>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="bg-black border border-neutral-800 px-2 py-1.5 text-white text-sm rounded-sm"
            />
            <span className="text-neutral-600">to</span>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="bg-black border border-neutral-800 px-2 py-1.5 text-white text-sm rounded-sm"
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white font-bold py-2 px-3 uppercase text-xs rounded-sm"
            >
              {exporting ? '…' : 'Download CSV'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRemind}
              disabled={reminding}
              className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2 px-3 uppercase text-xs rounded-sm"
            >
              {reminding ? '…' : 'Send reminders'}
            </button>
            {remindResult && (
              <span className="text-[10px] text-neutral-400 max-w-xs">{remindResult}</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-500 font-bold uppercase text-sm">Loading…</div>
        ) : Object.keys(byTech).length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-sm">
            No time entries for this date.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {Object.entries(byTech).map(([techId, { name, rows }]) => {
              const totalMins = rows.reduce((s, r) => s + workedMinutes(r), 0);
              const hasOpen = rows.some((r) => !r.clock_out);
              return (
                <div key={techId} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h2 className="font-bold uppercase text-white">{name}</h2>
                    <span className="text-[10px] font-bold text-green-500 uppercase">
                      Worked: {formatDuration(totalMins)}
                      {hasOpen && ' (clocked in)'}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {rows.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm flex-col sm:flex-row sm:items-center">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-neutral-500 font-mono text-xs">{formatTime(r.clock_in)}</span>
                          <span className="text-neutral-600">→</span>
                          <span className="text-neutral-500 font-mono text-xs">
                            {r.clock_out ? formatTime(r.clock_out) : '—'}
                          </span>
                          <span className="text-neutral-600 text-xs">
                            worked {formatDuration(workedMinutes(r))}
                            {(r.break_start || r.break_end) && (
                              <span className="text-amber-500/80 ml-1">
                                (break {r.break_start && r.break_end ? formatDuration((new Date(r.break_end).getTime() - new Date(r.break_start).getTime()) / 60000) : '—'})
                              </span>
                            )}
                          </span>
                          {r.job_label && (
                            <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                              {r.job_label}
                            </span>
                          )}
                          {r.edited_at && (
                            <span className="text-[10px] text-amber-500/80" title={r.edit_note || undefined}>
                              edited
                            </span>
                          )}
                        </div>
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white"
                          >
                            Edit
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editEntry && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => !savingEdit && setEditEntry(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-sm p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold uppercase text-white mb-4">Edit punch</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Clock in</span>
                <input
                  type="datetime-local"
                  value={editForm.clock_in}
                  onChange={(e) => setEditForm((f) => ({ ...f, clock_in: e.target.value }))}
                  className="w-full bg-black border border-neutral-700 px-3 py-2 text-white text-sm rounded-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Clock out (leave empty if still open)</span>
                <input
                  type="datetime-local"
                  value={editForm.clock_out}
                  onChange={(e) => setEditForm((f) => ({ ...f, clock_out: e.target.value }))}
                  className="w-full bg-black border border-neutral-700 px-3 py-2 text-white text-sm rounded-sm mt-1"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Note (optional)</span>
                <input
                  type="text"
                  value={editForm.edit_note}
                  onChange={(e) => setEditForm((f) => ({ ...f, edit_note: e.target.value }))}
                  placeholder="e.g. Corrected typo"
                  className="w-full bg-black border border-neutral-700 px-3 py-2 text-white text-sm rounded-sm mt-1"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2 px-4 uppercase text-xs rounded-sm"
              >
                {savingEdit ? '…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => !savingEdit && setEditEntry(null)}
                className="bg-neutral-700 hover:bg-neutral-600 text-white font-bold py-2 px-4 uppercase text-xs rounded-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
