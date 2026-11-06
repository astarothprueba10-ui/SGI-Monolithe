import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const configValida =
  /^https?:\/\/[^<>\s]+$/i.test(supabaseUrl) &&
  supabaseAnonKey.length > 0 &&
  !supabaseAnonKey.includes('<');

// Sin valores de desarrollo, la interfaz de login y los módulos que utilizan
// otras APIs deben seguir cargando. El servidor de loopback rechaza conexiones:
// NO conecta con Supabase ni permite guardar datos en una base compartida.
if (!configValida && import.meta.env.DEV) {
  console.warn(
    'Supabase no está configurado en este entorno local. ' +
    'Las funciones que dependen de Supabase no estarán disponibles.'
  );
}

// Producción exige configuración explícita; nunca usar el valor de QA allí.
if (!configValida && !import.meta.env.DEV) {
  throw new Error('Falta la configuración pública de Supabase en el Backoffice.');
}

export const supabase: SupabaseClient = createClient(
  configValida ? supabaseUrl : 'http://127.0.0.1:1',
  configValida ? supabaseAnonKey : 'supabase-no-configurado-local'
);
