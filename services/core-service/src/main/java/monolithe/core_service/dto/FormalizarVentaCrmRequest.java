package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import tools.jackson.databind.JsonNode;

public record FormalizarVentaCrmRequest(

    @NotNull
    @Positive
    Long idProspecto,

    @NotNull
    @Positive
    Long idLote,

    @NotBlank
    @Pattern(regexp = "CONTADO|FINANCIADA")
    String modalidad,

    @NotNull
    @DecimalMin("0.01")
    BigDecimal montoTotal,

    // FINANCIADA: inicial TOTAL elegida por el comprador (minimo S/ 5,000).
    // La reserva confirmada se acredita a este total y la BD deriva
    // la inicial adicional. CONTADO: null.
    @DecimalMin("0.00")
    BigDecimal montoInicial,

    @Min(1)
    @Max(36)
    Integer numeroCuotas,

    // La tasa del nuevo financiamiento es fija: 10% nominal anual en BD.
    // No admitir tasas configurables desde el cliente, ni siquiera positivas.
    @Null
    BigDecimal tasaInteresMensualPct,

    @Size(max = 1000)
    String observaciones,

    // Se exige para registrar una venta; la validación comercial admite null.
    JsonNode datosComprador,

    // Solo se usa durante el registro pendiente de venta; contiene método y vouchers.
    JsonNode datosPago

) {

}