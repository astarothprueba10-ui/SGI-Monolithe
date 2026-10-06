package monolithe.auth_service.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.repository.SecurityQueryProcedureRepository;
import monolithe.auth_service.repository.projection.SecurityQueryResult;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecurityQueryService {

    private final SecurityQueryProcedureRepository repository;
    private final ObjectMapper objectMapper;

    public JsonNode listarUsuarios(Long actor) {
        return convertir(repository.listarUsuarios(actor));
    }

    public JsonNode listarRoles(Long actor) {
        return convertir(repository.listarRoles(actor));
    }

    public JsonNode listarPersonasSinUsuario(Long actor) {
        return convertir(repository.listarPersonasSinUsuario(actor));
    }

    public JsonNode listarPermisosRol(Long actor, String rol) {
        return convertir(repository.listarPermisosRol(actor, rol));
    }

    private JsonNode convertir(SecurityQueryResult resultado) {
        if (!"OK".equals(resultado.estado()))
            throw new IllegalStateException(resultado.mensaje());
        try {
            return objectMapper.readTree(resultado.resultadoJson());
        } catch (JacksonException e){
            throw new IllegalStateException("Respuesta JSON inválida de base de datos", e);
        }
    }
}