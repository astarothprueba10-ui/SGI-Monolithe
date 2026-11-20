WITH cuenta AS MATERIALIZED (
    SELECT id_usuario, usuario_login
      FROM public.seg_usuarios
     WHERE usuario_login = 'REEMPLAZA_POR_EL_USUARIO_LOGIN'
     FOR NO KEY UPDATE
), retirado AS (
    DELETE FROM auth_mfa.estado e
     USING cuenta c
     WHERE e.id_usuario = c.id_usuario
       AND e.secreto_cifrado IS NOT NULL
    RETURNING e.id_usuario
), versionada AS (
    UPDATE public.seg_usuarios u
       SET version_sesiones = u.version_sesiones + 1
      FROM retirado r
     WHERE u.id_usuario = r.id_usuario
    RETURNING u.id_usuario, u.usuario_login
), revocadas AS (
    UPDATE public.seg_sesiones s
       SET fecha_revocacion = CURRENT_TIMESTAMP,
           motivo_revocacion = 'RESTABLECIMIENTO_MFA'
      FROM versionada v
     WHERE s.id_usuario = v.id_usuario AND s.fecha_revocacion IS NULL
    RETURNING s.id_usuario
)
SELECT v.usuario_login, (SELECT count(*) FROM revocadas) AS sesiones_revocadas
  FROM versionada v;
