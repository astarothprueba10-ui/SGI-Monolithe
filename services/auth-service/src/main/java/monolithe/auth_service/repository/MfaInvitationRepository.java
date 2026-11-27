package monolithe.auth_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.Optional;

/** Acceso exclusivamente servidor a invitaciones MFA y contactos verificados. */
@Repository
@RequiredArgsConstructor
public class MfaInvitationRepository {
    private final JdbcClient jdbc;

    /** Correo primario registrado: su propiedad se comprueba al consumir el código recibido. */
    public record ContactoCorreo(long id, String direccion, boolean verificado) {
        @Override public String toString() { return "ContactoCorreo[datos omitidos]"; }
    }

    public Optional<ContactoCorreo> correoPrincipal(long usuario) {
        return jdbc.sql("""
            SELECT c.id_persona_contacto, c.valor, c.verificado
            FROM public.seg_usuarios u
            JOIN public.core_personas_contactos c ON c.id_persona = u.id_persona
            JOIN public.cfg_tipos_contacto t ON t.id_tipo_contacto = c.id_tipo_contacto
            WHERE u.id_usuario = :usuario
              AND t.codigo = 'EMAIL' AND t.activo = TRUE
              AND c.activo = TRUE AND c.principal = TRUE
            ORDER BY c.id_persona_contacto DESC LIMIT 1
            """).param("usuario", usuario)
              .query((row, unused) -> new ContactoCorreo(
                  row.getLong("id_persona_contacto"), row.getString("valor"), row.getBoolean("verificado")))
              .optional();
    }

    /** Correo que demostró posesión para el flujo de restablecimiento del autenticador. */
    public Optional<String> correoVerificado(long usuario) {
        return correoPrincipal(usuario).filter(ContactoCorreo::verificado).map(ContactoCorreo::direccion);
    }

    /** El administrador puede invitar antes del primer intento de inicio de sesión. */
    public void asegurarEstado(long usuario) {
        jdbc.sql("INSERT INTO auth_mfa.estado (id_usuario) VALUES (:usuario) ON CONFLICT (id_usuario) DO NOTHING")
            .param("usuario", usuario).update();
    }

    /**
     * Sustituye el código previo solo si no se ha vinculado un autenticador.
     * Se ejecuta dentro de la transacción que envía el correo: un fallo SMTP revierte el cambio.
     */
    public boolean emitir(long usuario, byte[] hash, OffsetDateTime vence, Long contactoPrueba, byte[] correoPruebaHash) {
        return jdbc.sql("""
            UPDATE auth_mfa.estado
            SET activacion_hash = :hash, activacion_expira = :vence,
                activacion_contacto_id = :contactoPrueba, activacion_correo_hash = :correoPruebaHash,
                activacion_ultimo_envio = CURRENT_TIMESTAMP,
                activacion_envios_ventana = CASE
                    WHEN activacion_ventana_inicio IS NULL
                      OR activacion_ventana_inicio <= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                    THEN 1 ELSE activacion_envios_ventana + 1 END,
                activacion_ventana_inicio = CASE
                    WHEN activacion_ventana_inicio IS NULL
                      OR activacion_ventana_inicio <= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                    THEN CURRENT_TIMESTAMP ELSE activacion_ventana_inicio END
            WHERE id_usuario = :usuario
              AND secreto_cifrado IS NULL AND pendiente_cifrado IS NULL
              AND (activacion_ultimo_envio IS NULL
                   OR activacion_ultimo_envio <= CURRENT_TIMESTAMP - INTERVAL '60 seconds')
              AND (activacion_ventana_inicio IS NULL
                   OR activacion_ventana_inicio <= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                   OR activacion_envios_ventana < 5)
            """).param("hash", hash).param("vence", vence)
               .param("usuario", usuario).param("contactoPrueba", contactoPrueba)
               .param("correoPruebaHash", correoPruebaHash).update() == 1;
    }
}
