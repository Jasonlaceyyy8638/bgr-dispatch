'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = ['booked', 'en_route', 'on_site', 'Authorized', 'Closed'];

export default function DispatchPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [reassignJob, setReassignJob] = useState<any>(null);
  const [reassignTechId, setReassignTechId] = useState('');
  const [notesJob, setNotesJob] = useState<any>(null);
  const [notesText, setNotesText] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user.role === 'tech') {
        router.replace('/');
        return;
      }
    } catch {
      router.replace('/');
      return;
    }
  }, [router]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('jobs')
        .select('*, tech_users(name)')
        .order('created_at', { ascending: false });
      if (data) setJobs(data);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadTechs() {
      const { data } = await supabase.from('tech_users').select('id, name').order('name');
      if (data) setTechs(data);
    }
    loadTechs();
  }, []);

  async function updateJob(id: string, payload: { status?: string; assigned_tech_id?: string | null; dispatcher_notes?: string | null }) {
    setUpdating(true);
    try {
      const res = await fetch('/api/jobs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Update failed');
        return;
      }
      setJobs((prev) =>
        prev.map((j) => {
          if (String(j.id) !== id) return j;
          if (payload.assigned_tech_id !== undefined) {
            const t = techs.find((x) => x.id === payload.assigned_tech_id);
            return { ...j, assigned_tech_id: payload.assigned_tech_id || null, tech_users: t ? { name: t.name } : null };
          }
          if (payload.status !== undefined) return { ...j, status: payload.status };
          if (payload.dispatcher_notes !== undefined) return { ...j, dispatcher_notes: payload.dispatcher_notes };
          return j;
        })
      );
      setReassignJob(null);
      setNotesJob(null);
      if (payload.assigned_tech_id && payload.assigned_tech_id !== (jobs.find((j) => String(j.id) === id) as any)?.assigned_tech_id) {
        fetch('/api/notify-tech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: id }) }).catch(() => {});
      }
    } finally {
      setUpdating(false);
    }
  }

  function openNotes(job: any) {
    setNotesJob(job);
    setNotesText(job.dispatcher_notes ?? '');
  }

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm min-h-[44px]';

  return (
    <div className="max-w-5xl mx-auto pb-24 sm:pb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
            Dispatch <span className="text-red-600">Center</span>
          </h1>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
            Active queue
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dispatch/schedule"
            className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 uppercase text-xs tracking-wider rounded-sm text-center active:scale-[0.98] touch-manipulation"
          >
            Schedule
          </Link>
          <Link
            href="/dispatch/create"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 uppercase text-sm tracking-wider rounded-sm text-center active:scale-[0.98] touch-manipulation"
          >
            + New job
          </Link>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        <div className="hidden sm:grid sm:grid-cols-6 gap-4 p-3 sm:p-4 bg-neutral-900 text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
          <div>Customer</div>
          <div>Address</div>
          <div>Tech</div>
          <div>Status</div>
          <div className="text-right col-span-2">Actions</div>
        </div>

        <div className="divide-y divide-neutral-800">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 sm:p-5 hover:bg-neutral-900/50 transition-colors"
            >
              {/* Mobile card */}
              <div className="sm:hidden space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-white uppercase text-sm leading-tight">
                    {job.customer_name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-1 bg-neutral-800 text-neutral-400 uppercase rounded-sm shrink-0">
                    {job.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 uppercase truncate">{job.address ?? job.street_address}</p>
                <p className="text-xs font-bold text-red-600">
                  {job.tech_users?.name ?? 'Unassigned'}
                </p>
                <select
                  value={job.status}
                  onChange={(e) => updateJob(job.id, { status: e.target.value })}
                  disabled={updating}
                  className="w-full bg-black border border-neutral-700 text-white text-xs font-bold uppercase py-2 px-3 rounded-sm min-h-[44px] touch-manipulation"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setReassignJob(job); setReassignTechId(job.assigned_tech_id || ''); }}
                    className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white touch-manipulation min-h-[44px] px-3"
                  >
                    Reassign
                  </button>
                  <button
                    type="button"
                    onClick={() => openNotes(job)}
                    className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white touch-manipulation min-h-[44px] px-3"
                  >
                    {job.dispatcher_notes ? 'Notes ✓' : 'Notes'}
                  </button>
                  <Link
                    href={`/tech/job/${job.id}`}
                    className="text-[10px] font-bold uppercase text-neutral-400 hover:text-white touch-manipulation min-h-[44px] inline-flex items-center"
                  >
                    Details →
                  </Link>
                </div>
              </div>

              {/* Desktop row */}
              <div className="hidden sm:grid sm:grid-cols-6 gap-4 items-center">
                <div className="font-bold text-white uppercase text-sm">{job.customer_name}</div>
                <div className="text-xs text-neutral-400 uppercase truncate">{job.address ?? job.street_address}</div>
                <div className="text-xs font-bold text-red-600">{job.tech_users?.name ?? 'Unassigned'}</div>
                <div>
                  <select
                    value={job.status}
                    onChange={(e) => updateJob(job.id, { status: e.target.value })}
                    disabled={updating}
                    className="bg-black border border-neutral-700 text-white text-[10px] font-bold uppercase py-1.5 px-2 rounded-sm w-full max-w-[120px]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="text-right col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setReassignJob(job); setReassignTechId(job.assigned_tech_id || ''); }}
                    className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white"
                  >
                    Reassign
                  </button>
                  <button
                    type="button"
                    onClick={() => openNotes(job)}
                    className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white"
                  >
                    {job.dispatcher_notes ? 'Notes ✓' : 'Notes'}
                  </button>
                  <Link href={`/tech/job/${job.id}`} className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reassign modal */}
      {reassignJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => !updating && setReassignJob(null)}>
          <div className="bg-neutral-950 border border-neutral-800 rounded-sm w-full max-w-sm p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold uppercase text-white mb-2">Reassign job</h3>
            <p className="text-neutral-400 text-sm mb-4">{reassignJob.customer_name}</p>
            <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Assign to tech</label>
            <select
              value={reassignTechId}
              onChange={(e) => setReassignTechId(e.target.value)}
              className={`${inputClass} mb-4`}
            >
              <option value="">— Select tech —</option>
              {techs.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReassignJob(null)}
                className="flex-1 py-3 font-bold uppercase text-sm border border-neutral-600 text-neutral-400 rounded-sm hover:bg-neutral-800 touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => reassignTechId && updateJob(reassignJob.id, { assigned_tech_id: reassignTechId })}
                disabled={updating || !reassignTechId}
                className="flex-1 py-3 font-bold uppercase text-sm bg-red-600 text-white rounded-sm hover:bg-red-500 disabled:opacity-50 touch-manipulation"
              >
                {updating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes modal */}
      {notesJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => !updating && setNotesJob(null)}>
          <div className="bg-neutral-950 border border-neutral-800 rounded-sm w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold uppercase text-white mb-2">Dispatcher notes</h3>
            <p className="text-neutral-400 text-sm mb-2">Visible to tech on job screen. e.g. gate code, dog.</p>
            <p className="text-neutral-500 text-xs mb-2">{notesJob.customer_name}</p>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Gate code 1234, dog in yard…"
              className="w-full bg-black border border-neutral-800 p-3 text-white text-sm rounded-sm min-h-[100px] resize-y mb-4"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNotesJob(null)}
                className="flex-1 py-3 font-bold uppercase text-sm border border-neutral-600 text-neutral-400 rounded-sm hover:bg-neutral-800 touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateJob(notesJob.id, { dispatcher_notes: notesText || null })}
                disabled={updating}
                className="flex-1 py-3 font-bold uppercase text-sm bg-red-600 text-white rounded-sm hover:bg-red-500 disabled:opacity-50 touch-manipulation"
              >
                {updating ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
