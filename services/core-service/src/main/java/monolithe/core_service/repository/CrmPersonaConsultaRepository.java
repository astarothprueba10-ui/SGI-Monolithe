package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.DatosPersonaCrm;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/** Consulta de identidad local, limitada a los nombres de un documento activo. */
@Repository
@RequiredArgsConstructor
public class CrmPersonaConsultaRepository {
    private final JdbcTemplate jdbc;

    /** Busca por código de tipo y número exacto, conservando los ceros iniciales. */
    public Optional<DatosPersonaCrm> buscar(String tipo, String numero) {
        String sql = """
                SELECT p.nombres, p.apellido_paterno, p.apellido_materno
                FROM public.core_personas_documentos d
                JOIN public.core_personas p ON p.id_persona = d.id_persona
                JOIN public.cfg_tipos_documento t ON t.id_tipo_documento = d.id_tipo_documento
                WHERE d.activo = TRUE AND p.activo = TRUE AND t.activo = TRUE
                  AND UPPER(TRIM(t.codigo)) = ? AND UPPER(TRIM(d.numero_documento)) = ?
                ORDER BY d.principal DESC, d.id_persona_documento ASC LIMIT 1
                """;
        return jdbc.query(sql, (row, index) -> new DatosPersonaCrm(row.getString("nombres"),
                row.getString("apellido_paterno"), row.getString("apellido_materno")), tipo, numero).stream().findFirst();
    }
}
