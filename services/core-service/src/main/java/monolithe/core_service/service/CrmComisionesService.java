package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.repository.CrmComisionesRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class CrmComisionesService {

    private final CrmComisionesRepository repository;
    private final JsonMapper jsonMapper;

    @Transactional(readOnly = true)
    public JsonNode listarOperativas(Long actor) {
        validarPermiso(actor, "advisors.view");
        final String json;
        try {
            json = repository.listarOperativas();
        } catch (DataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No fue posible consultar las liquidaciones.", ex);
        }
        JsonNode resultado = json(json);
        if (!resultado.isArray()) {
            throw new IllegalStateException("El listado de comisiones debe ser un arreglo JSON.");
        }
        return resultado;
    }

    @Transactional
    public JsonNode aprobarDevengo(Long actor, Long idComision) {
        validarPermiso(actor, "advisors.approve");
        if (idComision == null || idComision <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Comision invalida.");
        }
        try {
            // Bloqueo transaccional: evita aprobar dos veces o una comision de prueba.
            if (!repository.bloquearPendienteElegible(idComision)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "La comision no esta pendiente o no pertenece a un asesor con expediente laboral.");
            }
            return json(repository.aprobarDevengo(idComision, actor));
        } catch (DataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No fue posible aprobar: verifique el estado del contrato y la comision.", ex);
        }
    }

    private void validarPermiso(Long actor, String permiso) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion no valida.");
        }
        try {
            if (!repository.tienePermiso(actor, permiso)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "No tiene permiso vigente para operar liquidaciones.");
            }
        } catch (DataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudieron validar los permisos.", ex);
        }
    }

    private JsonNode json(String json) {
        if (json == null) throw new IllegalStateException("La consulta devolvio datos nulos.");
        try {
            return jsonMapper.readTree(json);
        } catch (JacksonException ex) {
            throw new IllegalStateException("La base devolvio JSON invalido.", ex);
        }
    }
}
