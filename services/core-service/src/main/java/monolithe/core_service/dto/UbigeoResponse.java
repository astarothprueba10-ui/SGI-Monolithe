package monolithe.core_service.dto;

/** Fila del catálogo UBIGEO peruano, con código de seis dígitos y nombres oficiales. */
public record UbigeoResponse(String codigo, String departamento, String provincia, String distrito) {
}
