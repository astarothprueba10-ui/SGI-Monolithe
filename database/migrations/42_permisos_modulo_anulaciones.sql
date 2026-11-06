-- SGI MONOLITHE | Modulo de Anulaciones con matriz y funciones independientes.
-- Los codigos de web_content se conservan; solo cambia la etiqueta en frontend.
-- No se concede autorizacion a otros roles ni al rol CLIENTE.

-- La sincronizacion automatica de Gerencia NO debe habilitar dictamenes
-- independientes financieros ni legales, aunque se creen nuevos permisos.
DO $guard$
DECLARE v_def text;
BEGIN
    SELECT pg_get_functiondef(oid) INTO STRICT v_def FROM pg_proc
    WHERE pronamespace='public'::regnamespace
      AND proname='fn_sincronizar_permiso_gerencia';
    IF strpos(v_def, $old$IF NEW.codigo='sales.legal.review' THEN$old$)>0 THEN
        v_def := replace(v_def,
            $old$IF NEW.codigo='sales.legal.review' THEN$old$,
            $new$IF NEW.codigo IN (
                'sales.legal.review',
                'annulments.review_finance',
                'annulments.review_legal'
            ) THEN$new$);
        EXECUTE v_def;
    ELSIF strpos(v_def, 'annulments.review_legal')=0 THEN
        RAISE EXCEPTION 'MIGRACION_INCOMPATIBLE|Se modifico sincronizacion de Gerencia.';
    END IF;
END
$guard$;

INSERT INTO public.seg_permisos
    (codigo, modulo, recurso, accion, nombre, descripcion, activo)
VALUES
    ('annulments.view', 'annulments', 'requests', 'view',
     'Ver anulaciones', 'Consultar solicitudes y expedientes autorizados.', true),
    ('annulments.create', 'annulments', 'requests', 'create',
     'Solicitar anulación', 'Registrar solicitudes de anulación comercial.', true),
    ('annulments.approve', 'annulments', 'requests', 'approve',
     'Aprobar anulaciones', 'Iniciar y derivar revisiones o aprobar solicitudes de Gerencia, sin ejecutar la anulación.', true),
    ('annulments.reject', 'annulments', 'requests', 'reject',
     'Rechazar anulaciones', 'Rechazar solicitudes por decisión de Gerencia.', true),
    ('annulments.review_finance', 'annulments', 'reviews', 'review_finance',
     'Dictamen financiero', 'Revisión independiente por Finanzas.', true),
    ('annulments.review_legal', 'annulments', 'reviews', 'review_legal',
     'Dictamen legal', 'Revisión independiente por Asesoría Legal.', true)
ON CONFLICT (codigo) DO UPDATE SET
    modulo=EXCLUDED.modulo,
    recurso=EXCLUDED.recurso,
    accion=EXCLUDED.accion,
    nombre=EXCLUDED.nombre,
    descripcion=EXCLUDED.descripcion,
    activo=EXCLUDED.activo;

-- Asignaciones iniciales equivalentes al flujo que ya funcionaba, ahora
-- visibles y editables de manera independiente en la matriz de permisos.
INSERT INTO public.seg_roles_permisos (id_rol, id_permiso, activo)
SELECT r.id_rol, p.id_permiso, true
FROM public.seg_roles r CROSS JOIN public.seg_permisos p
WHERE r.activo AND p.activo AND (
    (r.codigo='GERENCIA' AND p.codigo IN (
        'annulments.view','annulments.create','annulments.approve','annulments.reject'))
 OR (r.codigo='ADMINISTRADOR' AND p.codigo IN (
        'annulments.view','annulments.create'))
 OR (r.codigo IN ('ASESOR','SUPERVISOR_COMERCIAL') AND p.codigo IN (
        'annulments.view','annulments.create'))
 OR (r.codigo='FINANZAS' AND p.codigo IN (
        'annulments.view','annulments.review_finance'))
 OR (r.codigo='ASESORIA_LEGAL' AND p.codigo IN (
        'annulments.view','annulments.review_legal'))
)
ON CONFLICT (id_rol,id_permiso) DO UPDATE SET activo=EXCLUDED.activo;

-- Defensa en profundidad: aun en bases con permisos previamente asignados.
UPDATE public.seg_roles_permisos rp
SET activo=false
FROM public.seg_roles r, public.seg_permisos p
WHERE rp.id_rol=r.id_rol AND rp.id_permiso=p.id_permiso
  AND r.codigo='GERENCIA'
  AND p.codigo IN ('annulments.review_finance','annulments.review_legal')
  AND rp.activo;
