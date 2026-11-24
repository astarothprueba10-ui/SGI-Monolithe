package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record RegistrarSeparacionAcumuladaRequest(
    @NotNull UUID idSolicitud,
    @NotNull @Positive Long idProspecto,
    @NotNull @Size(min=1,max=20) List<@NotNull @Valid Lote> lotes,
    @NotNull @Size(min=1,max=20) List<@NotNull @Valid Abono> abonos,
    @Size(max=500) String observaciones
) {
    public record Lote(@NotNull @Positive Long idLote,
        @NotNull @Positive @Digits(integer=12,fraction=2) BigDecimal monto,
        @NotNull @Positive @Digits(integer=12,fraction=2) BigDecimal precio,
        @NotNull @Positive Long idPolitica) {}
    public record Abono(
        @NotBlank @Pattern(regexp="TRANSFERENCIA|DEPOSITO|YAPE_PLIN|EFECTIVO|OTRO") String metodoPago,
        @Size(max=80) String numeroOperacion,
        @NotNull @Positive @Digits(integer=12,fraction=2) BigDecimal monto,
        @NotBlank @Size(max=500) String claveArchivo,
        @NotBlank @Size(max=255) String nombreArchivo,
        @NotBlank @Pattern(regexp="application/pdf|image/jpeg|image/png|image/webp") String tipoMime,
        @NotNull @Min(1) @Max(5242880) Long tamanioBytes,
        @NotBlank @Pattern(regexp="[0-9a-fA-F]{64}") String hashSha256) {}
}
