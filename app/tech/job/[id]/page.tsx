'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useParams } from 'next/navigation';

export default function TechJobPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [techNotes, setTechNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPasteUrl, setShowPasteUrl] = useState(false);
  const [jobPhotos, setJobPhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const takePicInputRef = useRef<HTMLInputElement>(null);
  const chooseFileInputRef = useRef<HTMLInputElement>(null);

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    if (id) load();
  }, [id]);

  const STORAGE_KEY = 'job-photos';

  function getStoredPhotos(): { id: string; photo_url: string }[] {
    if (typeof window === 'undefined' || !id) return [];
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}-${id}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setStoredPhotos(photos: { id: string; photo_url: string }[]) {
    if (typeof window === 'undefined' || !id) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}-${id}`, JSON.stringify(photos));
    } catch {}
  }

  async function load() {
    const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
    if (data) {
      setJob(data);
      setTechNotes(data.tech_notes ?? '');
      setPhotoUrl(data.job_photo_url ?? '');
    }
    const res = await fetch(`/api/jobs/${id}/photos`);
    const json = await res.json().catch(() => ({}));
    const apiPhotos = Array.isArray(json.photos) ? json.photos : [];
    if (apiPhotos.length > 0) {
      setJobPhotos(apiPhotos);
      setStoredPhotos(apiPhotos);
    } else {
      const stored = getStoredPhotos();
      setJobPhotos(stored.length > 0 ? stored : []);
    }
    setLoading(false);
  }

  async function setStatus(status: string) {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/jobs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Update failed');
        return;
      }
      setJob((j: any) => (j ? { ...j, status } : j));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function savePhotoUrl() {
    if (!id || !photoUrl?.trim()) return;
    setSavingPhoto(true);
    try {
      const res = await fetch('/api/jobs/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, job_photo_url: photoUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Update failed');
        return;
      }
      setPhotoUrl('');
      const resRefresh = await fetch(`/api/jobs/${id}/photos`);
      const jsonRefresh = await resRefresh.json().catch(() => ({}));
      const list = Array.isArray(jsonRefresh.photos) ? jsonRefresh.photos : [];
      setJobPhotos(list);
      setStoredPhotos(list);
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !id) return;
    const toUpload = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (toUpload.length === 0) {
      alert('Please choose image file(s).');
      return;
    }
    setUploadingPhoto(true);
    try {
      const added: { id: string; photo_url: string }[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('jobId', id);
        const res = await fetch('/api/jobs/upload-photo', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data?.error || 'Upload failed.');
          break;
        }
        if (data.photo) {
          added.push(data.photo);
        } else if (data.url) {
          added.push({ id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`, photo_url: data.url });
        }
      }
      if (added.length > 0) {
        setJobPhotos((prev) => {
          const next = [...added, ...prev];
          setStoredPhotos(next);
          return next;
        });
        if (job && added[0]) setJob((j: any) => (j ? { ...j, job_photo_url: added[0].photo_url } : j));
      }
      const resRefresh = await fetch(`/api/jobs/${id}/photos`);
      const jsonRefresh = await resRefresh.json().catch(() => ({}));
      if (Array.isArray(jsonRefresh.photos) && jsonRefresh.photos.length > 0) {
        setJobPhotos(jsonRefresh.photos);
        setStoredPhotos(jsonRefresh.photos);
      }
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
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
          className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 flex flex-col items-center justify-center gap-2 rounded-sm active:bg-neutral-800 min-h-[80px] sm:min-h-[100px] touch-manipulation"
        >
          <span className="text-2xl">📍</span>
          <span className="text-white font-bold uppercase text-xs tracking-wider">Navigate</span>
        </a>
        <a
          href={`tel:${job.phone_number || ''}`}
          className="bg-neutral-900 border border-neutral-800 p-4 sm:p-6 flex flex-col items-center justify-center gap-2 rounded-sm active:bg-neutral-800 min-h-[80px] sm:min-h-[100px] touch-manipulation"
        >
          <span className="text-2xl">📞</span>
          <span className="text-white font-bold uppercase text-xs tracking-wider">Call</span>
        </a>
      </div>

      {/* Status: En route / On site — only when not Closed */}
      {job.status !== 'Closed' && job.status !== 'Authorized' && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(job.status === 'booked' || job.status === 'en_route') && (
            <button
              type="button"
              onClick={() => setStatus('en_route')}
              disabled={updatingStatus || job.status === 'en_route'}
              className="min-h-[48px] px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-amber-600 text-amber-500 rounded-sm hover:bg-amber-600/10 active:bg-amber-600/20 disabled:opacity-50 touch-manipulation"
            >
              En route
            </button>
          )}
          {(job.status === 'booked' || job.status === 'en_route' || job.status === 'on_site') && (
            <button
              type="button"
              onClick={() => setStatus('on_site')}
              disabled={updatingStatus || job.status === 'on_site'}
              className="min-h-[48px] px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-blue-600 text-blue-400 rounded-sm hover:bg-blue-600/10 active:bg-blue-600/20 disabled:opacity-50 touch-manipulation"
            >
              On site
            </button>
          )}
        </div>
      )}

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

      {job.dispatcher_notes && (
        <div className="mt-6 sm:mt-8 bg-amber-950/30 border border-amber-900/50 p-4 sm:p-6 rounded-sm">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Dispatcher notes (for you)</p>
          <div className="bg-black/50 border border-amber-900/30 p-3 sm:p-4 rounded-sm">
            <pre className="text-amber-100 font-mono text-xs whitespace-pre-wrap leading-relaxed">
              {job.dispatcher_notes}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-8 bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm">
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Job notes</p>
        <div className="bg-black border border-neutral-800 p-3 sm:p-4 rounded-sm">
          <pre className="text-white font-mono text-xs whitespace-pre-wrap leading-relaxed">
            {notes}
          </pre>
        </div>
      </div>

      {/* Photos section — address + take/save pics (mobile & desktop) */}
      <section className="mt-6 sm:mt-8 bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm" aria-label="Job photos">
        <h2 className="text-sm font-bold uppercase text-white tracking-wider mb-2">Photos</h2>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Work performed at</p>
        <p className="text-white font-semibold text-sm mb-4 break-words">{fullAddress || 'No address'}</p>
        <p className="text-neutral-400 text-sm mb-4">
          Capture a clear before and after photo of the work for customer records. Keep it professional and well-lit.
        </p>
        {jobPhotos.length > 0 ? (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">View job photo(s)</p>
            <ul className="space-y-1">
              {jobPhotos.map((p, i) => (
                <li key={p.id}>
                  <a
                    href={p.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-600 hover:text-red-500"
                  >
                    Photo {jobPhotos.length > 1 ? `${i + 1} →` : '→'}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => takePicInputRef.current?.click()}
              disabled={!!uploadingPhoto}
              className="min-h-[44px] px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-red-600 text-red-600 rounded-sm hover:bg-red-600/10 disabled:opacity-50 touch-manipulation"
            >
              Take pic
            </button>
            <button
              type="button"
              onClick={() => chooseFileInputRef.current?.click()}
              disabled={!!uploadingPhoto}
              className="min-h-[44px] px-4 py-2 text-sm font-bold uppercase tracking-wider border border-neutral-600 text-neutral-300 rounded-sm hover:bg-neutral-800 disabled:opacity-50 touch-manipulation"
            >
              Choose file
            </button>
          </div>
          <input
            ref={takePicInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoFile}
            className="sr-only"
            aria-hidden={true}
          />
          <input
            ref={chooseFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoFile}
            className="sr-only"
            aria-hidden={true}
          />
          {uploadingPhoto && <p className="text-[10px] font-bold text-neutral-500 uppercase">Uploading…</p>}
          {showPasteUrl ? (
            <div className="flex gap-2 flex-wrap">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Paste photo URL"
                className="flex-1 min-w-0 bg-black border border-neutral-800 p-3 text-white text-sm rounded-sm min-h-[44px] touch-manipulation"
              />
              <button
                type="button"
                onClick={savePhotoUrl}
                disabled={savingPhoto}
                className="min-h-[44px] px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-red-600 text-red-600 rounded-sm hover:bg-red-600/10 disabled:opacity-50 touch-manipulation"
              >
                {savingPhoto ? 'Saving…' : 'Save'}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowPasteUrl((v) => !v)}
            className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white touch-manipulation"
          >
            {showPasteUrl ? 'Hide paste URL' : 'Or paste photo URL'}
          </button>
        </div>
      </section>

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
