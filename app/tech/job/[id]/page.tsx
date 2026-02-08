'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';

export default function TechJobPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [techNotes, setTechNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function load() {
    const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
    if (data) {
      setJob(data);
      setTechNotes(data.tech_notes ?? '');
    }
    setLoading(false);
  }

  async function saveTechNotes() {
    if (!id) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('jobs').update({ tech_notes: techNotes || null }).eq('id', id);
      if (!error) setJob((j: any) => (j ? { ...j, tech_notes: techNotes || null } : j));
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 pb-24 sm:pb-8">
        <p className="text-white font-bold uppercase animate-pulse">Loading…</p>
      </div>
    );
  }
  if (!job) {
    return (
      <div className="max-w-2xl mx-auto p-6 pb-24 sm:pb-8">
        <p className="text-red-600 font-bold uppercase">Job not found</p>
      </div>
    );
  }

  const street = job.street_address || job.address || '';
  const city = job.city || '';
  const state = job.state || 'OH';
  const zip = job.zip_code || '';
  const fullAddress = [street, city, state, zip].filter(Boolean).join(', ');
  const mapUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : '#';
  const notes = job.job_description || job.service_type || 'No notes.';

  return (
    <div className="max-w-2xl mx-auto pb-36 sm:pb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6 border-b border-neutral-800 pb-4">
        <div>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
            #{String(job.id).slice(0, 8)}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold uppercase text-white tracking-tight leading-tight">
            {job.customer_name}
          </h1>
        </div>
        <span className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider border border-red-600 text-red-600 rounded-sm shrink-0 self-start sm:self-auto">
          {job.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 flex flex-col items-center justify-center gap-2 rounded-sm active:bg-neutral-800 min-h-[80px] sm:min-h-[100px]"
        >
          <span className="text-2xl">📍</span>
          <span className="text-white font-bold uppercase text-xs tracking-wider">Navigate</span>
        </a>
        <a
          href={`tel:${job.phone_number || ''}`}
          className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 flex flex-col items-center justify-center gap-2 rounded-sm active:bg-neutral-800 min-h-[80px] sm:min-h-[100px]"
        >
          <span className="text-2xl">📞</span>
          <span className="text-white font-bold uppercase text-xs tracking-wider">Call</span>
        </a>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {job.status === 'Closed' ? (
          <button
            type="button"
            onClick={() => router.push(`/tech/invoice/${id}?view=1`)}
            className="w-full bg-neutral-800 hover:bg-neutral-700 py-4 sm:py-5 font-bold uppercase text-sm tracking-wider text-white border border-neutral-700 rounded-sm flex justify-between items-center px-4 sm:px-6 active:scale-[0.98]"
          >
            <span>View invoice</span>
            <span>→</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => router.push(`/tech/invoice/${id}`)}
              className="w-full bg-neutral-800 hover:bg-neutral-700 py-4 sm:py-5 font-bold uppercase text-sm tracking-wider text-white border border-neutral-700 rounded-sm flex justify-between items-center px-4 sm:px-6 active:scale-[0.98]"
            >
              <span>Build invoice / signature</span>
              <span>→</span>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/tech/payment/${id}`)}
              className="w-full bg-green-700 hover:bg-green-600 py-4 sm:py-5 font-bold uppercase text-sm tracking-wider text-white border border-green-600 rounded-sm flex justify-between items-center px-4 sm:px-6 active:scale-[0.98]"
            >
              <span>Take payment</span>
              <span>$</span>
            </button>
          </>
        )}
      </div>

      <div className="mt-6 sm:mt-8 bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Job notes</p>
        <div className="bg-black border border-neutral-800 p-3 sm:p-4 rounded-sm">
          <pre className="text-white font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {notes}
          </pre>
        </div>
      </div>

      <section className="mt-6 sm:mt-8 bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm pb-8 mb-8" aria-label="Tech notes">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Tech notes</p>
        <p className="text-[10px] text-neutral-500 mb-2">Add notes while at the job. They’re saved to this job only.</p>
        <textarea
          value={techNotes}
          onChange={(e) => setTechNotes(e.target.value)}
          onBlur={saveTechNotes}
          placeholder="e.g. parts used, follow-up needed…"
          className="w-full bg-black border border-neutral-800 p-3 sm:p-4 rounded-sm text-white font-mono text-xs placeholder:text-neutral-600 min-h-[80px] resize-y"
          rows={3}
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => saveTechNotes()}
            disabled={savingNotes}
            className="min-h-[48px] px-8 py-3 text-sm font-bold uppercase tracking-wider border-2 border-red-600 text-red-600 rounded-sm hover:bg-red-600/10 active:bg-red-600/20 disabled:opacity-50 touch-manipulation select-none"
          >
            {savingNotes ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      </section>
    </div>
  );
}
