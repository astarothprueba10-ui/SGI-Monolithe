package monolithe.cms_service.service;

import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.CmsProyectoVisibilidad;
import monolithe.cms_service.entity.CmsPublicacionVersion;
import monolithe.cms_service.entity.CmsVisibilidadHistorial;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.Proyecto;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.CmsBorradorRepository;
import monolithe.cms_service.repository.CmsProyectoVisibilidadRepository;
import monolithe.cms_service.repository.CmsPublicacionVersionRepository;
import monolithe.cms_service.repository.CmsVisibilidadHistorialRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CmsVisibilidadPublicacionServiceTest {

    @Mock private CmsBorradorRepository borradorRepository;
    @Mock private ProyectoRepository proyectoRepository;
    @Mock private CmsProyectoVisibilidadRepository visibilidadRepository;
    @Mock private CmsPublicacionVersionRepository versionRepository;
    @Mock private CmsVisibilidadHistorialRepository historialRepository;
    @InjectMocks private CmsVisibilidadPublicacionService service;

    private CmsBorrador borrador;
    private Proyecto proyecto;
    private CmsProyectoVisibilidad visibilidad;

    @BeforeEach
    void preparar() {
        ReflectionTestUtils.setField(service, "publicacionHabilitada", true);
        borrador = new CmsBorrador();
        borrador.setIdBorrador(14L);
        borrador.setIdUsuarioRegistro(7L);
        borrador.setIdProyecto(32L);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        borrador.setEstado(EstadoBorrador.EN_EDICION);
        borrador.setRevisionBase(0L);
        borrador.setRevisionEdicion(3L);
        borrador.setContenidoPendiente(Map.of("visible_publico", true));
        proyecto = new Proyecto();
        proyecto.setIdProyecto(32L);
        proyecto.setCodigo("PROY-032");
        proyecto.setNombre("Proyecto existente");
        proyecto.setActivo(true);
        visibilidad = new CmsProyectoVisibilidad();
        visibilidad.setIdProyecto(32L);
        visibilidad.setVisiblePublico(false);
    }

    private void prepararValidacion() {
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(14L, 7L))
                .thenReturn(Optional.of(borrador));
        when(proyectoRepository.findById(32L)).thenReturn(Optional.of(proyecto));
        when(visibilidadRepository.bloquearPorProyecto(32L)).thenReturn(Optional.of(visibilidad));
    }

    private void prepararGuardado() {
        when(visibilidadRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(versionRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(borradorRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(historialRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void publicaVisibilidadSinTocarDatosOficialesYRegistraHistorial() {
        prepararValidacion(); prepararGuardado();
        CmsVisibilidadHistorial historia = service.publicar(14L, 3L, 0L, 7L);

        assertTrue(visibilidad.getVisiblePublico());
        assertEquals(EstadoBorrador.PUBLICADO, borrador.getEstado());
        assertEquals(7L, borrador.getIdUsuarioPublicacion());
        assertNotNull(borrador.getFechaPublicacion());
        assertEquals(32L, historia.getIdProyecto());
        assertEquals(0L, historia.getRevisionAnterior());
        assertEquals(1L, historia.getRevisionNueva());
        assertFalse(historia.getVisibleAnterior());
        assertTrue(historia.getVisibleNuevo());
        assertEquals("Proyecto existente", proyecto.getNombre());
        verify(visibilidadRepository).asegurarFilaOculta(32L);
        verify(versionRepository).save(argThat(v -> v.getIdProyecto().equals(32L)
                && v.getRevision().equals(1L)));
        verify(proyectoRepository, never()).save(any());
    }

    @Test
    void permiteOcultarProyectoConVersionPrevia() {
        borrador.setContenidoPendiente(Map.of("visible_publico", false));
        borrador.setRevisionBase(4L);
        visibilidad.setVisiblePublico(true);
        CmsPublicacionVersion version = new CmsPublicacionVersion();
        version.setIdProyecto(32L);
        version.setRevision(4L);
        prepararValidacion(); prepararGuardado();
        when(versionRepository.findWithLockByIdProyecto(32L)).thenReturn(Optional.of(version));

        CmsVisibilidadHistorial historia = service.publicar(14L, 3L, 4L, 7L);
        assertFalse(visibilidad.getVisiblePublico());
        assertEquals(5L, version.getRevision());
        assertTrue(historia.getVisibleAnterior());
        assertFalse(historia.getVisibleNuevo());
    }

    @Test
    void niegaPublicacionDeUnBorradorAjeno() {
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(14L, 8L))
                .thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.publicar(14L, 3L, 0L, 8L));
        verifyNoInteractions(proyectoRepository, visibilidadRepository, versionRepository, historialRepository);
    }

    @Test
    void rechazaRevisionEditorialObsoletaSinEscribir() {
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(14L, 7L))
                .thenReturn(Optional.of(borrador));
        assertThrows(ConflictException.class, () -> service.publicar(14L, 2L, 0L, 7L));
        verifyNoInteractions(proyectoRepository, visibilidadRepository, versionRepository, historialRepository);
    }

    @Test
    void rechazaVersionPublicaObsoletaSinPublicar() {
        prepararValidacion();
        CmsPublicacionVersion version = new CmsPublicacionVersion();
        version.setRevision(1L);
        when(versionRepository.findWithLockByIdProyecto(32L)).thenReturn(Optional.of(version));
        assertThrows(ConflictException.class, () -> service.publicar(14L, 3L, 0L, 7L));
        assertFalse(visibilidad.getVisiblePublico());
        assertEquals(EstadoBorrador.EN_EDICION, borrador.getEstado());
        verifyNoInteractions(historialRepository);
    }

    @Test
    void rechazaProyectoOficialInactivo() {
        proyecto.setActivo(false);
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(14L, 7L))
                .thenReturn(Optional.of(borrador));
        when(proyectoRepository.findById(32L)).thenReturn(Optional.of(proyecto));
        assertThrows(ResourceNotFoundException.class, () -> service.publicar(14L, 3L, 0L, 7L));
        verifyNoInteractions(visibilidadRepository, versionRepository, historialRepository);
    }

    @Test
    void rechazaEstadoSinCambio() {
        borrador.setContenidoPendiente(Map.of("visible_publico", false));
        prepararValidacion();
        assertThrows(ConflictException.class, () -> service.publicar(14L, 3L, 0L, 7L));
        verifyNoInteractions(historialRepository);
    }

    @Test
    void rechazaCamposNoAutorizadosEnBorrador() {
        borrador.setContenidoPendiente(Map.of("visible_publico", true, "precio", 999));
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(14L, 7L))
                .thenReturn(Optional.of(borrador));
        assertThrows(IllegalArgumentException.class, () -> service.publicar(14L, 3L, 0L, 7L));
        verifyNoInteractions(proyectoRepository, visibilidadRepository, versionRepository, historialRepository);
    }

    @Test
    void rechazaBorradorDePagina() {
        borrador.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(14L, 7L))
                .thenReturn(Optional.of(borrador));
        assertThrows(ConflictException.class, () -> service.publicar(14L, 3L, 0L, 7L));
        verifyNoInteractions(proyectoRepository, visibilidadRepository, versionRepository, historialRepository);
    }

    @Test
    void permaneceBloqueadaHastaDespliegueAutorizado() {
        ReflectionTestUtils.setField(service, "publicacionHabilitada", false);
        assertThrows(ConflictException.class, () -> service.publicar(14L, 3L, 0L, 7L));
        verifyNoInteractions(borradorRepository, proyectoRepository,
                visibilidadRepository, versionRepository, historialRepository);
    }

    @Test
    void publicaSoloConAmbosPermisosYTransaccion() throws Exception {
        Method metodo = CmsVisibilidadPublicacionService.class.getMethod("publicar",
                Long.class, Long.class, Long.class, Long.class);
        PreAuthorize permiso = metodo.getAnnotation(PreAuthorize.class);
        assertNotNull(permiso);
        assertTrue(permiso.value().contains("web_content.projects_visibility"));
        assertTrue(permiso.value().contains("web_content.publish"));
        assertNotNull(metodo.getAnnotation(Transactional.class));
    }
}
