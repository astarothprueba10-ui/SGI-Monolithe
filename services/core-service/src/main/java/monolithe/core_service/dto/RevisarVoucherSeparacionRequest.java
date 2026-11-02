package monolithe.core_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RevisarVoucherSeparacionRequest(

    @NotNull
    Boolean aprobar,

    @Size(max = 500)
    String motivo,

    @Size(max = 500)
    String observaciones

) {

}

