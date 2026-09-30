package monolithe.cms_service.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
public class MultimediaAsignacionRequest {

    @NotNull
    private Long idMultimedia;

    @NotNull
    private Integer idUsoMultimedia;

    private Long idPagina;

    private Long idSeccion;

    private Long idSeccionItem;

    @PositiveOrZero
    private Integer orden = 0;

    private Boolean visible = true;

    private OffsetDateTime fechaDesde;

    private OffsetDateTime fechaHasta;

    @AssertTrue(
            message = "Debe especificarse exactamente un destino: página, sección o ítem"
    )
    public boolean isDestinoValido() {

        int destinos = 0;

        if (idPagina != null) {
            destinos++;
        }

        if (idSeccion != null) {
            destinos++;
        }

        if (idSeccionItem != null) {
            destinos++;
        }

        return destinos == 1;
    }

    @AssertTrue(
            message = "La fecha final no puede ser anterior a la fecha inicial"
    )
    public boolean isRangoFechasValido() {

        if (fechaDesde == null || fechaHasta == null) {
            return true;
        }

        return !fechaHasta.isBefore(fechaDesde);
    }
}