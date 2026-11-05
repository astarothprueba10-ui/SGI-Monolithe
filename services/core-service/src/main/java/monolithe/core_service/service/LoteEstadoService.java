package monolithe.core_service.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.CambiarEstadoLoteRequest;
import monolithe.core_service.dto.CambioEstadoLoteResponse;
import monolithe.core_service.dto.LoteHistorialEstadoResponse;
import monolithe.core_service.entity.EstadoLote;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.EstadoLoteRepository;
import monolithe.core_service.repository.LoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class LoteEstadoService {

        private final LoteRepository loteRepository;
        private final EstadoLoteRepository estadoLoteRepository;
        private final EntityManager entityManager;
        private final ObjectMapper objectMapper;

        @Transactional
        public CambioEstadoLoteResponse cambiarEstado(
                        Long idLote,
                        Long idUsuario,
                        CambiarEstadoLoteRequest request) {
                if (!loteRepository.existsById(idLote)) {
                        throw new RecursoNoEncontradoException(
                                        "Lote no encontrado: " + idLote);
                }

                String codigoNuevoEstado = request.codigoNuevoEstado().trim().toUpperCase(Locale.ROOT);

                EstadoLote estadoLote = estadoLoteRepository
                                .findByCodigo(codigoNuevoEstado)
                                .orElseThrow(() -> new ReglaNegocioException(
                                                "El estado especificado no es valido"));

                if (!Boolean.TRUE.equals(estadoLote.getActivo())) {
                        throw new ReglaNegocioException(
                                        "El estado especificado no esta activo");
                }

                String motivo = normalizarMotivo(request.motivo());
                if ("DISPONIBLE".equals(codigoNuevoEstado)) {
                        validarPrecioParaHabilitar(idLote);
                }

                String jsonResultado = ejecutarFuncionPostgres(
                                idLote, idUsuario, codigoNuevoEstado, motivo);

                CambioEstadoLoteResponse respuesta = parsearRespuesta(jsonResultado);

                entityManager.clear();

                return respuesta;
        }

        @Transactional(readOnly = true)
        public List<LoteHistorialEstadoResponse> listarHistorial(
                        Long idLote,
                        Long idActor) {

                String resultado = (String) entityManager.createNativeQuery(
                                "SELECT public.sp_lotes_listar_historial_estados_v1(" +
                                                ":idActor, :idLote)::text")
                                .setParameter("idActor", idActor)
                                .setParameter("idLote", idLote)
                                .getSingleResult();

                try {
                        return objectMapper.readValue(
                                        resultado,
                                        new tools.jackson.core.type.TypeReference<List<LoteHistorialEstadoResponse>>() {
                                        });
                } catch (Exception ex) {
                        throw new IllegalStateException(
                                        "No fue posible interpretar el historial del lote.",
                                        ex);
                }
        }

        // HELPERS PRIVADOS

        private void validarPrecioParaHabilitar(Long idLote) {

                Number cantidad = (Number) entityManager.createNativeQuery("""
                                SELECT COUNT(*)
                                FROM public.inm_lotes_precios p
                                INNER JOIN public.cfg_monedas m
                                    ON m.id_moneda = p.id_moneda
                                WHERE p.id_lote = :idLote
                                  AND p.activo = TRUE
                                  AND p.precio > 0
                                  AND p.fecha_desde <= NOW()
                                  AND (
                                      p.fecha_hasta IS NULL
                                      OR p.fecha_hasta > NOW()
                                  )
                                  AND m.activo = TRUE
                                  AND TRIM(m.codigo) = 'PEN'
                                """)
                                .setParameter("idLote", idLote)
                                .getSingleResult();

                if (cantidad.longValue() != 1L) {
                        throw new ReglaNegocioException(
                                        "No se puede habilitar el lote. " +
                                                        "Debe tener exactamente un precio oficial " +
                                                        "vigente en soles. Configure primero su precio.");
                }
        }

        private String ejecutarFuncionPostgres(
                        Long idLote,
                        Long idUsuario,
                        String codigoEstado,
                        String motivo) {
                jakarta.persistence.Query query = entityManager.createNativeQuery(
                                "SELECT sp_cambiar_estado_lote("
                                                + ":idLote, "
                                                + ":codigoEstado, "
                                                + ":idUsuario, "
                                                + ":motivo"
                                                + ")::text");
                query.setParameter("idLote", idLote);
                query.setParameter("codigoEstado", codigoEstado);
                query.setParameter("idUsuario", idUsuario);
                query.setParameter("motivo", motivo);
                return (String) query.getSingleResult();
        }

        private CambioEstadoLoteResponse parsearRespuesta(String json) {
                try {
                        JsonNode nodo = objectMapper.readTree(json);

                        boolean success = nodo.path("success").asBoolean(false);
                        String message = nodo.hasNonNull("message")
                                        ? nodo.get("message").asString()
                                        : null;

                        if (!success) {
                                String mensajeError = (message != null && !message.isBlank())
                                                ? message
                                                : "Cambio de estado rechazado";
                                throw new ReglaNegocioException(mensajeError);
                        }

                        Long idLoteResp = nodo.hasNonNull("id_lote")
                                        ? nodo.get("id_lote").asLong()
                                        : null;
                        String nuevoEstado = nodo.hasNonNull("nuevo_estado")
                                        ? nodo.get("nuevo_estado").asString()
                                        : null;

                        return new CambioEstadoLoteResponse(success, message, idLoteResp, nuevoEstado);

                } catch (ReglaNegocioException e) {
                        throw e;
                } catch (Exception e) {
                        throw new IllegalStateException(
                                        "No fue posible interpretar la respuesta del cambio de estado del lote",
                                        e);
                }
        }

        private String normalizarMotivo(String motivo) {
                if (motivo == null) {
                        return "Cambio de estado operativo";
                }
                String trimmed = motivo.trim();
                return trimmed.isEmpty() ? "Cambio de estado operativo" : trimmed;
        }
}