const { createClient } = require('../apps/backoffice/node_modules/@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Variables SUPABASE_URL y SUPABASE_ANON_KEY requeridas.');
  console.error('Ejecuta: source .env && node scripts/check_db_tables.cjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyPersistedLead() {
  console.log('Consultando el lead mas reciente en cms_consultas_web...');
  const { data, error } = await supabase
    .from('cms_consultas_web')
    .select('id_consulta_web, id_estado_consulta_web, codigo, nombres, correo, telefono, mensaje, fecha_recepcion')
    .order('id_consulta_web', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error al leer con anon key:', error.message);
  } else {
    console.log(`Registros encontrados en Supabase (${data.length}):`);
    console.table(data);
  }
}

verifyPersistedLead();
