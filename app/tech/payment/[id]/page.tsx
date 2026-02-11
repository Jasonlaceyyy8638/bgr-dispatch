'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

type PaymentMethod = 'card' | 'cash' | 'check' | null;

type PartialPayment = { method: string; amount: number; check_number?: string };

function totalPaidFromJob(job: any): number {
  const pp = job?.partial_payments;
  if (Array.isArray(pp) && pp.length > 0) {
    return pp.reduce((sum: number, p: PartialPayment) => sum + Number(p.amount || 0), 0);
  }
  return 0;
}

export default function TechPaymentIdPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [job, setJob] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentError, setPaymentIntentError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [stripeKeyError, setStripeKeyError] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>(null);

  useEffect(() => {
    fetch('/api/stripe-config')
      .then((r) => r.json())
      .then(({ publishableKey }: { publishableKey?: string }) => {
        const key = (publishableKey || '').trim();
        if (key) setStripePromise(loadStripe(key));
        else setStripeKeyError(true);
      })
      .catch(() => setStripeKeyError(true));
  }, []);

  async function refetchJob() {
    if (!id) return;
    const { data } = await supabase.from('jobs').select('*').eq('id', id).single();
    if (data) setJob(data);
  }

  useEffect(() => {
    if (!id) return;
    refetchJob();
  }, [id]);

  // Create PaymentIntent only when user selects Card, for the remaining balance (Stripe min $0.50)
  useEffect(() => {
    if (!id || method !== 'card' || !job) return;
    const paid = totalPaidFromJob(job);
    const price = Number(job?.price) || 0;
    const due = Math.max(0, price - paid);
    if (due < 0.5) {
      setPaymentIntentError(due > 0 ? 'Remaining balance is below card minimum ($0.50). Use cash or check.' : '');
      return;
    }
    setClientSecret('');
    setPaymentIntentError(null);
    fetch('/api/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: due }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.clientSecret) setClientSecret(json.clientSecret);
        else if (json.error) setPaymentIntentError(json.error);
      })
      .catch(() => setPaymentIntentError('Failed to start card payment'));
  }, [id, method, job?.id, job?.price, job?.partial_payments]);

  const totalPaid = totalPaidFromJob(job);
  const price = Number(job?.price) || 0;
  const amountDue = Math.max(0, price - totalPaid);
  const inputClass = 'w-full bg-black border border-neutral-800 p-3 sm:p-4 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm';

  const goBack = () => router.push(`/tech/job/${id}`);

  if (stripeKeyError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-amber-500 font-bold uppercase text-sm">Stripe key not set</p>
          <p className="text-neutral-400 text-sm">Add STRIPE_PUBLISHABLE_KEY to .env.local for card payments.</p>
          <button type="button" onClick={goBack} className="inline-block bg-neutral-800 text-white font-bold py-3 px-6 uppercase text-xs rounded-sm">Back to job</button>
        </div>
      </div>
    );
  }

  if (job && price > 0 && amountDue <= 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-green-500 font-bold uppercase text-sm">Balance paid in full</p>
          <p className="text-neutral-400 text-sm">Send the receipt or go back to the job.</p>
          <button type="button" onClick={() => router.push(`/tech/invoice/${id}?receipt=1`)} className="inline-block bg-green-600 text-white font-bold py-3 px-6 uppercase text-xs rounded-sm mr-2">Send receipt</button>
          <button type="button" onClick={goBack} className="inline-block bg-neutral-800 text-white font-bold py-3 px-6 uppercase text-xs rounded-sm">Back to job</button>
        </div>
      </div>
    );
  }

  if (job && price <= 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-amber-500 font-bold uppercase text-sm">No amount to charge</p>
          <p className="text-neutral-400 text-sm">Have the customer sign the authorization first, then complete the work. Come back here to collect payment.</p>
          <button type="button" onClick={goBack} className="inline-block bg-neutral-800 text-white font-bold py-3 px-6 uppercase text-xs rounded-sm">Back to job</button>
        </div>
      </div>
    );
  }

  if (paymentIntentError && method !== 'cash' && method !== 'check') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-amber-500 font-bold uppercase text-sm">Card setup failed</p>
          <p className="text-neutral-400 text-sm">{paymentIntentError}</p>
          <button type="button" onClick={goBack} className="inline-block bg-neutral-800 text-white font-bold py-3 px-6 uppercase text-xs rounded-sm">Back to job</button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <p className="text-white font-bold uppercase animate-pulse">Loading…</p>
      </div>
    );
  }

  // Method selection screen
  if (method === null) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6 text-white">
        <div className="max-w-md mx-auto space-y-6 pt-6">
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm text-center">
            {totalPaid > 0 ? (
              <>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Remaining balance</p>
                <p className="text-xs text-neutral-400 mb-1">${totalPaid.toFixed(2)} paid so far</p>
              </>
            ) : (
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Total due</p>
            )}
            <p className="text-3xl sm:text-4xl font-bold text-white">${amountDue.toFixed(2)}</p>
          </div>
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">How did they pay {totalPaid > 0 ? 'the rest' : ''}?</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => setMethod('card')}
              className="bg-neutral-900 border border-neutral-700 p-4 rounded-sm text-left flex items-center gap-3 active:bg-neutral-800"
            >
              <span className="text-2xl">💳</span>
              <span className="font-bold uppercase text-sm">Card</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className="bg-neutral-900 border border-neutral-700 p-4 rounded-sm text-left flex items-center gap-3 active:bg-neutral-800"
            >
              <span className="text-2xl">💵</span>
              <span className="font-bold uppercase text-sm">Cash</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('check')}
              className="bg-neutral-900 border border-neutral-700 p-4 rounded-sm text-left flex items-center gap-3 active:bg-neutral-800"
            >
              <span className="text-2xl">📄</span>
              <span className="font-bold uppercase text-sm">Check</span>
            </button>
          </div>
          <button type="button" onClick={goBack} className="w-full py-3 text-neutral-500 font-bold uppercase text-xs rounded-sm border border-neutral-800">
            Back to job
          </button>
        </div>
      </div>
    );
  }

  // Cash
  if (method === 'cash') {
    return (
      <CashForm
        job={job}
        jobId={id!}
        amountDue={amountDue}
        price={price}
        onDone={() => router.push(`/tech/invoice/${id}?receipt=1`)}
        onPartialDone={() => { refetchJob(); setMethod(null); }}
        onBack={() => setMethod(null)}
        inputClass={inputClass}
      />
    );
  }

  // Check
  if (method === 'check') {
    return (
      <CheckForm
        job={job}
        jobId={id!}
        amountDue={amountDue}
        price={price}
        onDone={() => router.push(`/tech/invoice/${id}?receipt=1`)}
        onPartialDone={() => { refetchJob(); setMethod(null); }}
        onBack={() => setMethod(null)}
        inputClass={inputClass}
      />
    );
  }

  // Card selected but remaining balance below Stripe minimum
  if (method === 'card' && amountDue > 0 && amountDue < 0.5) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6 text-white">
        <div className="max-w-md mx-auto space-y-6 pt-6">
          <button type="button" onClick={() => setMethod(null)} className="text-neutral-500 font-bold uppercase text-xs">← Change payment method</button>
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm text-center">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Remaining balance</p>
            <p className="text-3xl font-bold text-white">${amountDue.toFixed(2)}</p>
            <p className="text-amber-500 text-sm mt-3">Card minimum is $0.50. Use cash or check for the remainder.</p>
          </div>
          <button type="button" onClick={() => setMethod(null)} className="w-full py-3 bg-neutral-800 text-white font-bold uppercase text-xs rounded-sm">
            Choose cash or check
          </button>
        </div>
      </div>
    );
  }

  // Card (Stripe) – only load when method is card
  if (method === 'card' && stripePromise && clientSecret) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-6 text-white">
        <div className="max-w-md mx-auto space-y-6 pt-6">
          <button type="button" onClick={() => setMethod(null)} className="text-neutral-500 font-bold uppercase text-xs">← Change payment method</button>
          <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm text-center">
            {totalPaid > 0 ? (
              <>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Remaining balance</p>
                <p className="text-xs text-neutral-400 mb-1">${totalPaid.toFixed(2)} paid so far</p>
              </>
            ) : (
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Total due</p>
            )}
            <p className="text-3xl sm:text-4xl font-bold text-white">${amountDue.toFixed(2)}</p>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <CardForm job={job} jobId={id ?? ''} amountDue={amountDue} price={price} onDone={() => router.push(`/tech/invoice/${id}?receipt=1`)} onPartialDone={() => { refetchJob(); setMethod(null); }} onBack={() => setMethod(null)} />
          </Elements>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <p className="text-white font-bold uppercase animate-pulse">Loading…</p>
    </div>
  );
}

