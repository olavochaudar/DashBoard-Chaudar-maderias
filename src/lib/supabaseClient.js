import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

const globalKey = '__chaudar_supabase__';

function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey);
}

export const supabase = globalThis[globalKey] ?? createSupabaseClient();

if (import.meta.env.DEV) {
  globalThis[globalKey] = supabase;
}
