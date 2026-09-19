package monolithe.auth_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class PersonContactRepository {

    private final JdbcClient jdbcClient;

    public Optional<String> buscarEmailPrincipalVerificado(
            Long idPersona
    ) {

        String sql = """
                SELECT pc.valor
                FROM contacto pc
                INNER JOIN tipo_contacto tc
                        ON tc.id_tipo_contacto = pc.id_tipo_contacto
                WHERE pc.id_persona = :idPersona
                  AND tc.codigo = 'EMAIL'
                  AND tc.activo = 1
                  AND pc.principal = 1
                  AND pc.verificado = 1
                  AND pc.activo = 1
                LIMIT 1
                """;

        return jdbcClient
                .sql(sql)
                .param("idPersona", idPersona)
                .query(String.class)
                .optional();
    }
}