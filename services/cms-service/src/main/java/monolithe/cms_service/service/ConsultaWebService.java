package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.*;
import monolithe.cms_service.entity.ConsultaWeb;
import monolithe.cms_service.repository.*;
import monolithe.cms_service.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ConsultaWebService {
    private final ConsultaWebRepository consultaWebRepository;
    private final CaptacionRepository captacionRepository;
    private final CaptacionService captacionService;
    private final EstadoService estadoService;
    private final PaginaRepository paginaRepository;

    @Transactional
    public ConsultaWebResponse registrarConsulta(ConsultaWebRequest request) {
        validarPagina(request.getIdPagina());
        captacionRepository.bloquear(request.getIdSolicitud());
        Long anterior = captacionRepository.consultaAnterior(request.getIdSolicitud());
        ConsultaWeb consulta = anterior == null ? crear(request) : consultaWebRepository.findById(anterior).orElseThrow();
        captacionService.registrar(request, null, consulta.getIdConsultaWeb());
        return respuesta(consulta);
    }
    private ConsultaWeb crear(ConsultaWebRequest r) {
        ConsultaWeb c = new ConsultaWeb();
        c.setIdEstadoConsultaWeb(estadoService.obtenerConsultaNueva().getIdEstadoConsultaWeb());
        c.setCodigo("CW-" + UUID.randomUUID().toString().replace("-", ""));
        c.setNombres(r.getNombre());
        c.setCorreo(r.getCorreo().trim().toLowerCase(java.util.Locale.ROOT));
        c.setTelefono(r.getTelefono().replaceAll("[ ()-]", ""));
        c.setIdProyecto(r.getIdProyecto()); c.setIdPagina(r.getIdPagina());
        c.setAsunto(r.getMotivoContacto().trim()); c.setMensaje(r.getMensaje());
        c.setAceptaPrivacidad(r.getAceptaPrivacidad());
        c.setUtmSource(r.getUtmOrigen()); c.setUtmMedium(r.getUtmMedio()); c.setUtmCampaign(r.getUtmCampana());
        c.setFechaRecepcion(OffsetDateTime.now(java.time.ZoneOffset.UTC));
        return consultaWebRepository.saveAndFlush(c);
    }
    private void validarPagina(Long id) {
        if (id != null) paginaRepository.findById(id).filter(p -> Boolean.TRUE.equals(p.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException("La página no está disponible"));
    }
    private ConsultaWebResponse respuesta(ConsultaWeb c) {
        return ConsultaWebResponse.builder().idConsulta(c.getIdConsultaWeb()).codigo(ReferenciaConsulta.formatear(c.getIdConsultaWeb()))
                .nombre(c.getNombres()).correo(c.getCorreo()).telefono(c.getTelefono()).idProyecto(c.getIdProyecto())
                .fechaRecepcion(c.getFechaRecepcion()).mensaje("Tu solicitud ha sido recibida para atención comercial.").build();
    }
}
