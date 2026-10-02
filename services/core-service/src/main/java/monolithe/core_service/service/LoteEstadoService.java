package monolithe.core_service.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.CambiarEstadoLoteRequest;
import monolithe.core_service.dto.CambioEstadoLoteResponse;
import monolithe.core_service.dto.LoteHistorialEstadoResponse;
import monolithe.core_service.entity.EstadoLote;
import monolithe.core_service.entity.LoteHistorialEstado;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.EstadoLoteRepository;
import monolithe.core_service.repository.LoteHistorialEstadoRepository;
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
        private final LoteHistorialEstadoRepository loteHistorialEstadoRepository;
        private final EntityManager entityManager;
        private final ObjectMapper objectMapper;

        // =========================================================
        // 1. CAMBIAR ESTADO DEL LOTE
        // =========================================================

        @Transactional
        public CambioEstadoLoteResponse cambiarEstado(
                        Long idLote,
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

                String jsonResultado = ejecutarFuncionPostgres(
                                idLote, codigoNuevoEstado, motivo);

                CambioEstadoLoteResponse respuesta = parsearRespuesta(jsonResultado);

                entityManager.clear();

                return respuesta;
        }

        // =========================================================
        // 2. CONSULTAR HISTORIAL
        // =========================================================

        @Transactional(readOnly = true)
        public List<LoteHistorialEstadoResponse> listarHistorial(Long idLote) {
                if (!loteRepository.existsById(idLote)) {
                        throw new RecursoNoEncontradoException(
                                        "Lote no encontrado: " + idLote);
                }
                return loteHistorialEstadoRepository
                                .findByLote_IdLoteOrderByFechaCambioDesc(idLote)
                                .stream()
                                .map(this::toHistorialResponse)
                                .toList();
        }

        // =========================================================
        // HELPERS PRIVADOS
        // =========================================================

        private String ejecutarFuncionPostgres(
                        Long idLote,
                        String codigoEstado,
                        String motivo) {
                jakarta.persistence.Query query = entityManager.createNativeQuery(
                                "SELECT sp_cambiar_estado_lote("
                                                + ":idLote, "
                                                + ":codigoEstado, "
                                                + "CAST(NULL AS BIGINT), "
                                                + ":motivo"
                                                + ")::text");
                query.setParameter("idLote", idLote);
                query.setParameter("codigoEstado", codigoEstado);
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

        private LoteHistorialEstadoResponse toHistorialResponse(
                        LoteHistorialEstado historial) {
                EstadoLote anterior = historial.getEstadoAnterior();
                EstadoLote nuevo = historial.getEstadoNuevo();

                return new LoteHistorialEstadoResponse(
                                historial.getIdHistorial(),
                                historial.getLote().getIdLote(),
                                historial.getLote().getCodigo(),
                                historial.getLote().getNumero(),
                                anterior != null ? anterior.getIdEstadoLote() : null,
                                anterior != null ? anterior.getCodigo() : null,
                                anterior != null ? anterior.getNombre() : null,
                                nuevo.getIdEstadoLote(),
                                nuevo.getCodigo(),
                                nuevo.getNombre(),
                                historial.getMotivo(),
                                historial.getFechaCambio(),
                                historial.getIdUsuario());
        }

        private String normalizarMotivo(String motivo) {
                if (motivo == null) {
                        return "Cambio de estado operativo";
                }
                String trimmed = motivo.trim();
                return trimmed.isEmpty() ? "Cambio de estado operativo" : trimmed;
        }
}