'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

function timeSlots() {
  const out: string[] = [];
  ['AM', 'PM'].forEach((period) => {
    for (let h = 0; h < 12; h++) {
      const hour = h === 0 ? 12 : h;
      for (let m = 0; m < 60; m += 15) {
        out.push(`${hour}:${m === 0 ? '00' : m} ${period}`);
      }
    }
  });
  return out;
}

export default function CreateJobPage() {
  const router = useRouter();
  const [techs, setTechs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    phone_number: '',
    street_address: '',
    city: '',
    state: 'OH',
    zip_code: '',
    job_description: '',
    assigned_tech_id: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('tech_users').select('id, name').order('name');
      if (data) setTechs(data);
    }
    load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        customer_name: form.customer_name,
        phone_number: form.phone_number,
        street_address: form.street_address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        job_description: form.job_description,
        assigned_tech_id: form.assigned_tech_id || null,
        scheduled_date: form.scheduled_date,
        start_time: form.start_time,
        end_time: form.end_time,
        status: 'booked',
      })
      .select('id, assigned_tech_id')
      .single();
    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
      return;
    }
    if (data?.id && data?.assigned_tech_id) {
      fetch('/api/notify-tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: data.id }),
      }).catch(() => {});
    }
    alert('Job created.');
    router.push('/dispatch');
  }

  const slots = timeSlots();
  const inputClass = 'w-full bg-black border border-neutral-800 p-3 sm:p-4 text-white font-semibold uppercase text-sm outline-none focus:border-red-600 rounded-sm';

  return (
    <div className="max-w-2xl mx-auto pb-24 sm:pb-8">
      <form onSubmit={onSubmit} className="bg-neutral-950 border border-neutral-800 p-4 sm:p-6 space-y-4 sm:space-y-5 rounded-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            className={inputClass}
            placeholder="Customer name"
            value={form.customer_name}
            onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
            required
          />
          <input
            className={inputClass}
            placeholder="Phone"
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
            required
          />
        </div>

        <input
          className={inputClass}
          placeholder="Street address"
          value={form.street_address}
          onChange={(e) => setForm((f) => ({ ...f, street_address: e.target.value }))}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            className={inputClass}
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            required
          />
          <input
            className={inputClass}
            placeholder="State"
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
          />
          <input
            className={inputClass}
            placeholder="ZIP"
            value={form.zip_code}
            onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="date"
            className={inputClass}
            value={form.scheduled_date}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
            required
          />
          <div className="flex gap-2">
            <select
              className={`flex-1 ${inputClass}`}
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              required
            >
              <option value="">Start</option>
              {slots.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className={`flex-1 ${inputClass}`}
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              required
            >
              <option value="">End</option>
              {slots.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <select
          className={inputClass}
          value={form.assigned_tech_id}
          onChange={(e) => setForm((f) => ({ ...f, assigned_tech_id: e.target.value }))}
          required
        >
          <option value="">— Assign tech —</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
          ))}
        </select>

        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          placeholder="Notes"
          value={form.job_description}
          onChange={(e) => setForm((f) => ({ ...f, job_description: e.target.value }))}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 py-4 font-bold uppercase tracking-wider text-white rounded-sm disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? 'Creating…' : 'Create job'}
        </button>
      </form>
    </div>
  );
}
