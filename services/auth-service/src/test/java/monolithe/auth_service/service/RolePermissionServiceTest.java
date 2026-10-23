package monolithe.auth_service.service;

import monolithe.auth_service.repository.RolePermissionProcedureRepository;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RolePermissionServiceTest {

    @Mock
    private RolePermissionProcedureRepository repository;

    @InjectMocks
    private RolePermissionService service;

    @Test
    void actualizaDatosNormalizadosSinTocarAsignacionesDePermisos() {
        SecurityOperationResult resultado = new SecurityOperationResult("ACTUALIZADO", "Actualizado");
        when(repository.actualizarRol(7L, "RRHH", "Recursos Humanos", "Equipo interno"))
                .thenReturn(resultado);

        SecurityOperationResult actual = service.actualizarRol(
                7L, "RRHH", " Recursos Humanos ", " Equipo interno ");

        assertSame(resultado, actual);
        verify(repository).actualizarRol(7L, "RRHH", "Recursos Humanos", "Equipo interno");
    }

    @Test
    void convierteDescripcionEnBlancoANull() {
        service.actualizarRol(7L, "RRHH", "Recursos Humanos", "   ");

        verify(repository).actualizarRol(7L, "RRHH", "Recursos Humanos", null);
    }

    @Test
    void delegaDesactivacionYReactivacionPorCodigoEstable() {
        service.desactivarRol(7L, "RRHH");
        service.reactivarRol(7L, "RRHH");

        verify(repository).desactivarRol(7L, "RRHH");
        verify(repository).reactivarRol(7L, "RRHH");
    }
}
