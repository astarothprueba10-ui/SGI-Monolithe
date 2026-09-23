import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://REDACTED_PROJECT_REF.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

/**
 * Cliente Supabase resiliente.
 * Previene pantallas en blanco ante claves no inicializadas.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

