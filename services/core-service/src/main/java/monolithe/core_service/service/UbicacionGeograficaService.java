package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.UbicacionGeograficaResponse;
import monolithe.core_service.repository.UbicacionGeograficaRepository;
import monolithe.core_service.repository.UbicacionGeograficaRepository.ResultadoProcedimiento;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UbicacionGeograficaService {

    private final UbicacionGeograficaRepository repository;
    private final JsonMapper jsonMapper;

    public List<UbicacionGeograficaResponse> listarUbicaciones(Long idPadre) {
        ResultadoProcedimiento respuesta = repository.listarUbicaciones(idPadre);
        validarEstado(respuesta);
        return mapearLista(respuesta.resultado());
    }

    private List<UbicacionGeograficaResponse> mapearLista(JsonNode datos) {
        if (datos == null || !datos.isArray()) {
            throw new IllegalStateException(
                    "Respuesta invalida del procedimiento geografico.");
        }

        List<UbicacionGeograficaResponse> lista = new ArrayList<>();
        for (JsonNode nodo : datos) {
            lista.add(jsonMapper.convertValue(nodo, UbicacionGeograficaResponse.class));
        }
        return lista;
    }

    private void validarEstado(ResultadoProcedimiento respuesta) {
        if (respuesta == null) {
            throw new IllegalStateException(
                    "El procedimiento geografico no devolvio una respuesta.");
        }

        String estado = respuesta.estado();

        if ("OK".equals(estado)) {
            return;
        }

        String mensaje = respuesta.mensaje() != null
                ? respuesta.mensaje()
                : "No se pudo completar la consulta geografica.";

        if ("PADRE_INVALIDO".equals(estado)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    mensaje);
        }

        throw new IllegalStateException(
                "Error del procedimiento geografico: " + estado);
    }
}
