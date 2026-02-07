'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useParams } from 'next/navigation';

export default function PublicInvoicePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) load();
    else setLoading(false);
  }, [id]);

  async function load() {
    const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
    if (data) setJob(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <p className="text-neutral-500 font-bold uppercase animate-pulse">Loading…</p>
      </div>
    );
  }
  if (!job) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <p className="text-red-600 font-bold uppercase">Invoice not found</p>
      </div>
    );
  }

  const invNum = 24000 + (Number(job.id) || 0);
  const date = new Date().toLocaleDateString();

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-neutral-800 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <img src="/logo.png" alt="BGR" className="h-8 w-auto mb-2" />
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Buckeye Garage Door Repair</p>
            <p className="text-neutral-500 text-xs mt-2">Dayton, OH</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl sm:text-3xl font-bold text-neutral-400 tracking-wider">INVOICE</p>
            <p className="text-white font-bold text-lg">#{invNum}</p>
            <p className="text-neutral-500 text-sm">{date}</p>
          </div>
        </div>
        <div className="p-6 sm:p-8 border-b border-neutral-800">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Bill to</p>
          <p className="text-lg font-bold uppercase text-white">{job.customer_name}</p>
        </div>
        <div className="p-6 sm:p-8 border-b border-neutral-800">
          <div className="flex justify-between items-baseline text-[10px] font-bold uppercase text-neutral-500 tracking-wider mb-2">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div className="flex justify-between items-start gap-4">
            <pre className="text-sm text-neutral-300 whitespace-pre-wrap flex-1">{job.service_type || 'Service'}</pre>
            <span className="font-bold text-white shrink-0">${Number(job.price || 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="p-6 sm:p-8 bg-neutral-900/50">
          <div className="flex justify-end">
            <div className="text-right">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Total due</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-500">${Number(job.price || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
