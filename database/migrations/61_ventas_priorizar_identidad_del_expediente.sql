-- Preservar la identidad contractual revisada al momento de la venta.
-- Si el comprador cambia sus datos después, la ficha de esta venta conserva
-- el nombre histórico (solo para ventas con snapshot contractual).
DO $patch$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
  WHERE pronamespace='public'::regnamespace
    AND proname='sp_crm_detalle_venta_v1';
  IF strpos(v_def,
      '''nombreCompleto'',trim(concat_ws('' '',per.nombres,per.apellido_paterno,per.apellido_materno))')>0
  THEN
    v_def:=replace(v_def,
      '''nombreCompleto'',trim(concat_ws('' '',per.nombres,per.apellido_paterno,per.apellido_materno))',
      '''nombreCompleto'',coalesce(
          nullif(trim(concat_ws('' '',
            snap.datos_revisados->>''nombres'',
            snap.datos_revisados->>''apellidoPaterno'',
            snap.datos_revisados->>''apellidoMaterno'')),''''),
          trim(concat_ws('' '',per.nombres,per.apellido_paterno,per.apellido_materno)))');
    EXECUTE v_def;
  ELSIF strpos(v_def,'snap.datos_revisados->>''nombres''')=0 THEN
    RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|No se localiza nombre del expediente.';
  END IF;
END $patch$;
