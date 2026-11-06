package monolithe.cms_service.repository;

import monolithe.cms_service.entity.CmsPublicacionHistorial;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.Repository;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class CmsPublicacionHistorialRepositoryTest {

    @Test
    void noExponeOperacionesDeBorradoPorHerencia() {
        assertTrue(Repository.class.isAssignableFrom(CmsPublicacionHistorialRepository.class));
        assertFalse(CrudRepository.class.isAssignableFrom(CmsPublicacionHistorialRepository.class));
        for (Method metodo : CmsPublicacionHistorialRepository.class.getMethods()) {
            assertFalse(metodo.getName().startsWith("delete"));
        }
    }

    @Test
    void permiteRegistrarYBuscarPorRevision() throws Exception {
        Method alta = CmsPublicacionHistorialRepository.class.getMethod("save", CmsPublicacionHistorial.class);
        assertEquals(CmsPublicacionHistorial.class, alta.getReturnType());
        Method consulta = CmsPublicacionHistorialRepository.class.getMethod(
                "findByIdPaginaAndRevisionNueva", Long.class, Long.class);
        assertEquals(Optional.class, consulta.getReturnType());
    }

    @Test
    void permiteConsultarHistorialPorPaginaConPaginacion() throws Exception {
        Method consulta = CmsPublicacionHistorialRepository.class.getMethod(
                "findByIdPaginaOrderByRevisionNuevaDesc", Long.class, Pageable.class);
        assertEquals(List.class, consulta.getReturnType());
    }
}
