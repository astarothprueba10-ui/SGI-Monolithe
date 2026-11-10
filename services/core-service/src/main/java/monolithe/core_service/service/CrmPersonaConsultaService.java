package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.client.ConsultaDniClient;
import monolithe.core_service.dto.ConsultaPersonaCrmRequest;
import monolithe.core_service.dto.ConsultaPersonaCrmResponse;
import monolithe.core_service.exception.ConsultaIdentidadNoDisponibleException;
import monolithe.core_service.repository.CrmPersonaConsultaRepository;
import org.springframework.stereotype.Service;

/** Resuelve nombres locales y utiliza el proveedor externo únicamente para DNI nuevos. */
@Service
@RequiredArgsConstructor
public class CrmPersonaConsultaService {
    private final CrmPersonaConsultaRepository repository;
    private final ConsultaDniClient dniClient;

    /** Valida el documento y conserva el registro manual si no se obtiene información. */
    public ConsultaPersonaCrmResponse consultar(ConsultaPersonaCrmRequest documento) {
        DocumentoConsultaCrm.validar(documento.tipoDocumento(), documento.numeroDocumento());
        var local = repository.buscar(documento.tipoDocumento(), documento.numeroDocumento());
        if (local.isPresent()) return ConsultaPersonaCrmResponse.encontrada(documento, local.get(), "MONOLITHE");
        if (!"DNI".equals(documento.tipoDocumento())) return noEncontrada(documento);
        try {
            return dniClient.consultar(documento.numeroDocumento())
                    .map(persona -> ConsultaPersonaCrmResponse.encontrada(documento, persona, "DNI"))
                    .orElseGet(() -> noEncontrada(documento));
        } catch (ConsultaIdentidadNoDisponibleException ex) {
            return ConsultaPersonaCrmResponse.sinDatos(documento, "NO_DISPONIBLE",
                    "La consulta de identidad no está disponible. Puedes completar los datos manualmente.");
        }
    }

    private ConsultaPersonaCrmResponse noEncontrada(ConsultaPersonaCrmRequest documento) {
        return ConsultaPersonaCrmResponse.sinDatos(documento, "NO_ENCONTRADO",
                "No encontramos datos para este documento. Completa los datos de la persona manualmente.");
    }
}
