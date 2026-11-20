WITH cuenta AS MATERIALIZED (
    SELECT id_usuario, usuario_login
      FROM public.seg_usuarios
     WHERE usuario_login = 'REEMPLAZA_POR_EL_USUARIO_LOGIN'
     FOR NO KEY UPDATE
), codigo AS MATERIALIZED (
    SELECT id_usuario, usuario_login, gen_random_uuid()::text AS valor
      FROM cuenta
), emitido AS (
    INSERT INTO auth_mfa.estado (id_usuario, activacion_hash, activacion_expira)
    SELECT id_usuario, sha256(convert_to(replace(valor, '-', ''), 'UTF8')),
           CURRENT_TIMESTAMP + INTERVAL '24 hours'
      FROM codigo
    ON CONFLICT (id_usuario) DO UPDATE
        SET activacion_hash = EXCLUDED.activacion_hash,
            activacion_expira = EXCLUDED.activacion_expira,
            reto_hash = NULL,
            reto_expira = NULL,
            version_reto = NULL,
            password_reto_hash = NULL,
            portal = NULL,
            pendiente_cifrado = NULL,
            pendiente_recuperacion_hash = NULL
      WHERE auth_mfa.estado.secreto_cifrado IS NULL
    RETURNING id_usuario, activacion_expira
)
SELECT c.usuario_login, c.valor AS codigo_activacion, e.activacion_expira
  FROM emitido e
  JOIN codigo c USING (id_usuario);
