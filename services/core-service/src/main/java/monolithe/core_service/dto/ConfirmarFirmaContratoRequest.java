
package monolithe.core_service.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record ConfirmarFirmaContratoRequest(

    @NotNull
    @Positive
    Long idContratoArchivo,

    @NotNull
    @PastOrPresent
    LocalDate fechaFirma,

    @AssertTrue(
        message = "Debe confirmar la revisión de la firma."
    )
    boolean firmaRevisada,

    @NotBlank
    @Size(min = 15, max = 500)
    String observaciones

) {}
