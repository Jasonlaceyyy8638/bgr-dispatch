'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function DispatchPage() {
  const [jobs, setJobs] = useState<any[]>([]);

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

  return (
    <div className="max-w-5xl mx-auto pb-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
            Dispatch <span className="text-red-600">Center</span>
          </h1>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
            Active queue
          </p>
        </div>
        <Link
          href="/dispatch/create"
          className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 uppercase text-sm tracking-wider rounded-sm text-center active:scale-[0.98]"
        >
          + New job
        </Link>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        {/* Desktop header */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-4 p-3 sm:p-4 bg-neutral-900 text-[10px] font-bold uppercase text-neutral-500 tracking-wider">
          <div>Customer</div>
          <div>Address</div>
          <div>Tech</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
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
                <Link
                  href={`/tech/job/${job.id}`}
                  className="inline-block text-[10px] font-bold uppercase text-neutral-400 hover:text-white"
                >
                  Details →
                </Link>
              </div>

              {/* Desktop row */}
              <div className="hidden sm:grid sm:grid-cols-5 gap-4 items-center">
                <div className="font-bold text-white uppercase text-sm">{job.customer_name}</div>
                <div className="text-xs text-neutral-400 uppercase truncate">{job.address ?? job.street_address}</div>
                <div className="text-xs font-bold text-red-600">{job.tech_users?.name ?? 'Unassigned'}</div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-1 bg-neutral-800 text-neutral-400 uppercase rounded-sm">
                    {job.status}
                  </span>
                </div>
                <div className="text-right">
                  <Link href={`/tech/job/${job.id}`} className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
