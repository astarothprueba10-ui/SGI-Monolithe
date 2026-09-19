import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://agrytrijoibwasaezedc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncnl0cmlqb2lid2FzYWV6ZWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTkxMTAsImV4cCI6MjA5NTM5NTExMH0.-3Uft_OR_gPAyJnKCP3QKxJ42lq2_dUvxOqUchxT3F0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
