package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ProyectoRequest;
import monolithe.core_service.dto.UbigeoResponse;
import monolithe.core_service.exception.ReglaNegocioException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Reglas de ubicación, fechas y cantidad de cifras compartidas por altas y modificaciones. */
@Service
@RequiredArgsConstructor
public class ValidacionProyectoService {
    private final UbigeoService ubigeoService;

    /** Valida el proyecto antes de persistir y resuelve los nombres oficiales de su ubicación. */
    public UbigeoResponse validar(ProyectoRequest request) {
        String pais = UbigeoService.normalizar(request.pais());
        if (!pais.isEmpty() && !pais.equals("PERU")) {
            throw new ReglaNegocioException("El país del proyecto debe ser Perú");
        }
        validarFecha(request.fechaInicio());
        validarFecha(request.fechaFinEstimada());
        validarOrden(request.fechaInicio(), request.fechaFinEstimada());
        validarDigitos(request.areaTotalM2(), "El área total");
        validarDigitos(request.latitud(), "La latitud");
        validarDigitos(request.longitud(), "La longitud");
        return ubigeoService.resolver(request.departamento(), request.provincia(), request.distrito());
    }

    private void validarDigitos(BigDecimal valor, String campo) {
        if (valor == null) return;
        long enteros = valor.signum() == 0 ? 1 : Math.max(1L, (long) valor.precision() - valor.scale());
        long decimales = Math.max(0, valor.scale());
        if (enteros + decimales > 10) {
            throw new ReglaNegocioException(campo + " admite como máximo 10 dígitos, sin contar el signo ni el separador decimal");
        }
    }

    private void validarFecha(LocalDate fecha) {
        if (fecha != null && (fecha.getYear() < 1 || fecha.getYear() > 9999)) {
            throw new ReglaNegocioException("Las fechas del proyecto deben tener un año entre 0001 y 9999");
        }
    }

    private void validarOrden(LocalDate inicio, LocalDate fin) {
        if (inicio != null && fin != null && fin.isBefore(inicio)) {
            throw new ReglaNegocioException("La fecha de fin estimada no puede ser anterior a la fecha de inicio");
        }
    }
}
