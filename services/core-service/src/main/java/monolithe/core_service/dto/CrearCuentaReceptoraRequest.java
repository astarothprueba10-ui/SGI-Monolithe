package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

/** Alta bancaria autorizada por Gerencia; no se admiten cuentas de demostración. */
public record CrearCuentaReceptoraRequest(
  @NotBlank @Size(min=5,max=120) String nombre,
  @NotBlank @Size(min=3,max=120) String banco,
  @NotBlank @Size(min=5,max=180) String titular,
  @NotBlank @Size(max=80) String numeroCuenta,
  @Size(max=40) String cci,
  @NotBlank @Pattern(regexp="PEN|USD") String moneda
) {}
