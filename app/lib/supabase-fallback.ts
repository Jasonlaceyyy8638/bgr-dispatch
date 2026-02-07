/**
 * Fallback when the real supabase client fails to load (e.g. invalid key).
 * No dependency on @supabase/supabase-js so it never throws.
 */

const emptyPromise = Promise.resolve({ data: [], error: null });
const singlePromise = Promise.resolve({ data: null, error: { message: 'Not configured' } });

function chain(): any {
  return new Proxy(emptyPromise, {
    get(t, p) {
      if (p === 'then' || p === 'catch' || p === 'finally') return (t as any)[p].bind(t);
      return chain();
    },
  });
}

function single(): any {
  return new Proxy(singlePromise, {
    get(t, p) {
      if (p === 'then' || p === 'catch' || p === 'finally') return (t as any)[p].bind(t);
      return chain();
    },
  });
}

const from = () =>
  new Proxy(
    {},
    {
      get(_, p) {
        return p === 'single' ? single() : chain();
      },
    }
  );

export const supabase = { from };
export const isSupabaseConfigured = false;
