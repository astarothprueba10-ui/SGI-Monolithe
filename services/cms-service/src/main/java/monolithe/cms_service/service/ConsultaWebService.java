package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ConsultaWebRequest;
import monolithe.cms_service.dto.ConsultaWebResponse;
import monolithe.cms_service.entity.ConsultaWeb;
import monolithe.cms_service.entity.EstadoConsultaWeb;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.ConsultaWebRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Servicio de negocio para la gestión y captura
 * de consultas web y leads comerciales.
 */
@Service
@RequiredArgsConstructor
public class ConsultaWebService {

    private final ConsultaWebRepository consultaWebRepository;
    private final EstadoService estadoService;
    private final PaginaRepository paginaRepository;
    private final ProyectoRepository proyectoRepository;

    /**
     * Registra una nueva consulta proveniente de la web pública.
     */
    @Transactional
    public ConsultaWebResponse registrarConsulta(
            ConsultaWebRequest request) {

        validarReferencias(request);

        EstadoConsultaWeb estadoInicial =
                estadoService.obtenerConsultaNueva();

        ConsultaWeb consulta = new ConsultaWeb();

        consulta.setIdEstadoConsultaWeb(
                estadoInicial.getIdEstadoConsultaWeb()
        );

        consulta.setCodigo(
                generarCodigoSeguimiento()
        );

        consulta.setNombres(
                request.getNombre().trim()
        );

        consulta.setCorreo(
                limpiar(request.getCorreo())
        );

        consulta.setTelefono(
                limpiar(request.getTelefono())
        );

        consulta.setIdProyecto(
                request.getIdProyecto()
        );

        consulta.setIdPagina(
                request.getIdPagina()
        );

        consulta.setAsunto(
                limpiar(request.getAsunto()) != null
                        ? limpiar(request.getAsunto())
                        : "Consulta General"
        );

        consulta.setMensaje(
                request.getMensaje().trim()
        );

        consulta.setAceptaPrivacidad(
                Boolean.TRUE.equals(
                        request.getAceptaPrivacidad()
                )
        );

        consulta.setUtmSource(
                limpiar(request.getUtmOrigen())
        );

        consulta.setUtmMedium(
                limpiar(request.getUtmMedio())
        );

        consulta.setUtmCampaign(
                limpiar(request.getUtmCampana())
        );

        consulta.setFechaRecepcion(
                OffsetDateTime.now(ZoneOffset.UTC)
        );

        ConsultaWeb guardada =
                consultaWebRepository.save(consulta);

        return ConsultaWebResponse.builder()
                .idConsulta(
                        guardada.getIdConsultaWeb()
                )
                .codigo(
                        guardada.getCodigo()
                )
                .nombre(
                        guardada.getNombres()
                )
                .correo(
                        guardada.getCorreo()
                )
                .telefono(
                        guardada.getTelefono()
                )
                .idProyecto(
                        guardada.getIdProyecto()
                )
                .fechaRecepcion(
                        guardada.getFechaRecepcion()
                )
                .mensaje(
                        "¡Gracias por contactarnos! Tu consulta ha sido recibida con éxito."
                )
                .build();
    }

    private void validarReferencias(
            ConsultaWebRequest request) {

        if (request.getIdPagina() != null) {

            paginaRepository
                    .findById(request.getIdPagina())
                    .filter(pagina ->
                            Boolean.TRUE.equals(
                                    pagina.getActivo()
                            )
                    )
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "No existe una página activa con id: "
                                            + request.getIdPagina()
                            )
                    );
        }

        if (request.getIdProyecto() != null) {

            proyectoRepository
                    .findById(request.getIdProyecto())
                    .filter(proyecto ->
                            Boolean.TRUE.equals(
                                    proyecto.getActivo()
                            )
                    )
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "No existe un proyecto activo con id: "
                                            + request.getIdProyecto()
                            )
                    );
        }
    }

    private String generarCodigoSeguimiento() {

        String fecha =
                OffsetDateTime
                        .now(ZoneOffset.UTC)
                        .format(
                                DateTimeFormatter.ofPattern(
                                        "yyyyMMdd"
                                )
                        );

        String suffix =
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 8)
                        .toUpperCase();

        return "CW-" + fecha + "-" + suffix;
    }

    private String limpiar(String valor) {

        if (valor == null) {
            return null;
        }

        String resultado =
                valor.trim();

        return resultado.isEmpty()
                ? null
                : resultado;
    }
}