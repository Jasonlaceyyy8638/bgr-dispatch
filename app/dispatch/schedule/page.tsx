'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DispatchSchedulePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(() => new Date().toISOString().slice(0, 10));

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
      const { data: techData } = await supabase.from('tech_users').select('id, name').order('name');
      if (techData) setTechs(techData);
    }
    load();
  }, []);

  useEffect(() => {
    async function load() {
      const start = new Date(viewDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(viewDate);
      end.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from('jobs')
        .select('*, tech_users(name)')
        .gte('scheduled_date', start.toISOString().slice(0, 10))
        .lte('scheduled_date', end.toISOString().slice(0, 10))
        .order('start_time', { ascending: true });
      if (data) setJobs(data);
    }
    load();
  }, [viewDate]);

  const byTech = techs.reduce((acc, t) => {
    acc[t.id] = { name: t.name, jobs: jobs.filter((j) => j.assigned_tech_id === t.id) };
    return acc;
  }, {} as Record<string, { name: string; jobs: any[] }>);
  const unassigned = jobs.filter((j) => !j.assigned_tech_id);

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm min-h-[44px]';

  return (
    <div className="max-w-4xl mx-auto pb-24 sm:pb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
            Schedule <span className="text-red-600">view</span>
          </h1>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
            Jobs by date and tech
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-[10px] font-bold text-neutral-500 uppercase shrink-0">Date</label>
          <input
            type="date"
            className={inputClass}
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        {unassigned.length > 0 && (
          <section className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
            <h2 className="text-sm font-bold uppercase text-neutral-400 tracking-wider p-3 sm:p-4 border-b border-neutral-800">
              Unassigned
            </h2>
            <ul className="divide-y divide-neutral-800">
              {unassigned.map((job) => (
                <li key={job.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-500 uppercase">{job.start_time || '—'} – {job.end_time || '—'}</p>
                    <p className="font-bold text-white uppercase text-sm truncate">{job.customer_name}</p>
                    <p className="text-xs text-neutral-500 truncate">{job.street_address || job.address}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-neutral-800 text-neutral-400 uppercase rounded-sm shrink-0 self-start sm:self-auto">
                    {job.status}
                  </span>
                  <Link
                    href={`/tech/job/${job.id}`}
                    className="text-[10px] font-bold uppercase text-red-600 hover:text-red-500 touch-manipulation shrink-0"
                  >
                    Open →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {techs.map((tech) => {
          const block = byTech[tech.id];
          const list = block?.jobs ?? [];
          if (list.length === 0) return null;
          return (
            <section key={tech.id} className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
              <h2 className="text-sm font-bold uppercase text-red-600 tracking-wider p-3 sm:p-4 border-b border-neutral-800">
                {tech.name}
              </h2>
              <ul className="divide-y divide-neutral-800">
                {list.map((job) => (
                  <li key={job.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-neutral-500 uppercase">{job.start_time || '—'} – {job.end_time || '—'}</p>
                      <p className="font-bold text-white uppercase text-sm truncate">{job.customer_name}</p>
                      <p className="text-xs text-neutral-500 truncate">{job.street_address || job.address}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-neutral-800 text-neutral-400 uppercase rounded-sm shrink-0 self-start sm:self-auto">
                      {job.status}
                    </span>
                    <Link
                      href={`/tech/job/${job.id}`}
                      className="text-[10px] font-bold uppercase text-red-600 hover:text-red-500 touch-manipulation shrink-0"
                    >
                      Open →
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {jobs.length === 0 && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-sm p-8 text-center">
            <p className="text-neutral-500 font-bold uppercase text-sm">No jobs on this date</p>
            <p className="text-neutral-600 text-xs mt-1">Change the date or create a new job.</p>
          </div>
        )}
      </div>

      <Link href="/dispatch" className="inline-block mt-6 text-[10px] font-bold uppercase text-neutral-500 hover:text-white touch-manipulation">
        ← Dispatch list
      </Link>
    </div>
  );
}
