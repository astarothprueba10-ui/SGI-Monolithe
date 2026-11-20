package monolithe.core_service.dto;

import tools.jackson.databind.JsonNode;

/** Distingue una persona persistida de los nombres obtenidos del proveedor DNI. */
public record ConsultaPersonaTrabajadorResponse(int idTipoDocumento, String numeroDocumento, String estado,
        String fuente, DatosPersonaCrm persona, JsonNode personaRegistrada, String mensaje) {
    /** Devuelve nombres y conserva la identidad local cuando requiere confirmación. */
    public static ConsultaPersonaTrabajadorResponse encontrada(ConsultaPersonaTrabajadorRequest request,
            DatosPersonaCrm persona, JsonNode registrada) {
        return new ConsultaPersonaTrabajadorResponse(request.idTipoDocumento(), request.numeroDocumento(), "ENCONTRADO",
                registrada == null ? "DNI" : "MONOLITHE", persona, registrada,
                registrada == null ? "Datos del DNI encontrados. Revisa los nombres antes de guardar."
                        : "Persona registrada en Monolithe. Confirma que los datos correspondan a esta persona.");
    }

    /** Informa una consulta sin resultado manteniendo disponible el registro manual. */
    public static ConsultaPersonaTrabajadorResponse sinDatos(ConsultaPersonaTrabajadorRequest request, String estado) {
        return new ConsultaPersonaTrabajadorResponse(request.idTipoDocumento(), request.numeroDocumento(), estado, "", null, null,
                "NO_DISPONIBLE".equals(estado) ? "La consulta no está disponible. Puedes completar los datos manualmente."
                        : "No se encontraron datos. Puedes completar los datos manualmente.");
    }
}
