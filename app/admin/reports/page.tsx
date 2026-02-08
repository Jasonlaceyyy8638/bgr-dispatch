'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tx = { id: string; name: string; tech: string; amountNum: number };

export default function AdminReportsPage() {
  const router = useRouter();
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [txs, setTxs] = useState<Tx[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pdfExporting, setPdfExporting] = useState<'revenue' | 'jobs' | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('tech_user') || '{}');
      if (user.role !== 'admin') {
        router.replace('/');
        return;
      }
      setAllowed(true);
    } catch {
      router.replace('/');
    }
  }, [router]);

  async function loadReport() {
    if (!from || !to) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const json = await res.json();
      setTxs(json.txs ?? []);
      setTotalRevenue(Number(json.totalRevenue) || 0);
      setTotalCost(Number(json.totalCost) || 0);
      setNetProfit(Number(json.netProfit) ?? 0);
    } catch {
      setTxs([]);
      setTotalRevenue(0);
      setTotalCost(0);
      setNetProfit(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed && from && to) loadReport();
  }, [allowed, from, to]);

  const byTech = txs.reduce((acc, t) => {
    const tech = t.tech || 'Unassigned';
    if (!acc[tech]) acc[tech] = { revenue: 0, count: 0 };
    acc[tech].revenue += t.amountNum;
    acc[tech].count += 1;
    return acc;
  }, {} as Record<string, { revenue: number; count: number }>);

  async function buildPdfHeader(doc: any, companyName: string, companyPhone: string, logoDataUrl: string | null, pageW: number, headerH: number) {
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageW, headerH, 'F');
    const left = 40;
    let y = 20;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', left, 12, 200, 56);
        y = 76;
      } catch {
        y = 28;
      }
    } else {
      y = 28;
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName.toUpperCase(), left, y);
    y += 10;
    if (companyPhone) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(companyPhone, left, y);
    }
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(2);
    doc.line(0, headerH, pageW, headerH);
  }

  function openOrDownloadPdf(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window);
    if (isMobile) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } else {
      window.open(url, '_blank');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function fillDarkBody(doc: any, pageW: number, headerH: number) {
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(23, 23, 23);
    doc.rect(0, headerH, pageW, pageH - headerH, 'F');
    doc.setTextColor(255, 255, 255);
  }

  async function downloadReportPdf() {
    setExportError(null);
    setPdfExporting('revenue');
    try {
      const origin = window.location.origin;
      const [settingsRes, logoRes] = await Promise.all([
        fetch(`${origin}/api/settings`),
        fetch(`${origin}/logo.png`).catch(() => null),
      ]);
      const settings = settingsRes.ok ? await settingsRes.json().catch(() => ({})) : {};
      const companyName = (settings.company_name || 'BGR').toString().trim() || 'BGR';
      const companyPhone = (settings.company_phone || '').toString().trim();
      let logoDataUrl: string | null = null;
      if (logoRes?.ok) {
        const logoBlob = await logoRes.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoBlob);
        });
      }

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const headerH = 96;

      await buildPdfHeader(doc, companyName, companyPhone, logoDataUrl, pageW, headerH);
      fillDarkBody(doc, pageW, headerH);

      let y = headerH + 20;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const generatedOn = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      doc.text(`Generated on ${generatedOn}`, 40, y);
      y += 14;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Report', 40, y);
      y += 20;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${from} to ${to}`, 40, y);
      y += 16;

      doc.setFont('helvetica', 'bold');
      doc.text(`Revenue: $${totalRevenue.toFixed(2)}  |  Cost: $${totalCost.toFixed(2)}  |  Net: $${netProfit.toFixed(2)}  |  Jobs: ${txs.length}`, 40, y);
      y += 24;

      if (Object.keys(byTech).length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('By tech', 40, y);
        y += 8;
        autoTable(doc, {
          startY: y,
          head: [['Tech', 'Jobs', 'Revenue']],
          body: Object.entries(byTech).map(([tech, { count, revenue }]) => [tech, String(count), `$${revenue.toFixed(2)}`]),
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
          bodyStyles: { fillColor: [35, 35, 35], textColor: [255, 255, 255] },
          margin: { left: 40 },
          columnStyles: { 2: { halign: 'right', textColor: [220, 38, 38] } },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      if (txs.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Transactions', 40, y);
        y += 8;
        autoTable(doc, {
          startY: y,
          head: [['Customer', 'Tech', 'Amount']],
          body: txs.slice(0, 100).map((t) => [t.name || '—', t.tech || '—', `$${t.amountNum.toFixed(2)}`]),
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
          bodyStyles: { fillColor: [35, 35, 35], textColor: [255, 255, 255] },
          margin: { left: 40 },
          columnStyles: { 2: { halign: 'right', textColor: [220, 38, 38] } },
        });
      }

      const blob = doc.output('blob');
      openOrDownloadPdf(blob, `revenue-report-${from}-to-${to}.pdf`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'PDF download failed.');
    } finally {
      setPdfExporting(null);
    }
  }

  async function downloadJobsPdf() {
    setExportError(null);
    setPdfExporting('jobs');
    try {
      const origin = window.location.origin;
      const [settingsRes, logoRes, jobsRes] = await Promise.all([
        fetch(`${origin}/api/settings`),
        fetch(`${origin}/logo.png`).catch(() => null),
        fetch(`${origin}/api/export?type=jobs&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=json`),
      ]);
      const settings = settingsRes.ok ? await settingsRes.json().catch(() => ({})) : {};
      const companyName = (settings.company_name || 'BGR').toString().trim() || 'BGR';
      const companyPhone = (settings.company_phone || '').toString().trim();
      let logoDataUrl: string | null = null;
      if (logoRes?.ok) {
        const logoBlob = await logoRes.blob();
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoBlob);
        });
      }
      if (!jobsRes.ok) {
        const err = await jobsRes.json().catch(() => ({}));
        setExportError(err?.error || 'Could not load jobs.');
        setPdfExporting(null);
        return;
      }
      const { jobs } = await jobsRes.json();
      const jobList = Array.isArray(jobs) ? jobs : [];

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const headerH = 96;
      await buildPdfHeader(doc, companyName, companyPhone, logoDataUrl, pageW, headerH);
      fillDarkBody(doc, pageW, headerH);

      let y = headerH + 20;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const generatedOn = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      doc.text(`Generated on ${generatedOn}`, 40, y);
      y += 14;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Jobs Report', 40, y);
      y += 18;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${from} to ${to}  ·  ${jobList.length} job${jobList.length !== 1 ? 's' : ''}`, 40, y);
      y += 20;

      if (jobList.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Customer', 'Address', 'Status', 'Tech', 'Amount']],
          body: jobList.slice(0, 150).map((j: any) => [
            (j.customer || '—').slice(0, 24),
            (j.address || j.city || '—').slice(0, 28),
            (j.status || '—').slice(0, 12),
            (j.tech || '—').slice(0, 14),
            j.paymentAmount != null && j.paymentAmount !== '' ? `$${Number(j.paymentAmount).toFixed(2)}` : j.price != null && j.price !== '' ? `$${Number(j.price).toFixed(2)}` : '—',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 8 },
          bodyStyles: { fillColor: [35, 35, 35], textColor: [255, 255, 255], fontSize: 8 },
          margin: { left: 40 },
          columnStyles: { 4: { halign: 'right', textColor: [220, 38, 38] } },
        });
      }

      const blob = doc.output('blob');
      openOrDownloadPdf(blob, `jobs-report-${from}-to-${to}.pdf`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'PDF download failed.');
    } finally {
      setPdfExporting(null);
    }
  }

  const inputClass = 'w-full bg-black border border-neutral-800 p-3 text-white font-semibold text-sm outline-none focus:border-red-600 rounded-sm min-h-[44px]';

  if (allowed !== true) return null;

  return (
    <div className="max-w-4xl mx-auto px-0 sm:px-0 pb-24 sm:pb-8">
      <div className="mb-4 sm:mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-xl sm:text-4xl font-bold uppercase text-white tracking-tight">
          Reports <span className="text-red-600"> & export</span>
        </h1>
        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
          Revenue by period, by tech · Export CSV
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">From date</label>
          <input
            type="date"
            className={inputClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">To date</label>
          <input
            type="date"
            className={inputClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500 font-bold uppercase animate-pulse py-8">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Revenue</p>
              <p className="text-lg sm:text-xl font-bold text-green-500 mt-1">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Cost</p>
              <p className="text-lg sm:text-xl font-bold text-neutral-400 mt-1">${totalCost.toFixed(2)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Net</p>
              <p className="text-lg sm:text-xl font-bold text-white mt-1">${netProfit.toFixed(2)}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 p-3 sm:p-4 rounded-sm text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Jobs</p>
              <p className="text-lg sm:text-xl font-bold text-red-600 mt-1">{txs.length}</p>
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <h2 className="text-sm font-bold uppercase text-white tracking-wider mb-2 sm:mb-3">By tech</h2>
            <div className="bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden">
              {Object.entries(byTech).length === 0 ? (
                <p className="p-4 text-neutral-500 text-sm uppercase">No closed jobs in range</p>
              ) : (
                <ul className="divide-y divide-neutral-800">
                  {Object.entries(byTech).map(([tech, { revenue, count }]) => (
                    <li key={tech} className="flex justify-between items-center p-3 sm:p-4 gap-2 min-h-[48px] touch-manipulation">
                      <span className="font-bold text-white uppercase text-sm truncate">{tech}</span>
                      <span className="text-neutral-400 text-xs sm:text-sm shrink-0">{count} job{count !== 1 ? 's' : ''} · ${revenue.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {exportError && (
            <p className="text-red-500 text-sm font-bold uppercase mb-2">{exportError}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <button
              type="button"
              onClick={downloadReportPdf}
              disabled={!!pdfExporting || loading}
              className="w-full sm:w-auto inline-flex justify-center items-center min-h-[48px] px-6 bg-green-700 hover:bg-green-600 text-white font-bold uppercase text-sm tracking-wider rounded-sm touch-manipulation disabled:opacity-50"
            >
              {pdfExporting === 'revenue' ? 'Creating PDF…' : 'Download revenue as PDF'}
            </button>
            <button
              type="button"
              onClick={downloadJobsPdf}
              disabled={!!pdfExporting || loading}
              className="w-full sm:w-auto inline-flex justify-center items-center min-h-[48px] px-6 bg-neutral-800 hover:bg-neutral-700 text-white font-bold uppercase text-sm tracking-wider rounded-sm touch-manipulation disabled:opacity-50"
            >
              {pdfExporting === 'jobs' ? 'Creating PDF…' : 'Download jobs as PDF'}
            </button>
          </div>
        </>
      )}

      <Link href="/admin/techs" className="inline-block mt-6 text-[10px] font-bold uppercase text-neutral-500 hover:text-white touch-manipulation">
        ← User Mgmt
      </Link>
    </div>
  );
}
