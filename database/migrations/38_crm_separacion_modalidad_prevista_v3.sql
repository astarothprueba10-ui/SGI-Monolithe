-- SGI MONOLITHE | Contrato de separacion: registrar modalidad de venta prevista.
-- La modalidad prevista no equivale a un plan de cuotas aprobado.
-- v3 reutiliza toda la validacion existente de v2 y actualiza en la misma
-- transaccion el campo ven_reservas.modalidad_prevista.
-- Se mantiene v2 para compatibilidad con integraciones existentes.
CREATE OR REPLACE FUNCTION public.sp_crm_registrar_separacion_v3(
    p_actor bigint,
    p_prospecto bigint,
    p_lote bigint,
    p_metodo_pago character varying,
    p_numero_operacion character varying,
    p_monto numeric,
    p_observaciones text,
    p_clave_archivo character varying,
    p_nombre_archivo character varying,
    p_tipo_mime character varying,
    p_tamanio_bytes bigint,
    p_hash_sha256 character varying,
    p_modalidad_prevista character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_resultado jsonb;
    v_id_reserva bigint;
BEGIN
    IF p_modalidad_prevista IS NULL
       OR p_modalidad_prevista NOT IN ('CONTADO', 'FINANCIADA') THEN
        RAISE EXCEPTION 'DATOS_INVALIDOS|Seleccione la modalidad de venta prevista (CONTADO o FINANCIADA).';
    END IF;

    -- La validacion de cartera, lotes, precio, archivo, monto S/ 500,
    -- anti duplicados y reserva concurrente sigue centralizada en v2.
    v_resultado := public.sp_crm_registrar_separacion_v2(
        p_actor, p_prospecto, p_lote, p_metodo_pago,
        p_numero_operacion, p_monto, p_observaciones, p_clave_archivo,
        p_nombre_archivo, p_tipo_mime, p_tamanio_bytes, p_hash_sha256
    );

    v_id_reserva := NULLIF(v_resultado->>'id_reserva', '')::bigint;
    IF v_id_reserva IS NULL THEN
        RAISE EXCEPTION 'REGISTRO_INCOMPLETO|La separacion no devolvio un identificador valido.';
    END IF;

    UPDATE public.ven_reservas
       SET modalidad_prevista = p_modalidad_prevista,
           fecha_actualizacion = now()
     WHERE id_reserva = v_id_reserva
       AND id_lote = p_lote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'REGISTRO_INCOMPLETO|No se encontro la separacion para almacenar la modalidad.';
    END IF;

    RETURN v_resultado || jsonb_build_object(
        'modalidad_prevista', p_modalidad_prevista
    );
END;
$function$;

-- Seguridad: solo el rol interno de la aplicacion puede ejecutar esta RPC.
REVOKE ALL ON FUNCTION public.sp_crm_registrar_separacion_v3(
    bigint, bigint, bigint, character varying, character varying, numeric,
    text, character varying, character varying, character varying, bigint,
    character varying, character varying
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sp_crm_registrar_separacion_v3(
    bigint, bigint, bigint, character varying, character varying, numeric,
    text, character varying, character varying, character varying, bigint,
    character varying, character varying
) TO sigi_app_user;
