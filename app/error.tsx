'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-neutral-950 border border-red-900/50 rounded-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold uppercase text-red-500 tracking-wider mb-2">
            Something went wrong
          </h2>
          <p className="text-neutral-400 text-sm mb-4">
            A client-side error occurred. This can happen if Supabase isn&apos;t set up correctly on the live site.
          </p>
          <div className="bg-black border border-neutral-800 rounded-sm p-4 mb-6 text-sm">
            <p className="text-neutral-300 font-semibold uppercase text-[10px] tracking-wider mb-2">
              If you just added env vars in Netlify
            </p>
            <ul className="list-disc list-inside space-y-1 text-neutral-500 text-xs">
              <li>Use the <strong className="text-neutral-400">anon public</strong> key from Supabase (Project Settings → API). It usually starts with <code className="text-red-400/90">eyJ</code>.</li>
              <li>Trigger a new deploy after saving: Deploys → Trigger deploy → Deploy site.</li>
            </ul>
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
