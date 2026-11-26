package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

public record PrepararSubsanacionVentaRequest(
  @NotBlank @Size(max=255) String nombreArchivo,
  @NotBlank @Pattern(regexp="application/pdf|image/jpeg|image/png|image/webp") String tipoMime,
  @NotNull @Min(1) @Max(5242880) Long tamanioBytes
) {}
