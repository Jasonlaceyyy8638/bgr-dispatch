import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import PrintButton from './PrintButton';

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Buckeye Garage Door Repair';
const BUSINESS_PHONE = process.env.BUSINESS_PHONE || '937-913-4844';
const BUSINESS_LOCATION = process.env.BUSINESS_LOCATION || 'Dayton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: `Warranty & Service Agreement | ${BUSINESS_NAME}`,
  description: 'Your warranty and service agreement — 90-day labor, 10-year parts. Save or print for your records.',
};

export default async function WarrantyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <p className="text-neutral-500 font-bold uppercase">Service unavailable.</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: job } = await supabase
    .from('jobs')
    .select('id, customer_name, invoice_number, created_at, assigned_tech_id')
    .eq('id', id)
    .single();

  if (!job) notFound();

  let techName: string | null = null;
  if (job.assigned_tech_id) {
    const { data: tech } = await supabase
      .from('tech_users')
      .select('name')
      .eq('id', job.assigned_tech_id)
      .single();
    techName = tech?.name ?? null;
  }

  const invoiceNumber = job.invoice_number || `INV-${String(job.id).padStart(5, '0')}`;
  const serviceDate = job.created_at
    ? new Date(job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen bg-black text-white print:bg-white print:text-black">
      <article className="max-w-2xl mx-auto p-6 sm:p-10 print:p-8 print:max-w-none">
        {/* Header: logo, company, contact */}
        <header className="border-b-2 border-red-600 pb-6 mb-8 print:border-red-800">
          <div className="flex flex-col items-center sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start">
              <div className="relative w-48 h-14 sm:w-56 sm:h-16 print:w-52 print:h-14">
                <Image
                  src="/logo.png"
                  alt={BUSINESS_NAME}
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-3 print:text-neutral-600">
                {BUSINESS_NAME}
              </p>
              <p className="text-sm font-semibold text-neutral-400 mt-0.5 print:text-neutral-700">
                {BUSINESS_LOCATION}, Ohio
              </p>
              <a
                href={`tel:${BUSINESS_PHONE.replace(/\D/g, '')}`}
                className="text-base font-bold text-red-600 mt-1 hover:text-red-500 print:text-red-800 print:no-underline"
              >
                {BUSINESS_PHONE}
              </a>
            </div>
            <div className="text-center sm:text-right">
              <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white print:text-black">
                Warranty &amp; Service Agreement
              </h1>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-2 print:text-neutral-600">
                Invoice #{invoiceNumber}
              </p>
              <p className="text-sm text-neutral-400 mt-1 print:text-neutral-700">{serviceDate}</p>
            </div>
          </div>
        </header>

        {/* Customer & tech */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider print:text-neutral-600">
              Customer
            </p>
            <p className="font-bold uppercase text-white mt-1 print:text-black">
              {job.customer_name || '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider print:text-neutral-600">
              Servicing technician
            </p>
            <p className="font-bold text-white mt-1 print:text-black">{techName || '—'}</p>
          </div>
        </div>

        {/* Warranty terms */}
        <section className="space-y-6 text-sm leading-relaxed print:break-inside-avoid">
          <h2 className="text-base font-bold uppercase text-red-600 tracking-wider print:text-red-800">
            Warranty terms
          </h2>

          <div className="space-y-4 text-neutral-300 print:text-neutral-800">
            <p>
              <strong className="text-white print:text-black">Labor warranty (90 days).</strong> We warrant our labor
              for 90 days from the date of service. This covers the work we performed and all labor required to
              restore your garage door system to an operable condition. For example, when we replace a spring, our
              labor warranty includes all labor we perform in connection with that repair—including work on cables,
              torsion tube, drums, and related components—so that the system is returned to safe, operable condition.
              If a component we did not replace later fails, labor to repair that component is not covered under
              this warranty.
            </p>
            <p>
              <strong className="text-white print:text-black">Parts warranty (10 years).</strong> We warrant parts that
              we supplied and installed for 10 years from the date of service. The parts warranty applies only to
              the specific parts we replaced on this service. It does not cover components we did not replace. If
              you experience a defect in a part we installed, we will replace that part at no charge; labor to
              install the replacement may be covered under the labor warranty if within 90 days and related to the
              same repair, otherwise standard labor rates apply.
            </p>
            <p>
              <strong className="text-white print:text-black">Scope.</strong> Warranties are valid only for the parts
              we replaced and the labor we performed on the service date above. Normal wear and tear, misuse,
              modification, or damage from causes outside our control are not covered. To make a warranty claim,
              contact us with your invoice number and a description of the issue.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-neutral-800 text-[10px] font-bold uppercase tracking-wider text-neutral-500 print:border-neutral-400 print:text-neutral-600">
          <p>{BUSINESS_NAME} · {BUSINESS_LOCATION}, OH · {BUSINESS_PHONE}</p>
          <p className="mt-2 text-neutral-600 print:text-neutral-500">
            Save or print this page for your records. Thank you for your business.
          </p>
        </footer>

        <PrintButton />
      </article>
    </div>
  );
}
