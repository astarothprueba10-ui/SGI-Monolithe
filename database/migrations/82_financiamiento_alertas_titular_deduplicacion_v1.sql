-- SGI-MONOLITHE | Sprint 4 / 5.2.6
-- Seguridad de destinatario: una notificación financiera es única también
-- por persona titular. Cambios de titular nunca reactivan avisos del anterior.
-- No modifica filas existentes; la reconciliación posterior desactiva
-- las claves antiguas FIN_CUOTA:... que ya no coincidan.
DO $patch$
DECLARE
 v_def text;
 v_old_match text:='n.clave_deduplicacion=concat(''FIN_CUOTA:'',x.id_cuota,'':'',x.tipo_alerta,'':'',';
 v_new_match text:='n.clave_deduplicacion=concat(''FIN_CUOTA:'',x.id_persona,'':'',x.id_cuota,'':'',x.tipo_alerta,'':'',';
 v_old_create text:='v_clave:=concat(''FIN_CUOTA:'',v_r.id_cuota,'':'',v_r.tipo_alerta,'':'',';
 v_new_create text:='v_clave:=concat(''FIN_CUOTA:'',v_r.id_persona,'':'',v_r.id_cuota,'':'',v_r.tipo_alerta,'':'',';
BEGIN
 SELECT pg_get_functiondef(oid) INTO STRICT v_def
 FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname='sp_fin_preparar_avisos_portal_v1';
 IF strpos(v_def,v_old_match)=0 OR strpos(v_def,v_old_create)=0 THEN
   RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|El generador de avisos difiere de la version auditada.';
 END IF;
 v_def:=replace(v_def,v_old_match,v_new_match);
 v_def:=replace(v_def,v_old_create,v_new_create);
 EXECUTE v_def;
END;
$patch$;
