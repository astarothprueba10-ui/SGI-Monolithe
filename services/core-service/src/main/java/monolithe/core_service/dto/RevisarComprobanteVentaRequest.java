package monolithe.core_service.dto;

/** Decisión documental: aprobar el soporte no confirma el dinero. */
public record RevisarComprobanteVentaRequest(Boolean aprobar, String motivo) {}
