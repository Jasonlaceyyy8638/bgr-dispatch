'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PhotosPage() {
  const [photos, setPhotos] = useState<{ id: string; job_id: string; photo_url: string; address: string | null; customer_name: string | null; invoice_number: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch('/api/photos');
    const json = await res.json().catch(() => ({}));
    setPhotos(Array.isArray(json.photos) ? json.photos : []);
    setLoading(false);
  }

  const searchLower = search.trim().toLowerCase();
  const filtered = searchLower
    ? photos.filter(
        (p) =>
          (p.customer_name?.toLowerCase().includes(searchLower) ?? false) ||
          (p.invoice_number?.toLowerCase().includes(searchLower) ?? false)
      )
    : photos;

  return (
    <div className="max-w-4xl mx-auto pb-24 sm:pb-8">
      <h1 className="text-xl sm:text-2xl font-bold uppercase text-white tracking-tight mb-2">
        Photos
      </h1>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-4">
        Closed jobs only — search by customer name (e.g. when a customer calls)
      </p>

      <div className="mb-6">
        <label htmlFor="photo-search" className="sr-only">
          Search by customer name or invoice number
        </label>
        <input
          id="photo-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or invoice number…"
          className="w-full bg-black border border-neutral-800 p-3 sm:p-4 rounded-sm text-white placeholder:text-neutral-500 min-h-[44px] touch-manipulation"
        />
      </div>

      {loading ? (
        <p className="text-white font-bold uppercase animate-pulse">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 p-6 sm:p-8 rounded-sm text-center space-y-4">
          <p className="text-neutral-500 font-semibold uppercase tracking-wider">
            {search.trim() ? 'No photos match that customer name.' : 'No closed job photos yet.'}
          </p>
          <p className="text-[10px] text-neutral-600">
            Add a photo on a job, then close the job. Photos appear here after the job is closed.
          </p>
          <div className="text-left max-w-md mx-auto mt-6 p-4 bg-neutral-900 rounded-sm border border-neutral-800">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Photos not saving?</p>
            <p className="text-[10px] text-neutral-500">Run the job_photos SQL + RLS policies in <code className="text-neutral-400">SCHEMA_ADDITIONS.md</code>, or add <code className="text-neutral-400">SUPABASE_SERVICE_ROLE_KEY</code> to .env.local and restart the dev server.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="bg-neutral-950 border border-neutral-800 rounded-sm p-4 flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold uppercase text-sm tracking-wider">
                  {p.customer_name ?? '—'}
                </p>
                {p.invoice_number && (
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-0.5">
                    Invoice {p.invoice_number}
                  </p>
                )}
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">Work performed at</p>
                <p className="text-neutral-300 text-sm break-words">{p.address ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={p.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold uppercase tracking-wider text-red-600 hover:text-red-500"
                >
                  View photo →
                </Link>
                <span className="text-neutral-600">·</span>
                <Link
                  href={`/tech/job/${p.job_id}`}
                  className="text-sm font-bold uppercase tracking-wider text-neutral-400 hover:text-white"
                >
                  View job →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
