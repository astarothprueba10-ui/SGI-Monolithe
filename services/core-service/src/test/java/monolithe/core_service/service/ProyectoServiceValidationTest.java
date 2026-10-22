package monolithe.core_service.service;

import monolithe.core_service.dto.ProyectoRequest;
import monolithe.core_service.entity.EstadoProyecto;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.util.Optional;

import static monolithe.core_service.service.ProyectoTestData.request;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ProyectoServiceValidationTest {
    private ProyectoRepository repository;
    private ProyectoService service;

    @BeforeEach
    void preparar() {
        repository = mock(ProyectoRepository.class);
        var estados = mock(EstadoProyectoRepository.class);
        var estado = new EstadoProyecto();
        estado.setCodigo("PLANIFICADO");
        estado.setActivo(true);
        lenient().when(estados.findByCodigo("PLANIFICADO")).thenReturn(Optional.of(estado));
        lenient().when(repository.findById(1L)).thenReturn(Optional.of(new Proyecto()));
        lenient().when(repository.save(any(Proyecto.class))).thenAnswer(call -> call.getArgument(0));
        service = new ProyectoService(repository, estados, mock(EtapaRepository.class), mock(ZonaRepository.class),
                mock(ManzanaRepository.class), mock(LoteRepository.class), new ValidacionProyectoService(new UbigeoService()));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void altaYEdicionPersistenLosNombresOficialesYPaisFijo(boolean editar) {
        var resultado = guardar(editar, request("lambayeque", "chiclayo", "eten", "peru",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 1)));
        assertEquals("Lambayeque", resultado.departamento());
        assertEquals("Chiclayo", resultado.provincia());
        assertEquals("Eten", resultado.distrito());
        assertEquals("Perú", resultado.pais());
        verify(repository).save(any(Proyecto.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void altaYEdicionRechazanFechasInvertidasSinGuardar(boolean editar) {
        var invalido = request(null, null, null, "Perú", LocalDate.of(2026, 5, 2), LocalDate.of(2026, 5, 1));
        assertThrows(ReglaNegocioException.class, () -> guardar(editar, invalido));
        verify(repository, never()).save(any(Proyecto.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void altaYEdicionRechazanUbicacionManipuladaSinGuardar(boolean editar) {
        var invalido = request("Lambayeque", "Lima", "Miraflores", "Perú", null, null);
        assertThrows(ReglaNegocioException.class, () -> guardar(editar, invalido));
        verify(repository, never()).save(any(Proyecto.class));
    }

    private monolithe.core_service.dto.ProyectoResponse guardar(boolean editar, ProyectoRequest request) {
        return editar ? service.actualizar(1L, request) : service.crear(request);
    }
}
