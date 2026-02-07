'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Customer = { id: string; name: string; phone: string | null; email: string | null; created_at: string };

type JobRow = {
  id: string;
  status: string;
  price: number | null;
  payment_amount: number | null;
  service_type: string | null;
  job_description: string | null;
  tech_notes: string | null;
  invoice_number: string | null;
  created_at: string | null;
  assigned_tech_id: string | null;
  tech_users?: { name: string } | null;
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [copied, setCopied] = useState(false);
  const [customerJobs, setCustomerJobs] = useState<JobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [lastTechName, setLastTechName] = useState<string | null>(null);
  const [invoiceSearchPhones, setInvoiceSearchPhones] = useState<string[]>([]);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      const role = user.role || 'tech';
      if (role === 'tech') {
        router.replace('/');
      } else {
        setAllowed(true);
      }
    } catch {
      router.replace('/');
    }
  }, [router]);
  if (allowed !== true) return null;

  useEffect(() => {
    if (allowed !== true) return;
    const q = search.trim();
    if (!q) {
      setInvoiceSearchPhones([]);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('jobs')
          .select('phone_number')
          .ilike('invoice_number', `%${q}%`);
        const phones = Array.from(new Set((data ?? []).map((r: { phone_number: string | null }) => r.phone_number).filter(Boolean))) as string[];
        setInvoiceSearchPhones(phones);
      } catch {
        setInvoiceSearchPhones([]);
      }
    })();
  }, [search, allowed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const namePhoneEmailMatch =
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q);
      const invoiceMatch = invoiceSearchPhones.length > 0 && c.phone != null && invoiceSearchPhones.includes(c.phone);
      return namePhoneEmailMatch || invoiceMatch;
    });
  }, [customers, search, invoiceSearchPhones]);

  useEffect(() => {
    if (allowed !== true) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('customers')
          .select('id, name, phone, email, created_at')
          .order('name');
        setCustomers((data as Customer[]) || []);
      } catch {
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed]);

  useEffect(() => {
    if (allowed !== true || !selected?.phone) {
      setCustomerJobs([]);
      setLastTechName(null);
      return;
    }
    (async () => {
      setJobsLoading(true);
      setLastTechName(null);
      try {
        const phone = selected.phone!.trim();
        const { data } = await supabase
          .from('jobs')
          .select('id, status, price, payment_amount, service_type, job_description, tech_notes, invoice_number, created_at, assigned_tech_id, tech_users(name)')
          .eq('phone_number', phone)
          .order('created_at', { ascending: false })
          .limit(50);
        const jobs = (data as JobRow[]) ?? [];
        setCustomerJobs(jobs);
        const first = jobs[0];
        if (first?.tech_users?.name) {
          setLastTechName(first.tech_users.name);
        } else if (first?.assigned_tech_id) {
          const { data: tech } = await supabase.from('tech_users').select('name').eq('id', first.assigned_tech_id).single();
          setLastTechName(tech?.name ?? null);
        }
      } catch {
        setCustomerJobs([]);
      } finally {
        setJobsLoading(false);
      }
    })();
  }, [allowed, selected?.id, selected?.phone]);

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function normalizePhone(p: string) {
    return p.replace(/\D/g, '');
  }

  return (
    <div className="max-w-4xl mx-auto pb-6">
      <div className="mb-6 sm:mb-8 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl sm:text-4xl font-bold uppercase text-white tracking-tight">
          Customer <span className="text-red-600">Database</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          Customers are added when you close a job (cash, check, or card). Click a row to view.
        </p>
      </div>
      <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <input
            type="text"
            placeholder="Search by name, phone, email, or invoice #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-black border border-neutral-800 p-3 text-white font-medium text-sm outline-none focus:border-red-600 rounded-sm placeholder:text-neutral-600"
          />
          <span className="text-[10px] font-bold text-neutral-500 uppercase shrink-0">
            {filtered.length} of {customers.length}
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-neutral-500 font-bold uppercase text-sm">Loading…</div>
        ) : customers.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-sm">
            {!isSupabaseConfigured ? (
              <>
                <p className="text-red-500/90 font-semibold uppercase text-sm tracking-wider mb-1">Supabase not configured</p>
                <p className="text-neutral-500 text-xs uppercase tracking-wider max-w-md mx-auto">
                  Add <code className="text-neutral-400">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
                  <code className="text-neutral-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Netlify → Site configuration → Environment variables, then redeploy.
                </p>
              </>
            ) : (
              <>
                <p className="text-neutral-500 font-semibold uppercase text-sm tracking-wider mb-1">No customers yet</p>
                <p className="text-neutral-600 text-xs uppercase tracking-wider">
                  Close a job with cash, check, or card to add customers here. Run the SQL in{' '}
                  <code className="text-neutral-500">supabase-customers-table.sql</code> if the table does not exist.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelected(c)}
                className="w-full p-4 sm:p-5 hover:bg-neutral-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-left cursor-pointer active:bg-neutral-800/50"
              >
                <div>
                  <p className="font-bold text-white uppercase text-sm">{c.name}</p>
                  {c.phone && <p className="text-[10px] text-neutral-500 uppercase mt-0.5">{c.phone}</p>}
                  {c.email && <p className="text-[10px] text-neutral-500 uppercase">{c.email}</p>}
                </div>
                {c.created_at && (
                  <p className="text-[10px] text-neutral-600 uppercase shrink-0">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                )}
              </button>
            ))}
            {filtered.length === 0 && search.trim() && (
              <div className="p-8 text-center text-neutral-500 text-sm">No customers match &quot;{search}&quot;</div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-sm w-full max-w-lg p-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold uppercase text-white text-sm">Customer</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-neutral-500 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="font-bold text-white uppercase text-lg mb-1">{selected.name}</p>
            {selected.phone && (
              <div className="flex items-center gap-2 mt-2">
                <a
                  href={`tel:${normalizePhone(selected.phone)}`}
                  className="text-red-600 font-bold uppercase text-sm hover:text-red-500"
                >
                  Call {selected.phone}
                </a>
                <button
                  type="button"
                  onClick={() => copyPhone(selected.phone!)}
                  className="text-[10px] font-bold uppercase text-neutral-500 hover:text-white"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
            {selected.email && (
              <a
                href={`mailto:${selected.email}`}
                className="block text-red-600 font-bold uppercase text-sm mt-2 hover:text-red-500"
              >
                Email {selected.email}
              </a>
            )}
            {selected.created_at && (
              <p className="text-[10px] text-neutral-600 uppercase mt-2">
                In database since {new Date(selected.created_at).toLocaleDateString()}
              </p>
            )}
            {lastTechName && (
              <p className="text-[10px] text-neutral-500 uppercase mt-2">
                Last tech: <span className="text-white font-semibold">{lastTechName}</span>
              </p>
            )}

            <div className="mt-6 pt-4 border-t border-neutral-800">
              <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Previous jobs / invoices</h4>
              {jobsLoading ? (
                <p className="text-neutral-500 text-xs uppercase">Loading…</p>
              ) : customerJobs.length === 0 ? (
                <p className="text-neutral-600 text-xs uppercase">No jobs found for this phone number.</p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {customerJobs.map((job) => {
                    const amt = Number(job.payment_amount ?? job.price ?? 0);
                    const label = (job.service_type || job.job_description || 'Job').slice(0, 60);
                    const date = job.created_at;
                    return (
                      <li key={job.id}>
                        <Link
                          href={`/tech/invoice/${job.id}?view=1`}
                          className="block bg-neutral-900 border border-neutral-800 p-3 rounded-sm hover:border-red-600/50 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                                Invoice # {job.invoice_number || `INV-${String(job.id).padStart(5, '0')}`}
                              </p>
                              <p className="text-white font-semibold text-sm uppercase truncate">{label}</p>
                              {date && (
                                <p className="text-[10px] text-neutral-500 uppercase mt-0.5">
                                  {new Date(date).toLocaleDateString()} · {job.status}
                                </p>
                              )}
                              {job.tech_notes && (
                                <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">{job.tech_notes}</p>
                              )}
                            </div>
                            <span className="text-green-500 font-bold text-sm shrink-0">${amt.toFixed(2)}</span>
                          </div>
                          <p className="text-[10px] text-red-600 uppercase mt-1.5">View invoice →</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
