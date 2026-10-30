package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.repository.CrmConsultaRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class CrmConsultaService {

    private final CrmConsultaRepository repository;
    private final JsonMapper jsonMapper;

    @Transactional(readOnly = true)
    public JsonNode listarProspectos(Long idActor) {
        return consultar(idActor, () -> {
            if (!repository.tieneAlcanceProspectos(idActor)) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "No tiene autorizado un rol para consultar prospectos.");
            }

            return repository.listarProspectos(idActor);
        });
    }

    @Transactional(readOnly = true)
    public JsonNode listarAsesores(Long idActor) {
        return consultar(idActor, repository::listarAsesores);
    }

    private JsonNode consultar(Long idActor, Supplier<String> consulta) {
        if (idActor == null || idActor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "La identidad de la sesion no es valida.");
        }

        final String json;
        try {
            if (!repository.tienePermisoVista(idActor)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "No tiene permisos vigentes para consultar el CRM.");
            }
            json = consulta.get();
        } catch (DataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo consultar la informacion del CRM.", ex);
        }

        if (json == null) {
            throw new IllegalStateException("La consulta CRM devolvio una respuesta nula.");
        }
        try {
            JsonNode respuesta = jsonMapper.readTree(json);
            if (respuesta == null || !respuesta.isArray()) {
                throw new IllegalStateException("La consulta CRM debe devolver un arreglo JSON.");
            }
            return respuesta;
        } catch (JacksonException ex) {
            throw new IllegalStateException("La respuesta CRM no contiene JSON valido.", ex);
        }
    }
}
