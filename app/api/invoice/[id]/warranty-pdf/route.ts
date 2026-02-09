import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { readFile } from 'fs/promises';
import path from 'path';

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Buckeye Garage Door Repair';
const BUSINESS_PHONE = process.env.BUSINESS_PHONE || '937-913-4844';
const BUSINESS_LOCATION = process.env.BUSINESS_LOCATION || 'Dayton';

// Match invoice PDF: red #dc2626, muted #a3a3a3, label #737373, white, green #22c55e, border #262626
const RED = [220, 38, 38] as [number, number, number];
const MUTED = [163, 163, 163] as [number, number, number];
const LABEL = [115, 115, 115] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const BORDER = [38, 38, 38] as [number, number, number];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Invoice id required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : createClient(supabaseUrl, anonKey);

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_name, invoice_number, created_at, assigned_tech_id')
      .eq('id', id.trim())
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

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
    const customerName = job.customer_name || '—';

    const doc = new jsPDF({ unit: 'in', format: 'letter' });
    const margin = 0.6;
    const pageW = 8.5;
    const pageH = 11;
    let y = margin;
    const lineHeight = 0.2;
    const smallLine = 0.14;

    // Black background (match invoice)
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Logo at top (match invoice layout)
    let logoAdded = false;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      const logoBuffer = await readFile(logoPath);
      const logoBase64 = logoBuffer.toString('base64');
      const logoW = 2.2;
      const logoH = 0.65;
      doc.addImage(logoBase64, 'PNG', margin, y, logoW, logoH);
      y += logoH + 0.15;
      logoAdded = true;
    } catch {
      // no logo file, use text
    }

    if (!logoAdded) {
      doc.setFontSize(10);
      doc.setTextColor(...LABEL);
      doc.setFont('helvetica', 'bold');
      doc.text(BUSINESS_NAME, margin, y);
      y += smallLine;
    }

    doc.setDrawColor(...RED);
    doc.setLineWidth(0.03);
    doc.line(0, y + 0.1, pageW, y + 0.1);
    y += lineHeight + 0.15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`${BUSINESS_LOCATION}, Ohio · ${BUSINESS_PHONE}`, margin, y);
    y += smallLine;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.setFontSize(18);
    doc.text('Warranty & Service Agreement', margin, y);
    y += lineHeight;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`Invoice #${invoiceNumber}`, margin, y);
    y += smallLine;
    doc.text(serviceDate, margin, y);
    y += lineHeight * 1.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...LABEL);
    doc.text('Customer', margin, y);
    doc.text('Servicing technician', margin + 3.5, y);
    y += smallLine;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...WHITE);
    doc.text(customerName, margin, y);
    doc.text(techName || '—', margin + 3.5, y);
    y += lineHeight * 1.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...RED);
    doc.text('Warranty terms', margin, y);
    y += lineHeight;

    const terms = [
      'Labor warranty (90 days). We warrant our labor for 90 days from the date of service. This covers the work we performed and all labor required to restore your garage door system to an operable condition. For example, when we replace a spring, our labor warranty includes all labor we perform in connection with that repair—including work on cables, torsion tube, drums, and related components—so that the system is returned to safe, operable condition. If a component we did not replace later fails, labor to repair that component is not covered under this warranty.',
      'Parts warranty (10 years). We warrant parts that we supplied and installed for 10 years from the date of service. The parts warranty applies only to the specific parts we replaced on this service. It does not cover components we did not replace. If you experience a defect in a part we installed, we will replace that part at no charge; labor to install the replacement may be covered under the labor warranty if within 90 days and related to the same repair, otherwise standard labor rates apply.',
      'Scope. Warranties are valid only for the parts we replaced and the labor we performed on the service date above. Normal wear and tear, misuse, modification, or damage from causes outside our control are not covered. To make a warranty claim, contact us with your invoice number and a description of the issue.',
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const maxWidth = pageW - margin * 2;
    for (const paragraph of terms) {
      const lines = doc.splitTextToSize(paragraph, maxWidth);
      for (const line of lines) {
        if (y > pageH - margin - 0.5) {
          doc.addPage();
          doc.setFillColor(0, 0, 0);
          doc.rect(0, 0, pageW, pageH, 'F');
          y = margin;
        }
        doc.text(line, margin, y);
        y += smallLine;
      }
      y += smallLine * 0.5;
    }

    y += lineHeight;
    if (y > pageH - margin - 0.5) {
      doc.addPage();
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, pageW, pageH, 'F');
      y = margin;
    }
    doc.setDrawColor(...BORDER);
    doc.line(margin, y, pageW - margin, y);
    y += lineHeight;
    doc.setFontSize(8);
    doc.setTextColor(...LABEL);
    doc.text(`${BUSINESS_NAME} · ${BUSINESS_LOCATION}, OH · ${BUSINESS_PHONE}`, margin, y);
    y += smallLine;
    doc.text('Save or print this document for your records. Thank you for your business.', margin, y);

    const filename = `warranty-invoice-${invoiceNumber.replace(/\s/g, '-')}.pdf`;
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (e) {
    console.error('Warranty PDF error:', e);
    return NextResponse.json({ error: 'Failed to generate warranty PDF' }, { status: 500 });
  }
}
