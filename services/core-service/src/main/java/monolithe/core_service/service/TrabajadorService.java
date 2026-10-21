
package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.TrabajadorResponse;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.core.JacksonException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TrabajadorService {

        private final TrabajadorProcedureRepository repository;
        private final JsonMapper jsonMapper;

        public List<TrabajadorResponse> listarTodos(Long idActor) {

                ResultadoProcedimiento respuesta = repository.listarTrabajadores(idActor);

                validarEstado(respuesta);

                JsonNode datos = respuesta.resultado();

                if (datos == null || !datos.isArray()) {
                        throw new IllegalStateException(
                                        "Respuesta inválida al listar trabajadores.");
                }

                List<TrabajadorResponse> trabajadores = new ArrayList<>();

                for (JsonNode trabajador : datos) {
                        trabajadores.add(
                                        jsonMapper.convertValue(
                                                        trabajador,
                                                        TrabajadorResponse.class));
                }

                return trabajadores;
        }

        public TrabajadorResponse obtenerPorId(
                        Long idActor,
                        Long idTrabajador) {

                ResultadoProcedimiento respuesta = repository.obtenerTrabajador(
                                idActor,
                                idTrabajador);

                validarEstado(respuesta);

                JsonNode datos = respuesta.resultado();

                if (datos == null || !datos.isObject()) {
                        throw new IllegalStateException(
                                        "Respuesta inválida al obtener trabajador.");
                }

                return jsonMapper.convertValue(
                                datos,
                                TrabajadorResponse.class);
        }

        public JsonNode registrarTrabajador(
                        Long idActor,
                        JsonNode datos) {
                if (datos == null || !datos.isObject()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Los datos del trabajador deben ser un objeto JSON.");
                }

                if (!datos.has("informacionPersonal")
                                || !datos.get("informacionPersonal").isObject()
                                || !datos.has("informacionLaboral")
                                || !datos.get("informacionLaboral").isObject()) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Debe proporcionar informacionPersonal e informacionLaboral.");
                }

                String datosJson;

                try {
                        datosJson = jsonMapper.writeValueAsString(datos);
                } catch (JacksonException ex) {
                        throw new IllegalStateException(
                                        "No se pudieron procesar los datos del trabajador.",
                                        ex);
                }

                ResultadoProcedimiento respuesta = repository.registrarTrabajador(
                                idActor,
                                datosJson);

                validarEstado(respuesta);

                return respuesta.resultado();
        }

        public JsonNode obtenerCatalogos(Long idActor) {

                ResultadoProcedimiento respuesta = repository.obtenerCatalogos(idActor);

                validarEstado(respuesta);

                JsonNode datos = respuesta.resultado();

                if (datos == null || !datos.isObject()) {
                        throw new IllegalStateException(
                                        "Respuesta invalida al obtener los catalogos de RRHH.");
                }

                return datos;
        }

        public JsonNode identificarPersona(
                        Long idActor,
                        JsonNode datos) {

                if (datos == null || !datos.isObject()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Debe proporcionar los datos de identificación.");
                }

                JsonNode tipoDocumento = datos.get("idTipoDocumento");
                JsonNode numeroDocumento = datos.get("numeroDocumento");

                if (tipoDocumento == null
                                || !tipoDocumento.isInt()
                                || tipoDocumento.asInt() <= 0
                                || numeroDocumento == null
                                || !numeroDocumento.isString()
                                || numeroDocumento.asString().isBlank()) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Indique un tipo y número de documento válidos.");
                }

                ResultadoProcedimiento respuesta = repository.identificarPersona(
                                idActor,
                                tipoDocumento.asInt(),
                                numeroDocumento.asString().trim());

                validarEstado(respuesta);

                JsonNode persona = respuesta.resultado();

                if (persona == null || !persona.isObject()) {
                        throw new IllegalStateException(
                                        "Respuesta inválida al identificar la persona.");
                }

                return persona;
        }

        private void validarEstado(ResultadoProcedimiento respuesta) {

                if (respuesta == null) {
                        throw new IllegalStateException(
                                        "El procedimiento no devolvió una respuesta.");
                }

                String estado = respuesta.estado();

                if ("OK".equals(estado)) {
                        return;
                }

                String mensaje = respuesta.mensaje() != null
                                ? respuesta.mensaje()
                                : "No se pudo completar la operación.";

                if ("DENEGADO".equals(estado)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        mensaje);
                }

                if ("NO_ENCONTRADO".equals(estado)) {
                        throw new RecursoNoEncontradoException(mensaje);
                }

                if ("ID_INVALIDO".equals(estado)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        mensaje);
                }

                // Conflictos de identidad, duplicidad y consistencia
                if (List.of(
                                "CONFLICTO_UNICIDAD",
                                "DOCUMENTO_EN_USO",
                                "TRABAJADOR_EXISTENTE",
                                "PERSONA_NO_COINCIDE",
                                "DOCUMENTO_NO_COINCIDE",
                                "CONTACTO_NO_COINCIDE",
                                "DOMICILIO_NO_COINCIDE").contains(estado)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        mensaje);
                }

                if (List.of(
                                "CAMPOS_OBLIGATORIOS",
                                "CARGO_INVALIDO",
                                "DATOS_INVALIDOS",
                                "DOCUMENTO_INACTIVO",
                                "DOCUMENTO_INVALIDO",
                                "EMAIL_INVALIDO",
                                "HORARIO_INVALIDO",
                                "PERSONA_INVALIDA",
                                "REQUIERE_IDENTIFICACION",
                                "TELEFONO_INVALIDO",
                                "TIPO_DOCUMENTO_INVALIDO",
                                "VINCULO_INVALIDO").contains(estado)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        mensaje);
                }

                if ("CONFIGURACION_INVALIDA".equals(estado)) {
                        throw new ResponseStatusException(
                                        HttpStatus.INTERNAL_SERVER_ERROR,
                                        "La configuracion de RRHH requiere revision.");
                }

                throw new IllegalStateException(
                                "Error del procedimiento de RRHH: " + estado);
        }
}