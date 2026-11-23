package monolithe.core_service.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ConciliarDesgloseVentaRequest(
  @NotNull @Positive Long idCuentaFinanciera,
  @NotNull LocalDate fechaOperacion,
  String observaciones
) {}
