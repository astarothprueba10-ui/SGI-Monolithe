package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.client.ConsultaDniClient;
import monolithe.core_service.dto.*;
import monolithe.core_service.exception.ConsultaIdentidadNoDisponibleException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.validation.NombrePersona;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;
import java.util.Set;

/** Consulta local de RRHH con respaldo externo exclusivo para DNI nuevos. */
@Service
@RequiredArgsConstructor
public class TrabajadorPersonaConsultaService {
    private final TrabajadorService trabajadores;
    private final ConsultaDniClient dni;
    private final JsonMapper mapper;

    /** Consulta documentos permitidos sin crear personas ni asignarles identificadores ficticios. */
    public ConsultaPersonaTrabajadorResponse consultar(Long actor, ConsultaPersonaTrabajadorRequest request) {
        if (actor == null || actor <= 0) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad de usuario inválida.");
        if (request == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indica el documento de la persona.");
        String tipo = tipoPermitido(trabajadores.obtenerCatalogos(actor), request.idTipoDocumento());
        DocumentoConsultaCrm.validar(tipo, request.numeroDocumento());
        var datos = mapper.createObjectNode().put("idTipoDocumento", request.idTipoDocumento()).put("numeroDocumento", request.numeroDocumento());
        try {
            ObjectNode local = ((ObjectNode) trabajadores.identificarPersona(actor, datos)).deepCopy();
            NombrePersona.normalizarCampos(local);
            var nombres = new DatosPersonaCrm(local.path("nombres").asString(""), local.path("apellidoPaterno").asString(""), local.path("apellidoMaterno").asString(""));
            return ConsultaPersonaTrabajadorResponse.encontrada(request, nombres, local);
        } catch (RecursoNoEncontradoException ex) {
            return consultarExterno(request, tipo);
        }
    }

    private ConsultaPersonaTrabajadorResponse consultarExterno(ConsultaPersonaTrabajadorRequest request, String tipo) {
        if (!"DNI".equals(tipo)) return ConsultaPersonaTrabajadorResponse.sinDatos(request, "NO_ENCONTRADO");
        try {
            return dni.consultar(request.numeroDocumento())
                    .map(persona -> ConsultaPersonaTrabajadorResponse.encontrada(request, persona, null))
                    .orElseGet(() -> ConsultaPersonaTrabajadorResponse.sinDatos(request, "NO_ENCONTRADO"));
        } catch (ConsultaIdentidadNoDisponibleException ex) {
            return ConsultaPersonaTrabajadorResponse.sinDatos(request, "NO_DISPONIBLE");
        }
    }

    private String tipoPermitido(JsonNode catalogos, int id) {
        for (JsonNode tipo : catalogos.path("tiposDocumento")) {
            if (tipo.path("idTipoDocumento").asInt() != id) continue;
            String codigo = tipo.path("codigo").asString("").toUpperCase(java.util.Locale.ROOT);
            if (Set.of("DNI", "01", "1").contains(codigo)) return "DNI";
            if (Set.of("CE", "04", "4").contains(codigo)) return "CE";
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona DNI o carné de extranjería.");
    }
}
