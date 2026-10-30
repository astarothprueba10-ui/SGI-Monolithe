package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ActualizarFichaCrmRequest;
import monolithe.core_service.repository.CrmCierreRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class CrmCierreService {
    private final CrmCierreRepository repository;
    private final JsonMapper jsonMapper;

    @Transactional(readOnly = true)
    public JsonNode buscar(Long actor, String consulta, String etapa,
            String origen, Long asesor, boolean sinAsignar,
            String categoria, Integer pagina, Integer tamano) {

        validarActor(actor);
        validarBusqueda(consulta, etapa, categoria, pagina, tamano);

        if ((origen != null && origen.length() > 40)
                || (asesor != null && asesor <= 0)) {
            throw badRequest("Filtro de origen o asesor invalido.");
        }

        return ejecutar(() -> {
            Long alcance = repository.resolverAlcanceBusqueda(actor);

            if (alcance == null || alcance < -1L || alcance == 0L) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "No tiene autorización para consultar prospectos.");
            }

            Long asesorEfectivo = asesor;
            boolean sinAsignarEfectivo = sinAsignar;

            if (alcance > 0) {
                if (sinAsignar || (asesor != null && !asesor.equals(alcance))) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "No puede consultar prospectos fuera de su cartera.");
                }

                asesorEfectivo = alcance;
                sinAsignarEfectivo = false;
            }

            return repository.buscar(
                    actor,
                    consulta,
                    normalizar(etapa),
                    normalizar(origen),
                    asesorEfectivo,
                    sinAsignarEfectivo,
                    categoria(categoria),
                    pagina,
                    tamano);
        }, false);
    }

    @Transactional(readOnly = true)
    public JsonNode buscarPeriodo(
            Long actor,
            String consulta,
            String etapa,
            String origen,
            Long asesor,
            boolean sinAsignar,
            String categoria,
            Integer pagina,
            Integer tamano,
            Long proyecto,
            java.time.OffsetDateTime desde,
            java.time.OffsetDateTime hastaExclusivo) {

        validarActor(actor);
        validarBusqueda(consulta, etapa, categoria, pagina, tamano);

        if ((origen != null && origen.length() > 40)
                || (asesor != null && asesor <= 0)
                || (proyecto != null && proyecto <= 0)) {

            throw badRequest(
                    "Los filtros comerciales proporcionados no son válidos.");
        }

        if (desde == null
                || hastaExclusivo == null
                || !hastaExclusivo.isAfter(desde)
                || hastaExclusivo.isAfter(desde.plusYears(10))) {

            throw badRequest(
                    "El rango de fechas del CRM no es válido.");
        }

        return ejecutar(() -> {
            Long alcance = repository.resolverAlcanceBusqueda(actor);

            if (alcance == null || alcance < -1L || alcance == 0L) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "No tiene autorización para consultar prospectos.");
            }

            Long asesorEfectivo = asesor;
            boolean sinAsignarEfectivo = sinAsignar;

            if (alcance > 0) {
                if (sinAsignar || (asesor != null && !asesor.equals(alcance))) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "No puede consultar prospectos fuera de su cartera.");
                }

                asesorEfectivo = alcance;
                sinAsignarEfectivo = false;
            }

            return repository.buscarPeriodo(
                    actor,
                    consulta,
                    normalizar(etapa),
                    normalizar(origen),
                    asesorEfectivo,
                    sinAsignarEfectivo,
                    categoria(categoria),
                    pagina,
                    tamano,
                    proyecto,
                    desde,
                    hastaExclusivo);
        }, false);

    }

    @Transactional(readOnly = true)
    public JsonNode indicadores(Long actor) {
        validarActor(actor);
        return ejecutar(() -> repository.indicadores(actor), false);
    }

    @Transactional(readOnly = true)
    public JsonNode indicadoresPeriodo(
            Long actor,
            java.time.OffsetDateTime desde,
            java.time.OffsetDateTime hastaExclusivo) {

        validarActor(actor);

        if (desde == null
                || hastaExclusivo == null
                || !hastaExclusivo.isAfter(desde)
                || hastaExclusivo.isAfter(desde.plusYears(10))) {

            throw badRequest(
                    "El rango de fechas del CRM no es valido.");
        }

        return ejecutar(
                () -> repository.indicadoresPeriodo(
                        actor,
                        desde,
                        hastaExclusivo),
                false);
    }

    @Transactional(readOnly = true)
    public JsonNode evolucionMensual(
            Long actor,
            java.time.OffsetDateTime desde,
            java.time.OffsetDateTime hastaExclusivo) {

        validarActor(actor);

        if (desde == null
                || hastaExclusivo == null
                || !hastaExclusivo.isAfter(desde)
                || hastaExclusivo.isAfter(desde.plusYears(3))) {

            throw badRequest(
                    "El rango de fechas para la evolución comercial no es válido.");
        }

        return ejecutar(
                () -> repository.evolucionMensual(
                        actor,
                        desde,
                        hastaExclusivo),
                false);
    }

    @Transactional(readOnly = true)
    public JsonNode compradores(Long actor, String consulta, Integer pagina, Integer tamano) {
        validarActor(actor);
        validarPagina(pagina, tamano);
        validarTexto(consulta, 120, "busqueda");
        return ejecutar(() -> repository.compradores(actor, consulta, pagina, tamano), false);
    }

    @Transactional(readOnly = true)
    public JsonNode compradoresPeriodo(
            Long actor,
            String consulta,
            Integer pagina,
            Integer tamano,
            java.time.OffsetDateTime desde,
            java.time.OffsetDateTime hastaExclusivo) {

        validarActor(actor);
        validarPagina(pagina, tamano);
        validarTexto(consulta, 120, "busqueda");

        if (desde == null
                || hastaExclusivo == null
                || !hastaExclusivo.isAfter(desde)
                || hastaExclusivo.isAfter(desde.plusYears(10))) {

            throw badRequest(
                    "El rango de fechas de compradores no es valido.");
        }

        return ejecutar(
                () -> repository.compradoresPeriodo(
                        actor,
                        consulta,
                        pagina,
                        tamano,
                        desde,
                        hastaExclusivo),
                false);
    }

    @Transactional(readOnly = true)
    public JsonNode fuentesPeriodo(
            Long actor,
            java.time.OffsetDateTime desde,
            java.time.OffsetDateTime hastaExclusivo) {

        validarActor(actor);

        if (desde == null
                || hastaExclusivo == null
                || !hastaExclusivo.isAfter(desde)
                || hastaExclusivo.isAfter(desde.plusYears(10))) {

            throw badRequest(
                    "El rango de fechas para fuentes de captacion no es valido.");
        }

        return ejecutar(
                () -> repository.fuentesPeriodo(
                        actor,
                        desde,
                        hastaExclusivo),
                false);
    }

    @Transactional(readOnly = true)
    public JsonNode asesoresPeriodo(
            Long actor,
            java.time.OffsetDateTime desde,
            java.time.OffsetDateTime hastaExclusivo) {

        validarActor(actor);

        if (desde == null
                || hastaExclusivo == null
                || !hastaExclusivo.isAfter(desde)
                || hastaExclusivo.isAfter(desde.plusYears(10))) {

            throw badRequest(
                    "El rango de fechas para asesores no es valido.");
        }

        return ejecutar(
                () -> repository.asesoresPeriodo(
                        actor,
                        desde,
                        hastaExclusivo),
                false);
    }

    @Transactional(readOnly = true)
    public JsonNode visitasPeriodo(
            Long actor,
            java.time.OffsetDateTime desde,
            java.time.OffsetDateTime hastaExclusivo,
            Long idProspecto,
            Integer pagina,
            Integer tamano) {

        validarActor(actor);
        validarPagina(pagina, tamano);

        if (idProspecto != null && idProspecto <= 0) {
            throw badRequest("El ID del prospecto no es valido.");
        }

        if (desde == null
                || hastaExclusivo == null
                || !hastaExclusivo.isAfter(desde)
                || hastaExclusivo.isAfter(desde.plusYears(10))) {

            throw badRequest(
                    "El rango de fechas para visitas no es valido.");
        }

        return ejecutar(
                () -> repository.visitasPeriodo(
                        actor,
                        desde,
                        hastaExclusivo,
                        idProspecto,
                        pagina,
                        tamano),
                false);
    }

    @Transactional
    public JsonNode actualizarFicha(Long actor, Long prospecto, ActualizarFichaCrmRequest solicitud) {
        validarActor(actor);
        validarProspecto(prospecto);
        if (solicitud == null || (solicitud.origenCodigo() == null
                && solicitud.observaciones() == null && solicitud.idProyectoInteres() == null)) {
            throw badRequest("Indique al menos un campo del expediente CRM.");
        }
        validarTexto(solicitud.origenCodigo(), 40, "origenCodigo");
        validarTexto(solicitud.observaciones(), 2000, "observaciones");
        if (solicitud.idProyectoInteres() != null && solicitud.idProyectoInteres() <= 0) {
            throw badRequest("Proyecto de interes invalido.");
        }
        return ejecutar(() -> repository.actualizarFicha(actor, prospecto, normalizar(solicitud.origenCodigo()),
                solicitud.observaciones(), solicitud.idProyectoInteres()), false);
    }

    @Transactional
    public JsonNode desactivar(Long actor, Long prospecto, String motivo) {
        validarActor(actor);
        validarProspecto(prospecto);
        if (motivo == null || motivo.trim().length() < 10 || motivo.length() > 500) {
            throw badRequest("Debe indicar un motivo de baja entre 10 y 500 caracteres.");
        }
        return ejecutar(() -> repository.desactivar(actor, prospecto, motivo.trim()), false);
    }

    @Transactional(readOnly = true)
    public byte[] exportarCsv(Long actor, String consulta, String etapa, String categoria, Integer limite) {
        validarActor(actor);
        validarTexto(consulta, 120, "busqueda");
        validarTexto(etapa, 40, "etapa");
        categoria(categoria);
        if (limite == null || limite < 1 || limite > 5000) {
            throw badRequest("El limite de exportacion debe estar entre 1 y 5000.");
        }
        JsonNode items = ejecutar(() -> repository.exportar(actor, consulta, normalizar(etapa),
                categoria(categoria), limite), true);
        StringBuilder csv = new StringBuilder(
                "\uFEFFCodigo;Nombre;Telefono;Correo;Etapa;Categoria;Origen;Asesor;FechaRegistro\r\n");
        for (JsonNode p : items) {
            String[] campos = {
                    valor(p, "codigo"), valor(p, "nombre_completo"), valor(p, "telefono"),
                    valor(p, "email"), valor(p, "estado_nombre"), valor(p, "categoria"),
                    valor(p, "origen_nombre"), valor(p, "asesor_nombre"), valor(p, "fecha_registro")
            };
            for (int i = 0; i < campos.length; i++) {
                if (i > 0)
                    csv.append(';');
                csv.append(celda(campos[i]));
            }
            csv.append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String valor(JsonNode p, String key) {
        JsonNode value = p.path(key);
        return value.isNull() || value.isMissingNode() ? "" : value.asString();
    }

    private static String celda(String contenido) {
        String seguro = contenido == null ? "" : contenido.replace('\r', ' ').replace('\n', ' ');
        String sinEspacios = seguro.stripLeading();
        if (!sinEspacios.isEmpty() && "=+-@".indexOf(sinEspacios.charAt(0)) >= 0) {
            seguro = "'" + seguro;
        }
        return "\"" + seguro.replace("\"", "\"\"") + "\"";
    }

    private static void validarActor(Long actor) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad JWT invalida.");
        }
    }

    private static void validarProspecto(Long prospecto) {
        if (prospecto == null || prospecto <= 0)
            throw badRequest("ID de prospecto invalido.");
    }

    private static void validarBusqueda(String consulta, String etapa, String categoria, Integer pagina,
            Integer tamano) {
        validarPagina(pagina, tamano);
        validarTexto(consulta, 120, "busqueda");
        validarTexto(etapa, 40, "etapa");
        categoria(categoria);
    }

    private static void validarPagina(Integer pagina, Integer tamano) {
        if (pagina == null || pagina < 1 || pagina > 100000 || tamano == null || tamano < 1 || tamano > 100) {
            throw badRequest("Pagina entre 1-100000 y tamano entre 1-100.");
        }
    }

    private static void validarTexto(String texto, int maximo, String campo) {
        if (texto != null && texto.length() > maximo)
            throw badRequest("Campo " + campo + " demasiado largo.");
    }

    private static String normalizar(String texto) {
        return texto == null ? null : texto.trim().toUpperCase(Locale.ROOT);
    }

    private static String categoria(String categoria) {
        String limpia = categoria == null ? "TODOS" : categoria.trim().toUpperCase(Locale.ROOT);
        if (!java.util.Set.of("TODOS", "LEAD", "POTENCIAL", "COMPRADOR", "CERRADO").contains(limpia)) {
            throw badRequest("Categoria CRM no reconocida.");
        }
        return limpia;
    }

    private static ResponseStatusException badRequest(String mensaje) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
    }

    private JsonNode ejecutar(Supplier<String> operacion, boolean array) {
        final String json;
        try {
            json = operacion.get();
        } catch (DataAccessException e) {
            throw traducir(e);
        }
        if (json == null)
            throw new IllegalStateException("Respuesta nula desde el CRM.");
        try {
            JsonNode data = jsonMapper.readTree(json);
            if (data == null || (array ? !data.isArray() : !data.isObject())) {
                throw new IllegalStateException("Formato inesperado de respuesta CRM.");
            }
            return data;
        } catch (JacksonException e) {
            throw new IllegalStateException("JSON CRM invalido.", e);
        }
    }

    private static ResponseStatusException traducir(DataAccessException e) {
        StringBuilder errores = new StringBuilder();
        for (Throwable causa = e; causa != null; causa = causa.getCause()) {
            if (causa.getMessage() != null)
                errores.append(causa.getMessage()).append(' ');
        }
        String texto = errores.toString();
        if (texto.contains("DENEGADO|")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN, "Permisos CRM insuficientes.", e);
        }
        if (texto.contains("PROSPECTO_NO_EXISTE|")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "Prospecto no encontrado.", e);
        }
        if (texto.contains("VENTA_EXISTENTE|") || texto.contains("VISITAS_PENDIENTES|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "El prospecto tiene operaciones comerciales pendientes.", e);
        }
        if (texto.contains("DATOS_INVALIDOS|") || texto.contains("CATALOGO_INVALIDO|")) {
            return badRequest("Datos invalidos para el CRM.");
        }
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "No fue posible completar la operacion del CRM.", e);
    }
}
