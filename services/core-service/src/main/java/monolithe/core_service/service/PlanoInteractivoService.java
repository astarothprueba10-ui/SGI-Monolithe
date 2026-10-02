package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.LoteGeometriaRequest;
import monolithe.core_service.dto.LoteGeometriaResponse;
import monolithe.core_service.dto.PlanoInteractivoDetalleResponse;
import monolithe.core_service.dto.PlanoInteractivoRequest;
import monolithe.core_service.dto.PlanoInteractivoResponse;
import monolithe.core_service.dto.PuntoPlanoDto;
import monolithe.core_service.entity.Etapa;
import monolithe.core_service.entity.Lote;
import monolithe.core_service.entity.LoteGeometria;
import monolithe.core_service.entity.PlanoInteractivo;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.EtapaRepository;
import monolithe.core_service.repository.LoteGeometriaRepository;
import monolithe.core_service.repository.LoteRepository;
import monolithe.core_service.repository.PlanoInteractivoRepository;
import monolithe.core_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PlanoInteractivoService {

        private final PlanoInteractivoRepository planoRepo;
        private final LoteGeometriaRepository geometriaRepo;
        private final ProyectoRepository proyectoRepo;
        private final EtapaRepository etapaRepo;
        private final LoteRepository loteRepo;
        private final ObjectMapper objectMapper;

        @Transactional
        public PlanoInteractivoResponse crearVersion(PlanoInteractivoRequest request) {

                Proyecto proyecto = proyectoRepo.findById(request.idProyecto())
                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                "Proyecto no encontrado: " + request.idProyecto()));

                if (!Boolean.TRUE.equals(proyecto.getActivo())) {
                        throw new ReglaNegocioException("El proyecto no esta activo.");
                }

                Etapa etapa = resolverEtapa(request.idEtapa(), proyecto);

                String codigoNormalizado = normalizarCodigo(request.codigo());

                if (planoRepo.existsByCodigo(codigoNormalizado)) {
                        throw new ConflictoNegocioException(
                                        "Ya existe un plano con el codigo: " + codigoNormalizado);
                }

                OffsetDateTime ahora = OffsetDateTime.now(ZoneOffset.UTC);

                cerrarVigentePrevio(request.idProyecto(), request.idEtapa(), ahora);

                int siguienteVersion = calcularSiguienteVersion(
                                request.idProyecto(), request.idEtapa());

                PlanoInteractivo nuevo = new PlanoInteractivo();
                nuevo.setProyecto(proyecto);
                nuevo.setEtapa(etapa);
                nuevo.setCodigo(codigoNormalizado);
                nuevo.setNombre(request.nombre().trim());
                nuevo.setDescripcion(normalizarTexto(request.descripcion()));
                nuevo.setNumeroVersion(siguienteVersion);
                nuevo.setClaveArchivo(request.claveArchivo().trim());
                nuevo.setNombreArchivoOriginal(normalizarTexto(request.nombreArchivoOriginal()));
                nuevo.setTipoMime(normalizarTexto(request.tipoMime()));
                nuevo.setHashArchivo(normalizarTexto(request.hashArchivo()));
                nuevo.setAnchoReferencia(request.anchoReferencia());
                nuevo.setAltoReferencia(request.altoReferencia());
                nuevo.setVigente(true);
                nuevo.setFechaDesde(ahora);
                nuevo.setFechaHasta(null);
                nuevo.setObservaciones(normalizarTexto(request.observaciones()));
                nuevo.setIdUsuarioRegistro(null);

                return toPlanoResponse(planoRepo.save(nuevo));
        }

        @Transactional(readOnly = true)
        public List<PlanoInteractivoResponse> listarPorProyecto(Long idProyecto) {
                proyectoRepo.findById(idProyecto)
                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                "Proyecto no encontrado: " + idProyecto));
                return planoRepo
                                .findByProyecto_IdProyectoOrderByNumeroVersionDesc(idProyecto)
                                .stream()
                                .map(this::toPlanoResponse)
                                .toList();
        }

        // =========================================================
        // 3. OBTENER PLANO VIGENTE
        // =========================================================

        @Transactional(readOnly = true)
        public PlanoInteractivoResponse obtenerVigente(Long idProyecto, Long idEtapa) {
                return toPlanoResponse(resolverVigente(idProyecto, idEtapa));
        }

        // =========================================================
        // 4. OBTENER DETALLE VIGENTE
        // =========================================================

        @Transactional(readOnly = true)
        public PlanoInteractivoDetalleResponse obtenerDetalleVigente(
                        Long idProyecto,
                        Long idEtapa) {
                PlanoInteractivo plano = resolverVigente(idProyecto, idEtapa);

                List<LoteGeometriaResponse> geometrias = geometriaRepo
                                .findByPlanoInteractivo_IdPlanoInteractivoAndActivoTrueOrderByOrdenCapaAsc(
                                                plano.getIdPlanoInteractivo())
                                .stream()
                                .map(this::toGeometriaResponse)
                                .toList();

                return new PlanoInteractivoDetalleResponse(toPlanoResponse(plano), geometrias);
        }

        // =========================================================
        // 5. GUARDAR GEOMETRIA
        // =========================================================

        @Transactional
        public LoteGeometriaResponse guardarGeometria(LoteGeometriaRequest request) {

                PlanoInteractivo plano = planoRepo.findById(request.idPlanoInteractivo())
                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                "Plano no encontrado: " + request.idPlanoInteractivo()));

                if (!Boolean.TRUE.equals(plano.getVigente())) {
                        throw new ReglaNegocioException(
                                        "Solo se pueden modificar geometrias de un plano vigente");
                }

                Lote lote = loteRepo.findById(request.idLote())
                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                "Lote no encontrado: " + request.idLote()));

                validarLotePertenecePlano(lote, plano);
                validarPuntos(request, plano);
                validarEtiqueta(request, plano);

                Optional<LoteGeometria> existente = geometriaRepo
                                .findByPlanoInteractivo_IdPlanoInteractivoAndLote_IdLote(
                                                plano.getIdPlanoInteractivo(), lote.getIdLote());

                LoteGeometria geometria = existente.orElseGet(() -> {
                        LoteGeometria nueva = new LoteGeometria();
                        nueva.setProyecto(plano.getProyecto());
                        nueva.setPlanoInteractivo(plano);
                        nueva.setLote(lote);
                        nueva.setActivo(true);
                        return nueva;
                });

                geometria.setPuntos(toJsonNode(request.puntos()));
                geometria.setEtiquetaX(request.etiquetaX());
                geometria.setEtiquetaY(request.etiquetaY());
                geometria.setRotacionEtiqueta(
                                request.rotacionEtiqueta() != null
                                                ? request.rotacionEtiqueta()
                                                : BigDecimal.ZERO);
                geometria.setOrdenCapa(request.ordenCapa() != null ? request.ordenCapa() : 0);
                geometria.setVisible(request.visible() != null ? request.visible() : true);
                geometria.setInteractivo(
                                request.interactivo() != null ? request.interactivo() : true);
                geometria.setObservaciones(normalizarTexto(request.observaciones()));

                if (!Boolean.TRUE.equals(geometria.getActivo())) {
                        geometria.setActivo(true);
                }

                return toGeometriaResponse(geometriaRepo.save(geometria));
        }

        // =========================================================
        // 6. DESACTIVAR GEOMETRIA
        // =========================================================

        @Transactional
        public void desactivarGeometria(Long idLoteGeometria) {

                LoteGeometria geometria = geometriaRepo.findById(idLoteGeometria)
                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                "Geometria no encontrada: " + idLoteGeometria));

                if (!Boolean.TRUE.equals(
                                geometria.getPlanoInteractivo().getVigente())) {
                        throw new ReglaNegocioException(
                                        "Solo se pueden modificar geometrias de un plano vigente");
                }

                geometria.setActivo(false);
                geometriaRepo.save(geometria);
        }

        // =========================================================
        // HELPERS PRIVADOS
        // =========================================================

        private Etapa resolverEtapa(Long idEtapa, Proyecto proyecto) {
                if (idEtapa == null) {
                        return null;
                }
                Etapa etapa = etapaRepo.findById(idEtapa)
                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                "Etapa no encontrada: " + idEtapa));
                if (!Boolean.TRUE.equals(etapa.getActivo())) {
                        throw new ReglaNegocioException("La etapa no esta activa.");
                }
                if (!etapa.getProyecto().getIdProyecto().equals(proyecto.getIdProyecto())) {
                        throw new ReglaNegocioException(
                                        "La etapa no pertenece al proyecto indicado.");
                }
                return etapa;
        }

        private void cerrarVigentePrevio(
                        Long idProyecto,
                        Long idEtapa,
                        OffsetDateTime ahora) {
                Optional<PlanoInteractivo> vigente = idEtapa == null
                                ? planoRepo.findFirstByProyecto_IdProyectoAndEtapaIsNullAndVigenteTrue(
                                                idProyecto)
                                : planoRepo.findFirstByProyecto_IdProyectoAndEtapa_IdEtapaAndVigenteTrue(
                                                idProyecto, idEtapa);

                vigente.ifPresent(p -> {
                        p.setVigente(false);
                        p.setFechaHasta(ahora);
                        planoRepo.save(p);
                        planoRepo.flush();
                });
        }

        private int calcularSiguienteVersion(Long idProyecto, Long idEtapa) {
                Optional<PlanoInteractivo> ultimo = idEtapa == null
                                ? planoRepo
                                                .findFirstByProyecto_IdProyectoAndEtapaIsNullOrderByNumeroVersionDesc(
                                                                idProyecto)
                                : planoRepo
                                                .findFirstByProyecto_IdProyectoAndEtapa_IdEtapaOrderByNumeroVersionDesc(
                                                                idProyecto, idEtapa);
                return ultimo.map(p -> p.getNumeroVersion() + 1).orElse(1);
        }

        private PlanoInteractivo resolverVigente(Long idProyecto, Long idEtapa) {
                return idEtapa == null
                                ? planoRepo
                                                .findFirstByProyecto_IdProyectoAndEtapaIsNullAndVigenteTrue(
                                                                idProyecto)
                                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                                "No existe plano vigente para el proyecto: "
                                                                                + idProyecto))
                                : planoRepo
                                                .findFirstByProyecto_IdProyectoAndEtapa_IdEtapaAndVigenteTrue(
                                                                idProyecto, idEtapa)
                                                .orElseThrow(() -> new RecursoNoEncontradoException(
                                                                "No existe plano vigente para proyecto "
                                                                                + idProyecto + " y etapa " + idEtapa));
        }

        private void validarLotePertenecePlano(Lote lote, PlanoInteractivo plano) {
                if (!lote.getIdProyecto().equals(plano.getProyecto().getIdProyecto())) {
                        throw new ReglaNegocioException(
                                        "El lote no pertenece al proyecto del plano.");
                }
                if (plano.getEtapa() == null) {
                        return;
                }
                Long idEtapaPlano = plano.getEtapa().getIdEtapa();
                Long idEtapaLote = lote.getManzana().getEtapa().getIdEtapa();
                if (!idEtapaPlano.equals(idEtapaLote)) {
                        throw new ReglaNegocioException(
                                        "El lote no pertenece a la etapa del plano.");
                }
        }

        private void validarPuntos(LoteGeometriaRequest request, PlanoInteractivo plano) {
                if (request.puntos() == null || request.puntos().size() < 3) {
                        throw new ReglaNegocioException(
                                        "La geometria debe tener al menos 3 puntos.");
                }
                BigDecimal ancho = plano.getAnchoReferencia();
                BigDecimal alto = plano.getAltoReferencia();
                for (PuntoPlanoDto punto : request.puntos()) {

                        if (punto == null || punto.x() == null || punto.y() == null) {
                                throw new ReglaNegocioException(
                                                "La geometria contiene puntos invalidos");
                        }

                        boolean fueraRango = punto.x().compareTo(BigDecimal.ZERO) < 0
                                        || punto.y().compareTo(BigDecimal.ZERO) < 0
                                        || punto.x().compareTo(ancho) > 0
                                        || punto.y().compareTo(alto) > 0;

                        if (fueraRango) {
                                throw new ReglaNegocioException(
                                                "La geometria contiene puntos fuera de las dimensiones del plano");
                        }
                }
        }

        private void validarEtiqueta(LoteGeometriaRequest request, PlanoInteractivo plano) {
                BigDecimal ex = request.etiquetaX();
                BigDecimal ey = request.etiquetaY();
                if (ex == null && ey == null) {
                        return;
                }

                if (ex == null || ey == null) {
                        throw new ReglaNegocioException(
                                        "Las coordenadas de la etiqueta deben informarse juntas");
                }
                BigDecimal ancho = plano.getAnchoReferencia();
                BigDecimal alto = plano.getAltoReferencia();
                boolean fueraRango = ex.compareTo(BigDecimal.ZERO) < 0
                                || ey.compareTo(BigDecimal.ZERO) < 0
                                || ex.compareTo(ancho) > 0
                                || ey.compareTo(alto) > 0;
                if (fueraRango) {
                        throw new ReglaNegocioException(
                                        "La etiqueta se encuentra fuera de las dimensiones del plano");
                }
        }

        // =========================================================
        // MAPPERS PRIVADOS
        // =========================================================

        private PlanoInteractivoResponse toPlanoResponse(PlanoInteractivo plano) {
                Etapa etapa = plano.getEtapa();
                return new PlanoInteractivoResponse(
                                plano.getIdPlanoInteractivo(),
                                plano.getProyecto().getIdProyecto(),
                                plano.getProyecto().getCodigo(),
                                plano.getProyecto().getNombre(),
                                etapa != null ? etapa.getIdEtapa() : null,
                                etapa != null ? etapa.getCodigo() : null,
                                etapa != null ? etapa.getNombre() : null,
                                plano.getCodigo(),
                                plano.getNombre(),
                                plano.getDescripcion(),
                                plano.getNumeroVersion(),
                                plano.getClaveArchivo(),
                                plano.getNombreArchivoOriginal(),
                                plano.getTipoMime(),
                                plano.getHashArchivo(),
                                plano.getAnchoReferencia(),
                                plano.getAltoReferencia(),
                                plano.getVigente(),
                                plano.getFechaDesde(),
                                plano.getFechaHasta(),
                                plano.getObservaciones());
        }

        private LoteGeometriaResponse toGeometriaResponse(LoteGeometria geometria) {
                List<PuntoPlanoDto> puntos = objectMapper.convertValue(
                                geometria.getPuntos(),
                                objectMapper.constructType(
                                                objectMapper.getTypeFactory()
                                                                .constructCollectionType(List.class,
                                                                                PuntoPlanoDto.class)));
                Lote lote = geometria.getLote();
                PlanoInteractivo plano = geometria.getPlanoInteractivo();
                return new LoteGeometriaResponse(
                                geometria.getIdLoteGeometria(),
                                geometria.getProyecto().getIdProyecto(),
                                plano.getIdPlanoInteractivo(),
                                plano.getCodigo(),
                                plano.getNombre(),
                                lote.getIdLote(),
                                lote.getCodigo(),
                                lote.getNumero(),
                                puntos,
                                geometria.getEtiquetaX(),
                                geometria.getEtiquetaY(),
                                geometria.getRotacionEtiqueta(),
                                geometria.getOrdenCapa(),
                                geometria.getVisible(),
                                geometria.getInteractivo(),
                                geometria.getObservaciones(),
                                geometria.getActivo());
        }

        private JsonNode toJsonNode(List<PuntoPlanoDto> puntos) {
                return objectMapper.valueToTree(puntos);
        }

        private String normalizarCodigo(String valor) {
                return valor.trim().toUpperCase(Locale.ROOT);
        }

        private String normalizarTexto(String valor) {
                if (valor == null) {
                        return null;
                }
                String trimmed = valor.trim();
                return trimmed.isEmpty() ? null : trimmed;
        }
}
