package monolithe.auth_service.repository;

import java.util.List;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.repository.projection.OfficialPersonDocument;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class PersonDocumentRepository {

    private static final String DOCUMENTO_PRINCIPAL_ACTIVO = """
            SELECT td.codigo AS tipo_documento, d.numero_documento
            FROM public.core_personas_documentos d
            JOIN public.cfg_tipos_documento td
              ON td.id_tipo_documento = d.id_tipo_documento
            WHERE d.id_persona = :idPersona
              AND d.principal = TRUE
              AND d.activo = TRUE
              AND td.activo = TRUE
              AND BTRIM(d.numero_documento) <> ''
            ORDER BY d.id_persona_documento
            LIMIT 2
            """;

    private final JdbcClient jdbcClient;

    /** Devuelve el documento principal activo solo si la persona tiene exactamente uno. */
    public Optional<OfficialPersonDocument> buscarDocumentoPrincipalActivo(Long idPersona) {
        List<OfficialPersonDocument> documentos = jdbcClient.sql(DOCUMENTO_PRINCIPAL_ACTIVO)
                .param("idPersona", idPersona)
                .query((rs, row) -> new OfficialPersonDocument(
                        rs.getString("tipo_documento"), rs.getString("numero_documento")))
                .list();
        return documentos.size() == 1 ? Optional.of(documentos.get(0)) : Optional.empty();
    }
}
