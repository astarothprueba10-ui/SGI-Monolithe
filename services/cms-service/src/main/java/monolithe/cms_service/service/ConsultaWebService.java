package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ConsultaWebRequest;
import monolithe.cms_service.dto.ConsultaWebResponse;
import monolithe.cms_service.entity.ConsultaWeb;
import monolithe.cms_service.entity.EstadoConsultaWeb;
import monolithe.cms_service.repository.ConsultaWebRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Servicio de negocio para la gestión y captura de consultas web y leads comerciales en Supabase.
 */
@Service
@RequiredArgsConstructor
public class ConsultaWebService {

    private final ConsultaWebRepository consultaWebRepository;
    private final EstadoService estadoService;

    /**
     * Registra una nueva consulta o lead proveniente de la web pública.
     */
    @Transactional
    public ConsultaWebResponse registrarConsulta(ConsultaWebRequest request) {
        EstadoConsultaWeb estadoInicial = estadoService.obtenerConsultaNueva();

        ConsultaWeb consulta = new ConsultaWeb();
        consulta.setIdEstadoConsultaWeb(estadoInicial.getIdEstadoConsultaWeb());
        consulta.setCodigo(generarCodigoSeguimiento());
        consulta.setNombres(request.getNombre().trim());
        consulta.setCorreo(request.getCorreo() != null ? request.getCorreo().trim() : null);
        consulta.setTelefono(request.getTelefono() != null ? request.getTelefono().trim() : null);
        consulta.setIdProyecto(request.getIdProyecto());
        consulta.setIdPagina(request.getIdPagina());
        consulta.setAsunto(request.getAsunto() != null ? request.getAsunto().trim() : "Consulta General");
        consulta.setMensaje(request.getMensaje().trim());
        consulta.setAceptaPrivacidad(Boolean.TRUE.equals(request.getAceptaPrivacidad()));
        consulta.setUtmSource(request.getUtmOrigen());
        consulta.setUtmMedium(request.getUtmMedio());
        consulta.setUtmCampaign(request.getUtmCampana());
        consulta.setFechaRecepcion(OffsetDateTime.now());

        ConsultaWeb guardada = consultaWebRepository.save(consulta);

        return ConsultaWebResponse.builder()
                .idConsulta(guardada.getIdConsultaWeb())
                .codigo(guardada.getCodigo())
                .nombre(guardada.getNombres())
                .correo(guardada.getCorreo())
                .telefono(guardada.getTelefono())
                .idProyecto(guardada.getIdProyecto())
                .fechaRecepcion(guardada.getFechaRecepcion())
                .mensaje("¡Gracias por contactarnos! Tu consulta ha sido recibida con éxito.")
                .build();
    }

    private String generarCodigoSeguimiento() {
        String timestamp = OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "CW-" + timestamp + "-" + suffix;
    }
}
