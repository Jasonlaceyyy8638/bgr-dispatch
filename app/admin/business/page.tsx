'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminBusinessPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    company_name: '',
    company_phone: '',
    default_tax_rate: '',
    card_fee_percent: '',
    review_link: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user.role !== 'admin') {
        router.replace('/');
        return;
      }
    } catch {
      router.replace('/');
      return;
    }
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          company_name: data.company_name ?? '',
          company_phone: data.company_phone ?? '',
          default_tax_rate: data.default_tax_rate ?? '',
          card_fee_percent: data.card_fee_percent ?? '',
          review_link: data.review_link ?? '',
        });
      })
      .catch(() => setError('Could not load settings'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Save failed');
        setSaving(false);
        return;
      }
      setMessage('Saved.');
    } catch {
      setError('Something went wrong');
    }
    setSaving(false);
  }

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 sm:p-4 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm min-h-[48px]';

  return (
    <div className="max-w-md mx-auto pb-24 sm:pb-8">
      <div className="mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase text-white tracking-tight">
          Business <span className="text-red-600">settings</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          Company name, phone, tax, card fee, review link
        </p>
      </div>

      {loading ? (
        <p className="text-neutral-500 font-bold uppercase animate-pulse">Loading…</p>
      ) : (
        <div className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 rounded-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Company name</label>
              <input
                type="text"
                className={inputClass}
                value={settings.company_name}
                onChange={(e) => setSettings((s) => ({ ...s, company_name: e.target.value }))}
                placeholder="BGR"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Company phone</label>
              <input
                type="tel"
                className={inputClass}
                value={settings.company_phone}
                onChange={(e) => setSettings((s) => ({ ...s, company_phone: e.target.value }))}
                placeholder="(937) 555-1234"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Default tax rate (%)</label>
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={settings.default_tax_rate}
                onChange={(e) => setSettings((s) => ({ ...s, default_tax_rate: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Card fee (%)</label>
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={settings.card_fee_percent}
                onChange={(e) => setSettings((s) => ({ ...s, card_fee_percent: e.target.value }))}
                placeholder="2.9"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Google review link</label>
              <input
                type="url"
                className={inputClass}
                value={settings.review_link}
                onChange={(e) => setSettings((s) => ({ ...s, review_link: e.target.value }))}
                placeholder="https://g.page/..."
              />
            </div>
            {error && <p className="text-red-600 text-xs font-bold uppercase">{error}</p>}
            {message && <p className="text-green-500 text-xs font-bold uppercase">{message}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-red-600 hover:bg-red-500 py-3 font-bold uppercase text-sm text-white rounded-sm disabled:opacity-50 min-h-[48px] touch-manipulation"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        </div>
      )}

      <Link href="/admin/techs" className="inline-block mt-4 text-[10px] font-bold uppercase text-neutral-500 hover:text-white touch-manipulation">
        ← User Mgmt
      </Link>
    </div>
  );
}
