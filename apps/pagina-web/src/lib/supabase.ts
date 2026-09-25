import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Cliente Supabase resiliente.
 * Las credenciales se inyectan via variables de entorno (.env).
 * Si no estan configuradas, Supabase fallara con error explicito.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
