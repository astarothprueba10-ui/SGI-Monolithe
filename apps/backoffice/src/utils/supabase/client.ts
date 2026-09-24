import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Falta configuracion publica de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
}

export const createBrowserClient = () => createClient(supabaseUrl, supabaseKey);
export const supabase = createBrowserClient();
