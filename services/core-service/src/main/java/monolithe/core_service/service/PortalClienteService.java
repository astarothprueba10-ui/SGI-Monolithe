package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Portal Cliente: el actor deriva únicamente del JWT verificado por Spring.
 * La función SQL verifica el rol vigente y limita las ventas a su persona.
 */
@Service
@RequiredArgsConstructor
public class PortalClienteService {
    private final JdbcTemplate jdbc;
    private final JsonMapper mapper;

    @Transactional(readOnly = true)
    public JsonNode resumenPrivado(Long actor) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Se requiere una sesión de cliente válida.");
        }
        final String respuesta;
        try {
            respuesta = jdbc.queryForObject(
                    "SELECT public.sp_portal_cliente_resumen_v1(CAST(? AS bigint))::text",
                    String.class, actor);
        } catch (DataAccessException ex) {
            String message = String.valueOf(ex.getMostSpecificCause().getMessage());
            if (message.contains("PORTAL_ACCESO_DENEGADO|")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "El usuario no tiene una cuenta de cliente activa.", ex);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo consultar el resumen del cliente.", ex);
        }
        if (respuesta == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No se recibió información del portal.");
        }
        try {
            JsonNode resultado = mapper.readTree(respuesta);
            if (resultado == null || !resultado.isObject()) {
                throw new IllegalStateException("Respuesta de portal inesperada.");
            }
            return resultado;
        } catch (JacksonException ex) {
            throw new IllegalStateException("El resumen del portal no es JSON válido.",ex);
        }
    }
}
