'use client';

export default function PrintButton() {
  return (
    <div className="mt-10 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="px-6 py-3 bg-red-600 hover:bg-red-500 font-bold uppercase text-xs text-white rounded-sm transition-colors"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
