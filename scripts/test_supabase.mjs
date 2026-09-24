import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://REDACTED_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'REDACTED_PUBLISHABLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    console.log('Conectando a Supabase vía @supabase/supabase-js...');
    
    const { data: estados, error: errEstados } = await supabase
        .from('cfg_estados_lote')
        .select('id_estado_lote, codigo, nombre')
        .order('orden', { ascending: true });

    if (errEstados) {
        console.error('Error al consultar catálogo:', errEstados.message);
        return;
    }

    console.log('\n1. Consulta de Catálogo (cfg_estados_lote):');
    console.table(estados);

    console.log('\n2. Ejecutando Procedimiento Almacenado RPC: sp_listar_lotes_plano()');
    const { data: lotesPlano, error: errRpc } = await supabase
        .rpc('sp_listar_lotes_plano', { p_id_proyecto: null });

    if (errRpc) {
        console.error('Error ejecutando RPC:', errRpc.message);
    } else {
        console.log(`Procedimiento ejecutado con éxito. Total lotes devueltos: ${lotesPlano ? lotesPlano.length : 0}`);
        if (lotesPlano && lotesPlano.length > 0) {
            console.table(lotesPlano.slice(0, 5));
        }
    }
}

main();

