
package monolithe.auth_service.repository;

import lombok.extern.slf4j.Slf4j;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlOutParameter;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.Map;
import java.util.Optional;

@Repository
@Slf4j
public class DocumentLoginProcedureRepository {

    private final SimpleJdbcCall resolverLoginCall;

    public DocumentLoginProcedureRepository(
            JdbcTemplate jdbcTemplate
    ) {
        this.resolverLoginCall = new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName("sp_resolver_login_documento")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_tipo_documento",
                                Types.VARCHAR
                        ),
                        new SqlParameter(
                                "p_numero_documento",
                                Types.VARCHAR
                        ),
                        new SqlOutParameter(
                                "p_usuario_login",
                                Types.VARCHAR
                        )
                );
    }

    public Optional<String> resolverLogin(
            String tipoDocumento,
            String numeroDocumento
    ) {

        MapSqlParameterSource parametros =
                new MapSqlParameterSource()
                        .addValue(
                                "p_tipo_documento",
                                tipoDocumento
                        )
                        .addValue(
                                "p_numero_documento",
                                numeroDocumento
                        );

        Map<String, Object> resultado =
                resolverLoginCall.execute(parametros);

        String usuarioLogin =
                (String) resultado.get("p_usuario_login");

        if (usuarioLogin == null || usuarioLogin.isBlank()) {
            return Optional.empty();
        }

        return Optional.of(usuarioLogin);
    }
}
