'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';

export default function TechInvoiceIdPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [job, setJob] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [ticket, setTicket] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [partCategory, setPartCategory] = useState<string>('All');
  const [step, setStep] = useState<'invoice' | 'sign' | 'receipt'>('invoice');
  const [contact, setContact] = useState({ phone: '', email: '' });
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null);
  const [taxable, setTaxable] = useState(true);
  const [checkPhoto, setCheckPhoto] = useState<string | null>(null);
  const [closingWithCheck, setClosingWithCheck] = useState(false);

  const TAX_RATE = 0.075;

  const DRAFT_KEY = id ? `invoice_draft_${id}` : '';

  useEffect(() => {
    if (id) {
      loadJob();
      loadParts();
    }
  }, [id]);

  // Save draft whenever ticket or taxable changes (keep saving after authorize so they can edit and re-sign; only stop when job is Closed)
  useEffect(() => {
    if (!DRAFT_KEY || !job || job.status === 'Closed') return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ticket, taxable }));
    } catch {
      // ignore quota etc.
    }
  }, [DRAFT_KEY, job?.status, ticket, taxable]);

  useEffect(() => {
    const isReceipt = searchParams.get('receipt') === '1';
    const isClosed = job?.status === 'Closed';
    const isCheckPending = job?.payment_method === 'check' && Number(job?.payment_amount) > 0 && !job?.check_photo_url;
    if (isReceipt && (isClosed || isCheckPending)) {
      setStep('receipt');
      setReceiptTotal(Number(job.payment_amount ?? job.price) || 0);
      setContact((c) => ({ ...c, phone: job.phone_number || '' }));
    }
  }, [searchParams, job?.status, job?.payment_method, job?.payment_amount, job?.price, job?.phone_number, job?.check_photo_url]);

  async function loadJob() {
    const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
    if (data) {
      setJob(data);
      setContact((c) => ({ ...c, phone: data.phone_number || '' }));
      setTaxable(data.taxable !== false);
      // Restore draft so parts persist when navigating away; also restore after authorize so they can add parts and get a new signature (clear draft only when job is Closed)
      if (data.status === 'Closed') {
        try {
          localStorage.removeItem(`invoice_draft_${id}`);
        } catch {
          // ignore
        }
      } else {
        try {
          const raw = localStorage.getItem(`invoice_draft_${id}`);
          if (raw) {
            const d = JSON.parse(raw);
            if (Array.isArray(d.ticket) && d.ticket.length > 0) setTicket(d.ticket);
            if (typeof d.taxable === 'boolean') setTaxable(d.taxable);
          }
        } catch {
          // ignore invalid draft
        }
      }
    }
  }

  async function loadParts() {
    const { data } = await supabase.from('inventory').select('id, part_name, category, retail_price').order('part_name');
    if (data) setParts(data);
  }

  function addToTicket(part: any) {
    setTicket((t) => [...t, { ...part, custom_price: part.retail_price, qty: 1 }]);
    setAdding(false);
  }

  function updatePrice(index: number, value: number) {
    setTicket((t) => t.map((item, i) => (i === index ? { ...item, custom_price: value } : item)));
  }

  const subtotal = ticket.reduce((sum, item) => sum + (item.custom_price ?? 0) * (item.qty ?? 1), 0);
  const tax = taxable ? Math.round(subtotal * TAX_RATE * 100) / 100 : 0;
  const total = subtotal + tax;

  function toSign() {
    if (ticket.length === 0) {
      alert('Add at least one item.');
      return;
    }
    setStep('sign');
  }

  async function authorize() {
    if (sigRef.current?.isEmpty?.()) {
      alert('Customer signature required.');
      return;
    }
    const itemsSummary = ticket.map((i) => `• ${i.part_name}: $${i.custom_price}`).join('\n');
    const desc = `${job?.job_description || job?.service_type || ''}\n\n[AUTHORIZED - $${total.toFixed(2)}]:\n${itemsSummary}\n\n[SIGNED - Work authorized. Payment after completion.]`;
    const { error } = await supabase
      .from('jobs')
      .update({ price: total, status: 'Authorized', service_type: desc, taxable, tax_amount: tax || null })
      .eq('id', id);
    if (error) {
      alert('Error saving: ' + error.message);
      return;
    }
    // Keep draft in localStorage so they can come back, add parts, and get a new signature if needed; draft is cleared when job is Closed
    alert('Authorization saved. You can come back to add or change parts and get a new signature if needed. Use "Take payment" when the job is done.');
    router.push(`/tech/job/${id}`);
  }

  async function closeJobWithCheckPhoto() {
    if (!checkPhoto || !id) return;
    setClosingWithCheck(true);
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'Closed', check_photo_url: checkPhoto })
      .eq('id', id);
    if (error) {
      alert('Error closing job: ' + error.message);
      setClosingWithCheck(false);
      return;
    }
    // Save to customer database (use contact.phone if job doesn't have it, e.g. from receipt form)
    const phone = (job?.phone_number || contact?.phone || '').toString().trim();
    const customerName = (job?.customer_name || 'Customer').toString().trim();
    if (phone && customerName) {
      try {
        const res = await fetch('/api/customers/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customerName, phone }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn('Customer save:', err?.error || res.status);
        }
      } catch (e) {
        console.warn('Customer save failed', e);
      }
    }
    setClosingWithCheck(false);
    router.push('/');
  }

  async function sendReceipt(type: 'text' | 'email') {
    const amount = receiptTotal ?? total;
    const reviewLink = 'https://g.page/r/CR9wZbE17p6bEBM/review';
    const contactValue = type === 'text' ? contact.phone : contact.email;
    if (!contactValue?.trim()) {
      alert(type === 'text' ? 'Enter customer phone to send receipt.' : 'Enter customer email to send receipt.');
      return;
    }
    try {
      const res = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          contact: contactValue.trim(),
          total: amount.toFixed(2),
          reviewLink,
          businessName: 'Buckeye Garage Door Repair',
          location: 'Dayton',
          origin: typeof window !== 'undefined' ? window.location.origin : '',
          jobId: id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Failed to send receipt.');
        return;
      }
      alert('Receipt sent.');
      // For check payment: stay on this screen so they can take photo and close job; don't redirect
      const isCheckPending = job?.payment_method === 'check' && !job?.check_photo_url;
      if (!isCheckPending) {
        router.push('/');
      }
    } catch (e) {
      alert('Failed to send receipt. Try again.');
    }
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-white font-bold uppercase animate-pulse">Loading…</p>
      </div>
    );
  }

  const isViewOnly = searchParams.get('view') === '1';
  const displayTotal = Number(job.payment_amount ?? job.price) || 0;
  const invoiceContent = job.service_type || job.job_description || 'No invoice details.';
  const displayInvoiceNumber = job.invoice_number || `INV-${String(job.id).padStart(5, '0')}`;

  if (isViewOnly) {
    return (
      <div className="max-w-md mx-auto min-h-screen pb-24 sm:pb-8">
        <header className="sticky top-0 z-20 bg-black/95 border-b border-neutral-800 p-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-xl font-bold uppercase text-white tracking-tight">Invoice</h1>
            <p className="text-red-600 text-[10px] font-bold uppercase tracking-wider mt-0.5">Invoice # {displayInvoiceNumber}</p>
            <p className="text-red-600 text-[10px] font-bold uppercase mt-0.5">{job.customer_name}</p>
            {job.created_at && (
              <p className="text-[10px] text-neutral-500 uppercase mt-0.5">
                {new Date(job.created_at).toLocaleDateString()} · {job.status}
              </p>
            )}
          </div>
          <button type="button" onClick={() => router.back()} className="text-sm font-bold text-neutral-500 hover:text-white">
            Back
          </button>
        </header>
        <div className="p-4 space-y-4">
          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-sm">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Details</p>
            <pre className="text-white font-mono text-xs whitespace-pre-wrap leading-relaxed">{invoiceContent}</pre>
          </div>
          {(job.payment_method || job.payment_amount != null) && (
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-sm">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Payment</p>
              <div className="space-y-1.5 text-sm">
                {job.payment_method && (
                  <p className="text-white">
                    <span className="text-neutral-500 uppercase">Method:</span>{' '}
                    <span className="font-semibold uppercase">{job.payment_method}</span>
                  </p>
                )}
                {(job.payment_amount != null || displayTotal > 0) && (
                  <p className="text-white">
                    <span className="text-neutral-500 uppercase">Amount:</span>{' '}
                    <span className="font-bold text-green-500">
                      ${Number(job.payment_amount ?? job.price ?? 0).toFixed(2)}
                    </span>
                  </p>
                )}
                {job.payment_method?.toLowerCase() === 'check' && job.check_number && (
                  <p className="text-white">
                    <span className="text-neutral-500 uppercase">Check #:</span>{' '}
                    <span className="font-mono">{job.check_number}</span>
                  </p>
                )}
                {job.check_photo_url && (
                  <a
                    href={job.check_photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold uppercase text-red-600 hover:text-red-500"
                  >
                    View check photo →
                  </a>
                )}
              </div>
            </div>
          )}
          {job.taxable && job.tax_amount != null && Number(job.tax_amount) > 0 && (
            <div className="flex justify-between items-center py-2 border-t border-neutral-800 text-sm">
              <span className="text-neutral-500 uppercase">Subtotal</span>
              <span className="text-white">${(Number(displayTotal) - Number(job.tax_amount)).toFixed(2)}</span>
            </div>
          )}
          {job.taxable && job.tax_amount != null && Number(job.tax_amount) > 0 && (
            <div className="flex justify-between items-center py-2 border-t border-neutral-800 text-sm">
              <span className="text-neutral-500 uppercase">Tax</span>
              <span className="text-white">${Number(job.tax_amount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3 border-t border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Total</span>
            <span className="text-2xl font-bold text-green-500">${displayTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 sm:p-4 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm';

  return (
    <div className="max-w-md mx-auto min-h-screen pb-28 sm:pb-8">
      <header className="sticky top-0 z-20 bg-black/95 border-b border-neutral-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg sm:text-xl font-bold uppercase text-white tracking-tight">Job ticket</h1>
          <p className="text-red-600 text-[10px] font-bold uppercase mt-0.5">{job.customer_name}</p>
        </div>
        <button type="button" onClick={() => router.back()} className="text-sm font-bold text-neutral-500 hover:text-white">
          Back
        </button>
      </header>

      {step === 'invoice' && (
        <div className="p-4 pb-40 md:pb-8">
          {/* Add items + taxable: sticky at top on mobile so tech doesn't scroll to add more */}
          <div className="sticky top-20 z-10 -mx-4 px-4 py-2 bg-black/95 border-b border-neutral-800 md:static md:mx-0 md:px-0 md:py-0 md:border-0 md:bg-transparent md:space-y-3 md:mb-3">
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full bg-neutral-800 hover:bg-neutral-700 py-3 md:py-4 font-bold uppercase text-xs tracking-wider text-white rounded-sm active:scale-[0.98]"
            >
              + Add items
            </button>
            <label className="flex items-center gap-2 mt-2 md:mt-4 p-2 md:p-3 bg-neutral-950 border border-neutral-800 rounded-sm cursor-pointer">
              <input
                type="checkbox"
                checked={taxable}
                onChange={(e) => setTaxable(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 bg-black text-red-600 focus:ring-red-600 shrink-0"
              />
              <span className="text-xs md:text-sm font-semibold text-white uppercase">Taxable</span>
            </label>
          </div>
          {/* Line items: compact on mobile to reduce scrolling */}
          <div className="space-y-2 mt-3 md:space-y-3">
            {ticket.map((item, index) => (
              <div key={index} className="bg-neutral-950 border border-neutral-800 rounded-sm p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-bold text-red-600 uppercase hidden sm:inline">{item.category}</span>
                    <span className="font-bold text-white uppercase text-xs md:text-sm truncate sm:break-words" title={item.part_name}>{item.part_name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-neutral-500 hidden sm:inline">${item.retail_price}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.custom_price ?? ''}
                      onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                      className="w-20 md:flex-1 md:min-w-0 bg-black border border-neutral-800 py-2 px-2 md:p-2 text-green-500 font-bold text-sm outline-none focus:border-red-600 rounded-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setTicket((t) => t.filter((_, i) => i !== index))}
                      className="text-[10px] font-bold uppercase text-neutral-500 hover:text-red-600 p-1"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 sm:hidden">Retail ${item.retail_price}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'sign' && (
        <div className="p-4 space-y-4 pb-40 md:pb-8">
          <h2 className="text-base font-bold uppercase text-white">Customer signature</h2>
          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-sm text-sm text-neutral-300 leading-relaxed">
            <p className="mb-3">
              I authorize Buckeye Garage Door Repair to perform the work listed above for the total amount of <strong className="text-white font-bold">${total.toFixed(2)}</strong>.
            </p>
            <p>
              If any additional parts or services are needed beyond this estimate, I understand you will discuss the cost with me before proceeding.
            </p>
          </div>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Sign below to authorize</p>
          <div className="bg-white p-1 rounded-sm overflow-hidden">
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{ className: 'w-full h-48 sm:h-64 touch-none', style: { touchAction: 'none' } }}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep('invoice')} className="flex-1 py-3 bg-neutral-800 font-bold uppercase text-xs text-white rounded-sm">
              Back
            </button>
            <button
              type="button"
              onClick={() => sigRef.current?.clear?.()}
              className="flex-1 py-3 bg-red-900/50 font-bold uppercase text-xs text-red-400 rounded-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {step !== 'receipt' && (
        <div className="fixed left-0 right-0 z-30 bg-neutral-900/95 border-t border-neutral-800 p-4 flex justify-between items-center max-w-md mx-auto bottom-20 md:bottom-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-4">
          <div className="min-w-0 flex-1 mr-3">
            {tax > 0 && (
              <>
                <p className="text-[10px] font-bold text-neutral-500 uppercase">Subtotal / Tax</p>
                <p className="text-sm text-neutral-400 truncate">${subtotal.toFixed(2)} + ${tax.toFixed(2)}</p>
              </>
            )}
            <p className="text-[10px] font-bold text-neutral-500 uppercase">Total</p>
            <p className="text-xl sm:text-3xl font-bold text-green-500 truncate">${total.toFixed(2)}</p>
          </div>
          {step === 'invoice' ? (
            <button type="button" onClick={toSign} className="bg-red-600 hover:bg-red-500 px-5 py-3 font-bold uppercase text-xs text-white rounded-sm active:scale-[0.98] shrink-0 touch-manipulation min-h-[44px]">
              Review & sign
            </button>
          ) : (
            <button type="button" onClick={authorize} className="bg-green-600 hover:bg-green-500 px-5 py-3 font-bold uppercase text-xs text-white rounded-sm active:scale-[0.98] shrink-0 touch-manipulation min-h-[44px]">
              Authorize
            </button>
          )}
        </div>
      )}

      {step === 'receipt' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-sm rounded-sm overflow-hidden my-auto">
            <div className="p-4 border-b border-neutral-800">
              <h2 className="font-bold uppercase text-green-500">
                {job?.payment_method === 'check' && !job?.check_photo_url ? 'Send receipt, then photo check' : 'Payment received — send receipt'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[10px] font-bold text-neutral-500 uppercase text-center">
                Send invoice/receipt to customer (total: ${(receiptTotal ?? total).toFixed(2)})
              </p>
              <p className="text-[10px] text-neutral-500 text-center">
                Email includes a link to their warranty (90-day labor, 10-year parts). They can print or save as PDF.
              </p>
              <input
                className={inputClass}
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
              />
              <input
                className={inputClass}
                placeholder="Email"
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => sendReceipt('text')} className="py-3 bg-red-600 font-bold uppercase text-xs text-white rounded-sm active:scale-[0.98]">
                  Text
                </button>
                <button type="button" onClick={() => sendReceipt('email')} className="py-3 bg-neutral-800 font-bold uppercase text-xs text-white rounded-sm active:scale-[0.98]">
                  Email
                </button>
              </div>
              <a
                href={typeof window !== 'undefined' ? `${window.location.origin}/invoice/${id}/warranty` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-[10px] font-bold uppercase text-red-600 hover:text-red-500"
              >
                Open warranty page (share or print)
              </a>

              {/* Check: take photo then close job */}
              {job?.payment_method === 'check' && !job?.check_photo_url && (
                <>
                  <div className="border-t border-neutral-800 pt-4 mt-4">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Take photo of check to close job</p>
                    <label className="block border border-neutral-700 border-dashed p-4 rounded-sm text-center cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => setCheckPhoto(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                      {checkPhoto ? (
                        <img src={checkPhoto} alt="Check" className="max-h-32 mx-auto rounded object-contain" />
                      ) : (
                        <span className="text-neutral-500 font-bold uppercase text-sm">Tap to take photo</span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={closeJobWithCheckPhoto}
                      disabled={!checkPhoto || closingWithCheck}
                      className="w-full mt-3 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 font-bold uppercase text-xs text-white rounded-sm active:scale-[0.98]"
                    >
                      {closingWithCheck ? 'Closing…' : 'Close job with photo'}
                    </button>
                  </div>
                  <button type="button" onClick={() => router.push(`/tech/job/${id}`)} className="w-full text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
                    Back to job (close later)
                  </button>
                </>
              )}

              {!(job?.payment_method === 'check' && !job?.check_photo_url) && (
                <button type="button" onClick={() => router.push('/')} className="w-full text-[10px] font-bold uppercase text-neutral-500 hover:text-white">
                  Close without receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 bg-black p-4 overflow-y-auto pb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold uppercase text-white">Add part by category</h2>
            <button type="button" onClick={() => setAdding(false)} className="text-2xl text-neutral-500 hover:text-white">
              ×
            </button>
          </div>
          <input
            className={`${inputClass} mb-3`}
            placeholder="Search parts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {(() => {
            const categories = ['All', ...Array.from(new Set(parts.map((p) => p.category).filter(Boolean))).sort() as string[]];
            const filtered = parts.filter((p) => {
              const matchSearch = !search.trim() || p.part_name?.toLowerCase().includes(search.toLowerCase());
              const matchCat = partCategory === 'All' || p.category === partCategory;
              return matchSearch && matchCat;
            });
            const byCategory = partCategory === 'All'
              ? categories.filter((c) => c !== 'All').map((cat) => ({ category: cat, items: filtered.filter((p) => p.category === cat) })).filter((g) => g.items.length > 0)
              : [{ category: partCategory, items: filtered }];
            return (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPartCategory(cat)}
                      className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition-colors ${
                        partCategory === cat ? 'bg-red-600 border-red-600 text-white' : 'border-neutral-700 text-neutral-500 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  {byCategory.map((group) => (
                    <div key={group.category}>
                      <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 sticky top-0 bg-black py-1 z-10">
                        {group.category}
                      </h3>
                      <div className="space-y-2">
                        {group.items.map((part) => (
                          <button
                            key={part.id}
                            type="button"
                            onClick={() => addToTicket(part)}
                            className="w-full bg-neutral-950 border border-neutral-800 p-4 flex justify-between items-center rounded-sm text-left active:bg-neutral-800"
                          >
                            <span className="font-bold text-white uppercase text-sm">{part.part_name}</span>
                            <span className="font-bold text-green-500">${part.retail_price}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <p className="text-neutral-500 text-sm text-center py-6">No parts in this category. Try another or search.</p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
