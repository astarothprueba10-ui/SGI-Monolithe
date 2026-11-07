package monolithe.core_service.service;

import monolithe.core_service.exception.ReglaNegocioException;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Reglas adicionales del registro de proyectos, con fecha de referencia de Perú. */
public final class ValidacionAltaProyecto {
    private static final ZoneId PERU = ZoneId.of("America/Lima");

    private ValidacionAltaProyecto() {
    }

    /** Resuelve el día de registro sin depender de la zona horaria del servidor. */
    public static LocalDate fechaRegistro(Instant instante) {
        return instante.atZone(PERU).toLocalDate();
    }

    /** Comprueba la descripción y las fechas del alta antes de persistir. */
    public static void validar(String descripcion, LocalDate inicio, LocalDate fin, LocalDate hoy) {
        validarDescripcion(descripcion);
        if (inicio != null && inicio.isBefore(hoy)) {
            throw new ReglaNegocioException("La fecha de inicio debe ser hoy o una fecha posterior");
        }
        if (fin != null && fin.isBefore(hoy)) {
            throw new ReglaNegocioException("La fecha de fin estimada no puede ser anterior al día de registro");
        }
    }

    private static void validarDescripcion(String descripcion) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new ReglaNegocioException("La descripción del proyecto es obligatoria");
        }
        long letras = Normalizer.normalize(descripcion, Normalizer.Form.NFC).codePoints()
                .filter(Character::isLetter).count();
        if (letras < 15) {
            throw new ReglaNegocioException("La descripción debe contener al menos 15 letras; los espacios y números no cuentan");
        }
    }
}
