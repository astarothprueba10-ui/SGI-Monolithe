package monolithe.core_service.dto;

import java.time.LocalDate;

/** Conciliación explícita contra cuenta y fecha bancaria verificada. */
public record ConciliarCobroVentaRequest(
    Long idCuentaFinanciera,
    LocalDate fechaOperacion,
    String numeroOperacion,
    String observaciones
) {}
