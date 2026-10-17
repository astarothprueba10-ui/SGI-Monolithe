package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.*;
import monolithe.cms_service.repository.CaptacionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class CaptacionService {
    private final CaptacionRepository repository;
    private final ObjectMapper mapper;
    public String datos(CaptacionRequest request) {
        var datos = mapper.valueToTree(request);
        if (request instanceof ConsultaWebRequest)
            ((tools.jackson.databind.node.ObjectNode) datos).put("origenCodigo", "WEB");
        return datos.toString();
    }
    public CaptacionResultado registrar(CaptacionRequest request, Long actor, Long consulta) {
        var resultado = mapper.readValue(repository.registrar(request.getIdSolicitud(), actor, consulta, datos(request)), CaptacionResultado.class);
        if (resultado == null || resultado.estado() == null || resultado.estado().isBlank() || resultado.idCaptacion() == null || resultado.idCaptacion() <= 0)
            throw new IllegalStateException("No se recibió una confirmación válida del registro.");
        if ("REGISTRADO".equals(resultado.estado()) && (resultado.idPersona() == null || resultado.idProspecto() == null
                || resultado.idPersona() <= 0 || resultado.idProspecto() <= 0))
            throw new IllegalStateException("No se confirmó la integración al CRM.");
        return resultado;
    }
    @Transactional
    public CaptacionResultado registrarInterna(CaptacionInternaRequest request, Long actor) {
        repository.autorizar(actor, "crm.create");
        return registrar(request, actor, null);
    }
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(Long actor, Long antes) {
        repository.autorizar(actor, "crm.view");
        return repository.prospectos(antes);
    }
    @Transactional(readOnly = true)
    public List<Map<String, Object>> proyectos(Long actor, Long despues) {
        repository.autorizar(actor, "crm.create");
        return repository.proyectos(despues);
    }
}