function CashForm({
  job,
  jobId,
  amountDue,
  price,
  onDone,
  onPartialDone,
  onBack,
  inputClass,
}: {
  job: any;
  jobId: string;
  amountDue: number;
  price: number;
  onDone: () => void;
  onPartialDone: () => void;
  onBack: () => void;
  inputClass: string;
}) {
  const [cashReceived, setCashReceived] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amount = parseFloat(cashReceived);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter the amount of cash received.');
      return;
    }
    if (amount > amountDue) {
      setError(`Amount cannot exceed remaining balance ($${amountDue.toFixed(2)}).`);
      return;
    }
    setSaving(true);
    const existing: PartialPayment[] = Array.isArray(job?.partial_payments) ? job.partial_payments : [];
    const updated = [...existing, { method: 'cash', amount }];
    const newTotal = updated.reduce((s, p) => s + Number(p.amount), 0);
    const isPaidInFull = newTotal >= price;
    const update: Record<string, unknown> = {
      partial_payments: updated,
      payment_method: 'cash',
      payment_amount: isPaidInFull ? price : newTotal,
    };
    if (isPaidInFull) update.status = 'Closed';
    const { error: err } = await supabase.from('jobs').update(update).eq('id', jobId);
    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }
    if (isPaidInFull) {
      const phone = (job?.phone_number || '').toString().trim();
      const customerName = (job?.customer_name || '').toString().trim();
      if (phone && customerName) {
        try {
          const r = await fetch('/api/customers/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: customerName, phone }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok && j?.error) console.warn('Customer save:', j.error);
        } catch (_) {}
        onDone();
      } else {
        onDone();
      }
    } else {
      onPartialDone();
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 text-white">
      <div className="max-w-md mx-auto space-y-6 pt-6">
        <button type="button" onClick={onBack} className="text-neutral-500 font-bold uppercase text-xs">← Change payment method</button>
        <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Remaining balance</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">${amountDue.toFixed(2)}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Enter amount of cash received (up to ${amountDue.toFixed(2)})</p>
          <input
            type="number"
            step="0.01"
            min="0"
            max={amountDue}
            required
            className={inputClass}
            placeholder="0.00"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-green-600 hover:bg-green-500 py-4 font-bold uppercase text-sm text-white rounded-sm disabled:opacity-50">
            {saving ? 'Saving…' : (parseFloat(cashReceived) || 0) >= amountDue ? 'Record cash & close job' : 'Record cash'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CheckForm({
  job,
  jobId,
  amountDue,
  price,
  onDone,
  onPartialDone,
  onBack,
  inputClass,
}: {
  job: any;
  jobId: string;
  amountDue: number;
  price: number;
  onDone: () => void;
  onPartialDone: () => void;
  onBack: () => void;
  inputClass: string;
}) {
  const [checkNumber, setCheckNumber] = useState(() => (job?.check_number ?? '').toString());
  const [checkAmount, setCheckAmount] = useState(() =>
    job?.payment_method === 'check' && job?.payment_amount != null ? String(Number(job.payment_amount)) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amount = parseFloat(checkAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setError('Enter the check amount.');
      return;
    }
    if (amount > amountDue) {
      setError(`Amount cannot exceed remaining balance ($${amountDue.toFixed(2)}).`);
      return;
    }
    if (!checkNumber.trim()) {
      setError('Enter the check number.');
      return;
    }
    setSaving(true);
    const existing: PartialPayment[] = Array.isArray(job?.partial_payments) ? job.partial_payments : [];
    const updated = [...existing, { method: 'check', amount, check_number: checkNumber.trim() }];
    const newTotal = updated.reduce((s, p) => s + Number(p.amount), 0);
    const isPaidInFull = newTotal >= price;
    const lastPayment = updated[updated.length - 1];
    const update: Record<string, unknown> = {
      partial_payments: updated,
      payment_method: 'check',
      payment_amount: lastPayment?.amount ?? amount,
      check_number: checkNumber.trim(),
    };
    if (isPaidInFull) update.payment_amount = price;
    const { error: err } = await supabase.from('jobs').update(update).eq('id', jobId);
    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }
    setSaving(false);
    if (isPaidInFull) onDone();
    else onPartialDone();
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 text-white pb-24">
      <div className="max-w-md mx-auto space-y-6 pt-6">
        <button type="button" onClick={onBack} className="text-neutral-500 font-bold uppercase text-xs">← Change payment method</button>
        <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-sm text-center">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Remaining balance</p>
          <p className="text-3xl sm:text-4xl font-bold text-white">${amountDue.toFixed(2)}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Check number (required)</p>
          <input
            type="text"
            required
            className={inputClass}
            placeholder="Check number"
            value={checkNumber}
            onChange={(e) => setCheckNumber(e.target.value)}
          />
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Amount (up to ${amountDue.toFixed(2)})</p>
          <input
            type="number"
            step="0.01"
            min="0"
            max={amountDue}
            required
            className={inputClass}
            placeholder="0.00"
            value={checkAmount}
            onChange={(e) => setCheckAmount(e.target.value)}
          />
          <p className="text-neutral-500 text-xs">Next: send receipt to customer. If this pays in full, take a photo of the check on the invoice page to close the job.</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-green-600 hover:bg-green-500 py-4 font-bold uppercase text-sm text-white rounded-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Continue → Send receipt'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CardForm({
  job,
  jobId,
  amountDue,
  price,
  onDone,
  onPartialDone,
  onBack,
}: {
  job: any;
  jobId: string;
  amountDue: number;
  price: number;
  onDone: () => void;
  onPartialDone: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/tech/invoice/${jobId}?receipt=1` },
      redirect: 'if_required',
    });
    if (error) {
      alert(error.message ?? 'Payment failed');
      setProcessing(false);
      return;
    }
    const existing: PartialPayment[] = Array.isArray(job?.partial_payments) ? job.partial_payments : [];
    const updated = [...existing, { method: 'card', amount: amountDue }];
    const newTotal = updated.reduce((s, p) => s + Number(p.amount), 0);
    const isPaidInFull = newTotal >= price;
    const update: Record<string, unknown> = {
      partial_payments: updated,
      payment_method: 'card',
      payment_amount: isPaidInFull ? price : newTotal,
    };
    if (isPaidInFull) update.status = 'Closed';
    await supabase.from('jobs').update(update).eq('id', jobId);
    if (isPaidInFull) {
      const phone = (job?.phone_number || '').toString().trim();
      const customerName = (job?.customer_name || '').toString().trim();
      if (phone && customerName) {
        try {
          await fetch('/api/customers/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: customerName, phone }),
          });
        } catch (_) {}
      }
      alert('Payment successful. Sending you to send the receipt.');
      onDone();
    } else {
      onPartialDone();
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Card</p>
      <div className="min-h-[200px] rounded-sm border border-neutral-700 p-2 bg-neutral-900/50">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 py-4 font-bold uppercase text-sm tracking-wider text-white rounded-sm active:scale-[0.98]"
      >
        {processing ? 'Processing…' : 'Confirm & pay'}
      </button>
      <button type="button" onClick={onBack} className="w-full py-3 text-neutral-500 font-bold uppercase text-xs rounded-sm border border-neutral-800">
        Back
      </button>
    </form>
  );
}
