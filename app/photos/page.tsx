'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

export default function PhotosPage() {
  const [photos, setPhotos] = useState<{ id: string; job_id: string; photo_url: string; address: string | null; customer_name: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('job_photos')
      .select('id, job_id, photo_url, address, customer_name, created_at')
      .order('created_at', { ascending: false });
    setPhotos(data ?? []);
    setLoading(false);
  }

  const filtered = search.trim()
    ? photos.filter(
        (p) =>
          (p.customer_name?.toLowerCase().includes(search.toLowerCase().trim()) ?? false)
      )
    : photos;

  return (
    <div className="max-w-4xl mx-auto pb-24 sm:pb-8">
      <h1 className="text-xl sm:text-2xl font-bold uppercase text-white tracking-tight mb-2">
        Photos
      </h1>
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-4">
        Job photos with address — search by customer name
      </p>

      <div className="mb-6">
        <label htmlFor="photo-search" className="sr-only">
          Search by customer name
        </label>
        <input
          id="photo-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name…"
          className="w-full bg-black border border-neutral-800 p-3 sm:p-4 rounded-sm text-white placeholder:text-neutral-500 min-h-[44px] touch-manipulation"
        />
      </div>

      {loading ? (
        <p className="text-white font-bold uppercase animate-pulse">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-neutral-950 border border-neutral-800 p-6 sm:p-8 rounded-sm text-center">
          <p className="text-neutral-500 font-semibold uppercase tracking-wider">
            {search.trim() ? 'No photos match that customer name.' : 'No job photos yet.'}
          </p>
          <p className="text-[10px] text-neutral-600 mt-2">
            Add a photo on a job (Take pic or Choose file) to see it here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden"
            >
              <Link href={p.photo_url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={p.photo_url}
                  alt={p.customer_name ?? 'Job photo'}
                  className="w-full aspect-video object-cover border-b border-neutral-800"
                />
              </Link>
              <div className="p-3 sm:p-4">
                <p className="text-white font-bold uppercase text-sm tracking-wider mb-1">
                  {p.customer_name ?? '—'}
                </p>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">
                  Work performed at
                </p>
                <p className="text-neutral-300 text-sm break-words">{p.address ?? '—'}</p>
                <Link
                  href={`/tech/job/${p.job_id}`}
                  className="inline-block mt-2 text-[10px] font-bold uppercase text-red-600 hover:text-red-500 tracking-wider"
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
