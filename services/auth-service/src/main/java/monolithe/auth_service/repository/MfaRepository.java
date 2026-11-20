package monolithe.auth_service.repository;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.security.MfaCrypto;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

/** Estado transaccional de verificación que comparte todas las instancias de autenticación. */
@Repository
@RequiredArgsConstructor
public class MfaRepository {
    private final JdbcClient jdbc;

    /** Cuenta bloqueada durante la emisión o consumo de un reto. */
    public record Account(long id, String login, long version, byte[] passwordDigest) {
        @Override
        public String toString() {
            return "Account[id=" + id + "]";
        }
    }

    /** Datos mínimos necesarios para avanzar el segundo factor de una cuenta. */
    public record State(byte[] encryptedSeed, Long lastStep, byte[] recoveryHash,
                        byte[] activationHash, OffsetDateTime activationExpires,
                        byte[] challengeHash, OffsetDateTime challengeExpires, Long challengeVersion,
                        byte[] challengePassword, MfaPortal portal, byte[] pendingSeed,
                        int attempts, OffsetDateTime lockedUntil) {
        @Override
        public String toString() {
            return "State[datos omitidos]";
        }
    }

    /** Localiza el usuario de un reto sin confundirlo con una sesión. */
    public Optional<Long> findUser(byte[] challenge) {
        return jdbc.sql("SELECT id_usuario FROM auth_mfa.estado WHERE reto_hash = :hash")
                .param("hash", challenge).query(Long.class).optional();
    }

    /** Bloquea primero la cuenta para serializar cambios de contraseña y sesiones. */
    public Optional<Account> lockAccount(long id) {
        return jdbc.sql("""
                SELECT id_usuario, usuario_login, version_sesiones, password_hash
                  FROM public.seg_usuarios
                 WHERE id_usuario = :id FOR NO KEY UPDATE
                """).param("id", id).query((row, unused) -> new Account(row.getLong("id_usuario"),
                row.getString("usuario_login"), row.getLong("version_sesiones"),
                MfaCrypto.digest(row.getString("password_hash")))).optional();
    }

    /** Lee y bloquea el estado después de bloquear la cuenta. */
    public Optional<State> lockState(long id) {
        return jdbc.sql("""
                SELECT secreto_cifrado, ultimo_paso, recuperacion_hash, activacion_hash, activacion_expira,
                       reto_hash, reto_expira, version_reto, password_reto_hash, portal,
                       pendiente_cifrado, intentos, bloqueo_expira
                  FROM auth_mfa.estado WHERE id_usuario = :id FOR UPDATE
                """).param("id", id).query((row, unused) -> {
            String portal = row.getString("portal");
            return new State(row.getBytes("secreto_cifrado"), row.getObject("ultimo_paso", Long.class),
                    row.getBytes("recuperacion_hash"), row.getBytes("activacion_hash"),
                    row.getObject("activacion_expira", OffsetDateTime.class), row.getBytes("reto_hash"),
                    row.getObject("reto_expira", OffsetDateTime.class), row.getObject("version_reto", Long.class),
                    row.getBytes("password_reto_hash"), portal == null ? null : MfaPortal.valueOf(portal),
                    row.getBytes("pendiente_cifrado"), row.getInt("intentos"),
                    row.getObject("bloqueo_expira", OffsetDateTime.class));
        }).optional();
    }

    /** Inicia un reto sin reiniciar el contador de fallos del usuario. */
    public void open(Account account, MfaPortal portal, byte[] hash, OffsetDateTime expires) {
        jdbc.sql("""
                INSERT INTO auth_mfa.estado (id_usuario, reto_hash, reto_expira, version_reto, password_reto_hash, portal)
                VALUES (:id, :hash, :expires, :version, :password, :portal)
                ON CONFLICT (id_usuario) DO UPDATE
                   SET reto_hash = EXCLUDED.reto_hash, reto_expira = EXCLUDED.reto_expira,
                       version_reto = EXCLUDED.version_reto, password_reto_hash = EXCLUDED.password_reto_hash,
                       portal = EXCLUDED.portal, pendiente_cifrado = NULL, pendiente_recuperacion_hash = NULL
                """).param("id", account.id()).param("hash", hash).param("expires", expires)
                .param("version", account.version()).param("password", account.passwordDigest())
                .param("portal", portal == null ? null : portal.name()).update();
    }

    /** Cambia el reto tras la prueba de activación o recuperación y guarda la semilla cifrada. */
    public void stage(long id, byte[] hash, OffsetDateTime expires, byte[] seed, byte[] recovery) {
        jdbc.sql("""
                UPDATE auth_mfa.estado
                   SET reto_hash = :hash, reto_expira = :expires, pendiente_cifrado = :seed,
                       pendiente_recuperacion_hash = :recovery
                 WHERE id_usuario = :id
                """).param("id", id).param("hash", hash).param("expires", expires)
                .param("seed", seed).param("recovery", recovery).update();
    }

    /** Guarda un fallo de verificación sin consumir el reto. */
    public void failed(long id, int attempts, OffsetDateTime lockedUntil) {
        jdbc.sql("""
                UPDATE auth_mfa.estado SET intentos = :attempts, bloqueo_expira = :locked
                 WHERE id_usuario = :id
                """).param("id", id).param("attempts", attempts).param("locked", lockedUntil).update();
    }

    /** Consume reto y paso TOTP, vinculando la semilla pendiente cuando corresponde. */
    public void consume(long id, long step) {
        jdbc.sql("""
                UPDATE auth_mfa.estado
                   SET secreto_cifrado = COALESCE(pendiente_cifrado, secreto_cifrado),
                       recuperacion_hash = COALESCE(pendiente_recuperacion_hash, recuperacion_hash),
                       ultimo_paso = :step, activacion_hash = NULL, activacion_expira = NULL,
                       reto_hash = NULL, reto_expira = NULL, version_reto = NULL, password_reto_hash = NULL,
                       portal = NULL, pendiente_cifrado = NULL, pendiente_recuperacion_hash = NULL,
                       intentos = 0, bloqueo_expira = NULL
                 WHERE id_usuario = :id
                """).param("id", id).param("step", step).update();
    }
}
