package monolithe.core_service.service;

import monolithe.core_service.exception.ReglaNegocioException;
import java.util.Map;

/** Formatos admitidos por el registro y la consulta de identidad del CRM. */
public final class DocumentoConsultaCrm {
    private static final Map<String, String> FORMATOS = Map.of(
            "DNI", "[0-9]{8}", "RUC", "[0-9]{11}", "CE", "[0-9]{9,12}", "PASAPORTE", "[A-Z0-9]{6,20}");

    private DocumentoConsultaCrm() {
    }

    /** Rechaza tipos desconocidos y números incompletos antes de consultar servicios. */
    public static void validar(String tipo, String numero) {
        String formato = tipo == null ? null : FORMATOS.get(tipo);
        if (formato == null || numero == null || !numero.matches(formato)) {
            throw new ReglaNegocioException("Selecciona un tipo y número de documento válidos para consultar.");
        }
    }
}
