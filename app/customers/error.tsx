'use client';

import Link from 'next/link';

export default function CustomersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto p-6 sm:p-8">
      <div className="bg-neutral-950 border border-red-900/50 rounded-sm p-6 sm:p-8">
        <h2 className="text-lg font-bold uppercase text-red-500 tracking-wider mb-2">
          Something went wrong
        </h2>
        <p className="text-neutral-400 text-sm mb-4">
          The Customers page couldn&apos;t load. This usually happens when Supabase isn&apos;t configured on the live site.
        </p>
        <div className="bg-black border border-neutral-800 rounded-sm p-4 mb-6 text-sm">
          <p className="text-neutral-300 font-semibold uppercase text-[10px] tracking-wider mb-2">
            Fix: Add env vars in Netlify (not just .env.local)
          </p>
          <p className="text-neutral-500 mb-2">
            <strong className="text-neutral-400">.env.local</strong> is only used when you run the app on your computer. Netlify never sees it.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-neutral-500 text-xs">
            <li>Open Netlify → your site → <strong className="text-neutral-400">Site configuration</strong> → <strong className="text-neutral-400">Environment variables</strong>.</li>
            <li>Add <code className="text-red-400/90">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-red-400/90">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (copy the values from your .env.local).</li>
            <li>Go to <strong className="text-neutral-400">Deploys</strong> → <strong className="text-neutral-400">Trigger deploy</strong> → <strong className="text-neutral-400">Deploy site</strong>.</li>
          </ol>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs tracking-wider rounded-sm"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-neutral-600 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider rounded-sm"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
