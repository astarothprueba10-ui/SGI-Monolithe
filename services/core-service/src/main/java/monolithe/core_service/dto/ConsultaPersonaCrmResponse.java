package monolithe.core_service.dto;

/** Resultado de consulta sin exponer datos de contacto ni credenciales del proveedor. */
public record ConsultaPersonaCrmResponse(String tipoDocumento, String numeroDocumento, String estado,
                                       String fuente, DatosPersonaCrm persona, String mensaje) {
    /** Construye la respuesta que permite revisar los nombres recuperados. */
    public static ConsultaPersonaCrmResponse encontrada(ConsultaPersonaCrmRequest documento,
                                                        DatosPersonaCrm persona, String fuente) {
        return new ConsultaPersonaCrmResponse(documento.tipoDocumento(), documento.numeroDocumento(),
                "ENCONTRADO", fuente, persona, "Datos encontrados. Revisa los nombres antes de registrar el lead.");
    }

    /** Permite continuar el registro manual cuando no se obtienen datos. */
    public static ConsultaPersonaCrmResponse sinDatos(ConsultaPersonaCrmRequest documento, String estado, String mensaje) {
        return new ConsultaPersonaCrmResponse(documento.tipoDocumento(), documento.numeroDocumento(),
                estado, null, null, mensaje);
    }
}
