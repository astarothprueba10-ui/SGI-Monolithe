-- El número visible del lote se reinicia por manzana.
BEGIN;
ALTER TABLE public.inm_lotes DROP CONSTRAINT IF EXISTS chk_los_cocos_numero_01_75;
DROP INDEX IF EXISTS public.ux_los_cocos_numero_unico_activo;
-- Se conservan uk_inm_lotes_manzana_numero y uk_inm_lotes_codigo.
COMMIT;
