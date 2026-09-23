const { createClient } = require('../apps/admin-dashboard/node_modules/@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://REDACTED_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'REDACTED_PUBLISHABLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyPersistedLead() {
  console.log('🔍 Consultando el lead recién insertado en cms_consultas_web...');
  const { data, error } = await supabase
    .from('cms_consultas_web')
    .select('id_consulta_web, id_estado_consulta_web, codigo, nombres, correo, telefono, mensaje, fecha_recepcion')
    .order('id_consulta_web', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error al leer con anon key:', error.message);
  } else {
    console.log(`✅ Registros encontrados en Supabase (${data.length}):`);
    console.table(data);
  }
}

verifyPersistedLead();
