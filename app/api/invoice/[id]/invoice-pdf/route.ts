import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import { readFile } from 'fs/promises';
import path from 'path';

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Buckeye Garage Door Repair';
const BUSINESS_PHONE = process.env.BUSINESS_PHONE || '937-913-4844';
const BUSINESS_LOCATION = process.env.BUSINESS_LOCATION || 'Dayton';

// Match email receipt: black background, white text, red accents
const RED = [220, 38, 38] as [number, number, number];
const BG = [0, 0, 0] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const LIGHT = [240, 240, 240] as [number, number, number];
const MUTED = [200, 200, 200] as [number, number, number];
const LABEL = [180, 180, 180] as [number, number, number];
const GREEN = [34, 197, 94] as [number, number, number];
const BORDER = [50, 50, 50] as [number, number, number];

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
      .select(
        'id, customer_name, invoice_number, created_at, service_type, job_description, price, tax_amount, taxable, payment_method, payment_amount, check_number, status, signature_data'
      )
      .eq('id', id.trim())
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const invoiceNumber = job.invoice_number || `INV-${String(job.id).padStart(5, '0')}`;
    const total = Number(job.payment_amount ?? job.price ?? 0);
    const taxAmount = Number(job.tax_amount ?? 0);
    const subtotal = total - taxAmount;
    const serviceDate = job.created_at
      ? new Date(job.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';
    const invoiceContent = job.service_type || job.job_description || 'No invoice details.';

    const doc = new jsPDF({ unit: 'in', format: 'letter' });
    const margin = 0.5;
    const pageW = 8.5;
    const pageH = 11;
    let y = margin;
    const lineHeight = 0.18;
    const smallLine = 0.14;
    const sectionGap = 0.22;

    function fillPageBg() {
      doc.setFillColor(...BG);
      doc.rect(0, 0, pageW, pageH, 'F');
    }
    fillPageBg();

    // Logo at top: centered, strict aspect ratio (uniform scale to fit)
    let logoAdded = false;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      const logoBuffer = await readFile(logoPath);
      const logoBase64 = logoBuffer.toString('base64');
      let wPx = 400;
      let hPx = 120;
      const isJpeg = logoBuffer[0] === 0xff && logoBuffer[1] === 0xd8;
      if (isJpeg) {
        for (let i = 0; i < logoBuffer.length - 9; i++) {
          if (logoBuffer[i] === 0xff && (logoBuffer[i + 1] === 0xc0 || logoBuffer[i + 1] === 0xc1)) {
            hPx = logoBuffer.readUInt16BE(i + 5);
            wPx = logoBuffer.readUInt16BE(i + 7);
            break;
          }
        }
      } else {
        const ihdr = logoBuffer.indexOf(Buffer.from([73, 72, 68, 82]));
        if (ihdr >= 0) {
          wPx = logoBuffer.readUInt32BE(ihdr + 4);
          hPx = logoBuffer.readUInt32BE(ihdr + 8);
        } else if (logoBuffer.length >= 24) {
          wPx = logoBuffer.readUInt32BE(16);
          hPx = logoBuffer.readUInt32BE(20);
        }
      }
      if (wPx < 1 || wPx > 5000) wPx = 400;
      if (hPx < 1 || hPx > 5000) hPx = 120;
      const maxLogoW = 1.5;
      const maxLogoH = 1.25;
      const wIn = wPx / 72;
      const hIn = hPx / 72;
      const scale = Math.min(maxLogoW / wIn, maxLogoH / hIn, 1);
      const logoW = wIn * scale;
      const logoH = hIn * scale;
      const logoX = (pageW - logoW) / 2;
      doc.addImage(logoBase64, isJpeg ? 'JPEG' : 'PNG', logoX, y, logoW, logoH);
      y += logoH + 0.35;
      logoAdded = true;
    } catch {
      // no logo file
    }
    if (!logoAdded) {
      doc.setFontSize(10);
      doc.setTextColor(...LIGHT);
      doc.setFont('helvetica', 'bold');
      doc.text(BUSINESS_NAME, margin, y);
      y += smallLine + 0.2;
    }

    y += 0.1;
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.03);
    doc.line(margin, y, pageW - margin, y);
    y += sectionGap;

    // Company name (match email: BUCKEYE GARAGE DOOR REPAIR)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(BUSINESS_NAME.toUpperCase(), margin, y);
    y += smallLine + 0.02;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(`Invoice ${invoiceNumber}`, margin, y);
    y += smallLine + 0.02;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    doc.setFontSize(11);
    doc.text(`${BUSINESS_LOCATION.toUpperCase()}, OHIO`, margin, y);
    y += smallLine + 0.02;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...WHITE);
    doc.setFontSize(10);
    doc.text(BUSINESS_PHONE, margin, y);
    y += sectionGap;

    // "THANK YOU FOR YOUR BUSINESS" + total (no red box; total in red text)
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.02);
    doc.rect(margin, y - 0.06, pageW - margin * 2, 0.4, 'S');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('THANK YOU FOR YOUR BUSINESS', margin + 0.12, y + 0.1);
    doc.setFontSize(20);
    doc.setTextColor(...RED);
    doc.text(`$${total.toFixed(2)}`, margin + 0.12, y + 0.32);
    y += 0.5;

    // Customer & date
    doc.setFontSize(9);
    doc.setTextColor(...LABEL);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer', margin, y);
    doc.text('Date', margin + 3.5, y);
    y += smallLine + 0.02;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...LIGHT);
    doc.text(job.customer_name || '—', margin, y);
    doc.text(serviceDate, margin + 3.5, y);
    y += sectionGap;

    // Details (invoice content)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...LABEL);
    doc.text('Details', margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...LIGHT);
    const maxWidth = pageW - margin * 2;
    const contentLines = doc.splitTextToSize(invoiceContent, maxWidth);
    for (const line of contentLines) {
      if (y > pageH - margin - 0.4) {
        doc.addPage();
        fillPageBg();
        y = margin;
      }
      doc.text(line, margin, y);
      y += smallLine;
    }
    y += sectionGap * 0.8;

    // Customer signature (if saved when job was authorized — run ALTER TABLE jobs ADD COLUMN signature_data text; in Supabase)
    const signatureData = (job as { signature_data?: string | null }).signature_data;
    if (signatureData && typeof signatureData === 'string' && signatureData.startsWith('data:image')) {
      if (y > pageH - margin - 1.2) {
        doc.addPage();
        fillPageBg();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...LABEL);
      doc.text('Customer signature', margin, y);
      y += smallLine + 0.04;
      try {
        const sigW = 3.2;
        const sigH = 0.9;
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y, sigW, sigH, 'F');
        doc.setDrawColor(...MUTED);
        doc.setLineWidth(0.02);
        doc.rect(margin, y, sigW, sigH, 'S');
        doc.addImage(signatureData, 'PNG', margin, y, sigW, sigH);
        y += sigH + sectionGap * 0.8;
      } catch (err) {
        console.error('Invoice PDF signature image error:', err);
        y += lineHeight;
      }
    }

    // Payment section if present
    if (job.payment_method || job.payment_amount != null) {
      if (y > pageH - margin - 0.6) {
        doc.addPage();
        fillPageBg();
        y = margin;
      }
      y += sectionGap * 0.3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...LABEL);
      doc.text('Payment', margin, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (job.payment_method) {
        doc.setTextColor(...LIGHT);
        doc.text(`Method: ${String(job.payment_method).toUpperCase()}`, margin, y);
        y += smallLine;
      }
      if (job.payment_amount != null || total > 0) {
        doc.setTextColor(...LABEL);
        doc.text('Amount:', margin, y);
        doc.setTextColor(...GREEN);
        doc.text(`$${total.toFixed(2)}`, margin + 1.2, y);
        doc.setTextColor(...LIGHT);
        y += smallLine;
      }
      if (job.payment_method?.toLowerCase() === 'check' && job.check_number) {
        doc.setTextColor(...LIGHT);
        doc.text(`Check #: ${job.check_number}`, margin, y);
        y += smallLine;
      }
      y += sectionGap * 0.3;
    }

    // Subtotal / Tax / Total (matching app)
    if (job.taxable && taxAmount > 0) {
      if (y > pageH - margin - 0.6) {
        doc.addPage();
        fillPageBg();
        y = margin;
      }
      doc.setDrawColor(...BORDER);
      doc.line(margin, y, pageW - margin, y);
      y += lineHeight;
      doc.setTextColor(...LABEL);
      doc.text('Subtotal', margin, y);
      doc.setTextColor(...LIGHT);
      doc.text(`$${subtotal.toFixed(2)}`, pageW - margin - 1, y);
      y += smallLine;
      doc.setTextColor(...LABEL);
      doc.text('Tax', margin, y);
      doc.setTextColor(...LIGHT);
      doc.text(`$${taxAmount.toFixed(2)}`, pageW - margin - 1, y);
      y += lineHeight;
    }

    if (y > pageH - margin - 0.35) {
      doc.addPage();
      fillPageBg();
      y = margin;
    }
    doc.setDrawColor(...BORDER);
    doc.line(margin, y, pageW - margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...LABEL);
    doc.text('Total', margin, y);
    doc.setFontSize(16);
    doc.setTextColor(...GREEN);
    doc.text(`$${total.toFixed(2)}`, pageW - margin - 1.1, y);

    y += lineHeight * 1.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...LABEL);
    doc.text(`${BUSINESS_NAME} · ${BUSINESS_LOCATION}, OH · ${BUSINESS_PHONE}`, margin, y);

    const filename = `invoice-${invoiceNumber.replace(/\s/g, '-')}.pdf`;
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
    console.error('Invoice PDF error:', e);
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
