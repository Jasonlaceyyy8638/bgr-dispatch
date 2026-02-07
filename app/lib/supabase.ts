import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// No-op chain: any .from().select().eq() etc. returns a thenable that resolves to empty data (never throws)
function noopChain(): any {
  const resolved = Promise.resolve({ data: [], error: null })
  return new Proxy(resolved, {
    get(_, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return resolved[prop].bind(resolved)
      return noopChain
    },
  })
}

function noopSingle(): any {
  const resolved = Promise.resolve({ data: null, error: { message: 'Not configured' } })
  return new Proxy(resolved, {
    get(_, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') return resolved[prop].bind(resolved)
      return noopChain
    },
  })
}

function createNoopClient(): SupabaseClient {
  return {
    from: () =>
      new Proxy(
        {},
        {
          get(_, prop) {
            return prop === 'single' ? noopSingle : noopChain
          },
        }
      ),
  } as unknown as SupabaseClient
}

let _client: SupabaseClient
try {
  const url = supabaseUrl || 'https://placeholder.supabase.co'
  const key = supabaseKey || 'placeholder-anon-key'
  _client = createClient(url, key)
} catch {
  _client = createNoopClient()
}

export const supabase = _client