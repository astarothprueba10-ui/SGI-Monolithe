package monolithe.auth_service.repository.projection;

import java.time.OffsetDateTime;

public record RecoveryVerificationContext(
        Long idVerificacion,
        Long idUsuario,
        String otpHash,
        String passwordPendienteHash,
        int intentosFallidos,
        OffsetDateTime fechaExpiracion,
        OffsetDateTime fechaConfirmacion,
        OffsetDateTime fechaBloqueo
) {}
