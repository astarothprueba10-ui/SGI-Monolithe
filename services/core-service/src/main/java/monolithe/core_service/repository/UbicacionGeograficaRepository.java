package monolithe.core_service.repository;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UbicacionGeograficaRepository {

    private final JdbcTemplate jdbcTemplate;
    private final JsonMapper jsonMapper;

    public record ResultadoProcedimiento(
            JsonNode resultado,
            String estado,
            String mensaje) {
    }

    public ResultadoProcedimiento listarUbicaciones(Long idPadre) {
        String sql = """
                CALL public.sp_geo_listar_ubicaciones(
                    ?, NULL, NULL, NULL
                )
                """;

        return jdbcTemplate.queryForObject(
                sql,
                (rs, rowNum) -> mapearResultado(
                        rs.getString("p_resultado"),
                        rs.getString("p_estado"),
                        rs.getString("p_mensaje")),
                idPadre);
    }

    private ResultadoProcedimiento mapearResultado(
            String json,
            String estado,
            String mensaje) {
        try {
            JsonNode resultado = json != null
                    ? jsonMapper.readTree(json)
                    : null;

            return new ResultadoProcedimiento(resultado, estado, mensaje);

        } catch (JacksonException ex) {
            throw new IllegalStateException(
                    "No se pudo interpretar la respuesta del procedimiento geografico.",
                    ex);
        }
    }
}
