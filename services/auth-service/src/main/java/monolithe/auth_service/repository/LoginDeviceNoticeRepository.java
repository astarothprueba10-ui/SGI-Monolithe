package monolithe.auth_service.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.MfaPortal;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Reserva avisos persistidos y permite reintentar los envíos rechazados. */
@Repository
@RequiredArgsConstructor
public class LoginDeviceNoticeRepository {
    public static final int MAX_INTENTOS = 6;
    private static final String RESERVAR = """
            WITH pendiente AS (
                SELECT id_usuario, portal, dispositivo_hash
                FROM auth_mfa.dispositivos
                WHERE aviso_intentar_en <= CURRENT_TIMESTAMP AND aviso_intentos < 6
                ORDER BY aviso_intentar_en, id_usuario
                LIMIT 1 FOR UPDATE SKIP LOCKED
            )
            UPDATE auth_mfa.dispositivos AS d
            SET aviso_intentos = d.aviso_intentos + 1,
                aviso_intentar_en = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
            FROM pendiente AS p
            WHERE d.id_usuario = p.id_usuario AND d.portal = p.portal
              AND d.dispositivo_hash = p.dispositivo_hash
            RETURNING d.id_usuario, d.portal, d.dispositivo_hash, d.aviso_acceso_en, d.aviso_intentos
            """;
    private final JdbcClient jdbc;

    /** Identidad, hora y número de intento de un aviso reservado. */
    public record Aviso(long usuario, MfaPortal portal, byte[] equipo, OffsetDateTime acceso, int intento) {}

    /** Reserva un aviso confirmado en una sola sentencia y libera el bloqueo antes de conectarse al proveedor. */
    public Optional<Aviso> reservar() {
        return jdbc.sql(RESERVAR).query((row, unused) -> leerAviso(row)).optional();
    }

    private static Aviso leerAviso(ResultSet row) throws SQLException {
        return new Aviso(row.getLong("id_usuario"), MfaPortal.valueOf(row.getString("portal")),
                row.getBytes("dispositivo_hash"), row.getObject("aviso_acceso_en", OffsetDateTime.class),
                row.getInt("aviso_intentos"));
    }

    /** Cierra el intento si otro proceso todavía no lo ha vuelto a reservar. */
    public void finalizar(Aviso aviso) {
        jdbc.sql("""
                UPDATE auth_mfa.dispositivos SET aviso_intentar_en = NULL
                WHERE id_usuario = :usuario AND portal = :portal AND dispositivo_hash = :equipo
                  AND aviso_intentos = :intento
                """).param("usuario", aviso.usuario()).param("portal", aviso.portal().name())
                .param("equipo", aviso.equipo()).param("intento", aviso.intento()).update();
    }
}
