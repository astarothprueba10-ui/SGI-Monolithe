package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class CrmCaptacionRepository {

    private static final String SQL_REGISTRAR = """
            SELECT public.sp_registrar_captacion_crm_v2(
                ?, ?, CAST(NULL AS bigint), CAST(? AS jsonb)
            )::text
            """;

    private final JdbcTemplate jdbcTemplate;

    /** Invocacion reservada al usuario tecnico SQL; nunca desde el navegador. */
    public String registrar(UUID idSolicitud, Long idActor, String payloadJson) {
        return jdbcTemplate.queryForObject(SQL_REGISTRAR, String.class,
                idSolicitud, idActor, payloadJson);
    }
}
