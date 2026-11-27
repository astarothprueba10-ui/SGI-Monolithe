package monolithe.auth_service.repository;

import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaPortal;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Persistencia de la identificación de equipos y su permiso MFA diario. */
@Repository
@RequiredArgsConstructor
public class LoginDeviceRepository {
    private final JdbcClient jdbc;

    public record Registration(long user, MfaPortal portal, byte[] device, long version,
                               byte[] passwordDigest, OffsetDateTime trustedUntil) {}

    public boolean trusted(Registration device, OffsetDateTime now) {
        return jdbc.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM auth_mfa.dispositivos
                     WHERE id_usuario = :user AND portal = :portal AND dispositivo_hash = :hash
                       AND version_sesiones = :version AND password_hash_ref = :password
                       AND confiable_hasta > :now
                )
                """).param("user", device.user()).param("portal", device.portal().name())
                .param("hash", device.device()).param("version", device.version())
                .param("password", device.passwordDigest()).param("now", now)
                .query(Boolean.class).single();
    }

    public boolean issued(byte[] device) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM auth_mfa.dispositivos WHERE dispositivo_hash = :hash)")
                .param("hash", device).query(Boolean.class).single();
    }

    /** El primer navegador establece la referencia. Uno nuevo se detecta tras otro registro. */
    public boolean differentDevice(long user, byte[] device) {
        return jdbc.sql("""
                SELECT EXISTS (SELECT 1 FROM auth_mfa.dispositivos WHERE id_usuario = :user)
                   AND NOT EXISTS (
                       SELECT 1 FROM auth_mfa.dispositivos WHERE id_usuario = :user AND dispositivo_hash = :hash
                   )
                """).param("user", user).param("hash", device).query(Boolean.class).single();
    }

    /** Esta escritura se ejecuta con la cuenta ya bloqueada por la verificación TOTP. */
    public void record(Registration device) {
        jdbc.sql("""
                INSERT INTO auth_mfa.dispositivos
                    (id_usuario, portal, dispositivo_hash, version_sesiones, password_hash_ref, confiable_hasta)
                VALUES (:user, :portal, :hash, :version, :password, :until)
                ON CONFLICT (id_usuario, portal, dispositivo_hash) DO UPDATE
                    SET version_sesiones = EXCLUDED.version_sesiones,
                        password_hash_ref = EXCLUDED.password_hash_ref,
                        confiable_hasta = EXCLUDED.confiable_hasta,
                        ultima_verificacion = CURRENT_TIMESTAMP
                """).param("user", device.user()).param("portal", device.portal().name())
                .param("hash", device.device()).param("version", device.version())
                .param("password", device.passwordDigest())
                .param("until", device.trustedUntil()).update();
    }
}
