package monolithe.cms_service.service;

import monolithe.cms_service.dto.TextoSeccionBorrador;
import monolithe.cms_service.entity.*;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CmsBorradorServiceTest {

    @Mock
    private CmsBorradorRepository borradorRepository;

    @Mock
    private CmsPublicacionVersionRepository versionRepository;

    @Mock
    private PaginaRepository paginaRepository;

    @Mock
    private ProyectoRepository proyectoRepository;

    @Mock
    private SeccionRepository seccionRepository;

    @InjectMocks
    private CmsBorradorService service;

    @Test
    void guardaVisibilidadSoloEnBorrador() {

        when(proyectoRepository.findById(3L))
                .thenReturn(Optional.of(proyecto(3L, true)));

        when(versionRepository.findByIdProyecto(3L))
                .thenReturn(Optional.empty());

        when(borradorRepository.findByIdGrupoEdicionOrderByIdBorradorAsc(any()))
                .thenReturn(List.of());

        when(borradorRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        CmsBorrador borrador = service.crearVisibilidad(
                3L, false, null, 7L);

        assertEquals(
                TipoObjetivoBorrador.VISIBILIDAD_PROYECTO,
                borrador.getTipoObjetivo());

        assertEquals(
                false,
                borrador.getContenidoPendiente().get("visible_publico"));

        assertEquals(0L, borrador.getRevisionBase());
        assertEquals(EstadoBorrador.EN_EDICION, borrador.getEstado());

        verifyNoInteractions(paginaRepository, seccionRepository);
    }

    @Test
    void proyectoInactivoNoAdmiteBorrador() {

        when(proyectoRepository.findById(3L))
                .thenReturn(Optional.of(proyecto(3L, false)));

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.crearVisibilidad(3L, true, null, 7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void rechazaVisibilidadNula() {

        when(proyectoRepository.findById(3L))
                .thenReturn(Optional.of(proyecto(3L, true)));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearVisibilidad(3L, null, null, 7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void paginaGuardaSoloTextosDeSeccionesPropias() {

        when(paginaRepository.findById(1L))
                .thenReturn(Optional.of(pagina(1L)));

        when(seccionRepository.findById(5L))
                .thenReturn(Optional.of(seccion(5L, 1L)));

        when(borradorRepository.findByIdGrupoEdicionOrderByIdBorradorAsc(any()))
                .thenReturn(List.of());

        when(versionRepository.findByIdPagina(1L))
                .thenReturn(Optional.empty());

        when(borradorRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        CmsBorrador borrador = service.crearPagina(
                1L,
                List.of(new TextoSeccionBorrador(
                        5L,
                        "Nuevo título",
                        null,
                        null)),
                null,
                7L);

        assertEquals(
                TipoObjetivoBorrador.PAGINA,
                borrador.getTipoObjetivo());

        assertEquals(1L, borrador.getIdPagina());

        assertEquals(
                1,
                ((List<?>) borrador.getContenidoPendiente().get("secciones")).size());

        verifyNoInteractions(proyectoRepository);
    }

    @Test
    void permiteBorradorSoloImagenDelHeroInicioSinTextoFicticio() {

        Seccion hero = seccion(5L, 1L);
        hero.setCodigo("HERO_SLIDE_2_PROMO");

        CmsBorrador borrador = guardarBorradorInicio(
                hero,
                new TextoSeccionBorrador(5L, null, null, null));

        assertEquals(
                List.of(Map.of("id_seccion", 5L)),
                borrador.getContenidoPendiente().get("secciones"));
    }

    @Test
    void rechazaMarcadorSoloImagenFueraDelHeroInicio() {

        Seccion noHero = seccion(5L, 1L);
        noHero.setCodigo("FORMULARIO_CONTACTO");

        prepararSeccionInicio(noHero);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L, null, null, null)),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void noPermiteEditarSeccionDeOtraPagina() {

        when(paginaRepository.findById(1L))
                .thenReturn(Optional.of(pagina(1L)));

        when(seccionRepository.findById(5L))
                .thenReturn(Optional.of(seccion(5L, 2L)));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L, "Título", null, null)),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void rechazaHtmlEnTextosPromocionales() {

        when(paginaRepository.findById(1L))
                .thenReturn(Optional.of(pagina(1L)));

        when(seccionRepository.findById(5L))
                .thenReturn(Optional.of(seccion(5L, 1L)));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L, "<script>", null, null)),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void permiteModificarSoloElSubtituloDelSlidePromocional() {

        Seccion promo = seccion(5L, 1L);
        promo.setCodigo("HERO_SLIDE_2_PROMO");

        CmsBorrador borrador = guardarBorradorInicio(
                promo,
                new TextoSeccionBorrador(
                        5L,
                        null,
                        "Promoción editorial",
                        null));

        List<?> cambios = (List<?>) borrador.getContenidoPendiente()
                .get("secciones");

        Map<?, ?> primerCambio = (Map<?, ?>) cambios.getFirst();

        assertEquals("Promoción editorial", primerCambio.get("subtitulo"));
        assertFalse(primerCambio.containsKey("titulo"));
        assertFalse(primerCambio.containsKey("contenido"));
    }

    @Test
    void rechazaTituloEnSlidePromocional() {

        Seccion promo = seccion(5L, 1L);
        promo.setCodigo("HERO_SLIDE_2_PROMO");

        prepararSeccionInicio(promo);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L,
                                "Título no permitido",
                                null,
                                null)),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void rechazaDescripcionEnSlidePromocional() {

        Seccion promo = seccion(5L, 1L);
        promo.setCodigo("HERO_SLIDE_3_PROMO");

        prepararSeccionInicio(promo);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L,
                                null,
                                null,
                                "Descripción no permitida")),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void rechazaTituloPrincipalVacio() {

        Seccion hero = seccion(5L, 1L);
        hero.setCodigo("HERO_PRINCIPAL");

        prepararSeccionInicio(hero);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L,
                                "   ",
                                "Subtítulo",
                                "Descripción")),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void rechazaDescripcionHeroMayorA500Caracteres() {

        Seccion hero = seccion(5L, 1L);
        hero.setCodigo("HERO_PRINCIPAL");

        prepararSeccionInicio(hero);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L,
                                "Título válido",
                                "Subtítulo",
                                "A".repeat(501))),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void permiteDescripcionHeroDeExactamente500Caracteres() {

        Seccion hero = seccion(5L, 1L);
        hero.setCodigo("HERO_PRINCIPAL");

        String descripcion = "A".repeat(500);

        CmsBorrador borrador = guardarBorradorInicio(
                hero,
                new TextoSeccionBorrador(
                        5L,
                        "Título válido",
                        "Subtítulo",
                        descripcion));

        List<?> cambios = (List<?>) borrador.getContenidoPendiente()
                .get("secciones");

        Map<?, ?> primerCambio = (Map<?, ?>) cambios.getFirst();

        assertEquals(
                500,
                ((String) primerCambio.get("contenido")).length());
    }

    @Test
    void rechazaMasDeTresSeccionesEnPaginaInicio() {

        Pagina inicio = pagina(1L);
        inicio.setCodigo("INICIO");

        when(paginaRepository.findById(1L))
                .thenReturn(Optional.of(inicio));

        List<TextoSeccionBorrador> cambios = List.of(
                new TextoSeccionBorrador(1L, "A", null, null),
                new TextoSeccionBorrador(2L, "B", null, null),
                new TextoSeccionBorrador(3L, "C", null, null),
                new TextoSeccionBorrador(4L, "D", null, null));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(1L, cambios, null, 7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void rechazaSeccionesNoAutorizadasDeInicio() {

        Seccion seccionNoAutorizada = seccion(5L, 1L);
        seccionNoAutorizada.setCodigo("FORMULARIO_CONTACTO");

        prepararSeccionInicio(seccionNoAutorizada);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.crearPagina(
                        1L,
                        List.of(new TextoSeccionBorrador(
                                5L, "Texto", null, null)),
                        null,
                        7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void detectaEdicionSimultanea() {

        CmsBorrador borrador = editableVisibilidad();

        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(
                10L, 7L)).thenReturn(Optional.of(borrador));

        assertThrows(
                ConflictException.class,
                () -> service.actualizarVisibilidad(
                        10L, false, 1L, 7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void actualizacionValidaIncrementaRevision() {

        CmsBorrador borrador = editableVisibilidad();

        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(
                10L, 7L)).thenReturn(Optional.of(borrador));

        when(proyectoRepository.findById(3L))
                .thenReturn(Optional.of(proyecto(3L, true)));

        when(borradorRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        CmsBorrador resultado = service.actualizarVisibilidad(
                10L, false, 2L, 7L);

        assertEquals(3L, resultado.getRevisionEdicion());

        assertEquals(
                false,
                resultado.getContenidoPendiente().get("visible_publico"));
    }

    @Test
    void descartarNoPublica() {

        CmsBorrador borrador = editableVisibilidad();

        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(
                10L, 7L)).thenReturn(Optional.of(borrador));

        when(borradorRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        CmsBorrador resultado = service.descartarVisibilidad(
                10L, 2L, 7L);

        assertEquals(EstadoBorrador.DESCARTADO, resultado.getEstado());
        assertNull(resultado.getFechaPublicacion());
        assertNull(resultado.getIdUsuarioPublicacion());
    }

    @Test
    void noPermiteLeerBorradoresAjenos() {

        when(borradorRepository.findByIdBorradorAndIdUsuarioRegistro(
                10L, 8L)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.obtenerPropio(10L, 8L));
    }

    @Test
    void elGrupoNoPermiteDestinosDuplicados() {

        UUID grupo = UUID.randomUUID();

        CmsBorrador existente = editableVisibilidad();

        when(proyectoRepository.findById(3L))
                .thenReturn(Optional.of(proyecto(3L, true)));

        when(borradorRepository.findByIdGrupoEdicionOrderByIdBorradorAsc(grupo))
                .thenReturn(List.of(existente));

        assertThrows(
                ConflictException.class,
                () -> service.crearVisibilidad(3L, false, grupo, 7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void descartarVisibilidadNoPermiteDescartarTextos() {

        CmsBorrador borrador = editableVisibilidad();
        borrador.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);

        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(
                10L, 7L)).thenReturn(Optional.of(borrador));

        assertThrows(
                IllegalArgumentException.class,
                () -> service.descartarVisibilidad(10L, 2L, 7L));

        verify(borradorRepository, never()).save(any());
    }

    @Test
    void noPermiteAnadirBorradorAGrupoDeOtroUsuario() {

        UUID grupo = UUID.randomUUID();

        CmsBorrador ajeno = editableVisibilidad();
        ajeno.setIdUsuarioRegistro(99L);

        when(proyectoRepository.findById(3L))
                .thenReturn(Optional.of(proyecto(3L, true)));

        when(borradorRepository.findByIdGrupoEdicionOrderByIdBorradorAsc(grupo))
                .thenReturn(List.of(ajeno));

        assertThrows(
                ResourceNotFoundException.class,
                () -> service.crearVisibilidad(3L, false, grupo, 7L));

        verify(borradorRepository, never()).save(any());
    }

    private void prepararSeccionInicio(Seccion seccion) {

        Pagina inicio = pagina(1L);
        inicio.setCodigo("INICIO");

        when(paginaRepository.findById(1L))
                .thenReturn(Optional.of(inicio));

        when(seccionRepository.findById(seccion.getIdSeccion()))
                .thenReturn(Optional.of(seccion));
    }

    private CmsBorrador guardarBorradorInicio(
            Seccion seccion,
            TextoSeccionBorrador cambio) {

        prepararSeccionInicio(seccion);

        when(borradorRepository.findByIdGrupoEdicionOrderByIdBorradorAsc(any()))
                .thenReturn(List.of());

        when(versionRepository.findByIdPagina(1L))
                .thenReturn(Optional.empty());

        when(borradorRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        return service.crearPagina(
                1L,
                List.of(cambio),
                null,
                7L);
    }

    private static CmsBorrador editableVisibilidad() {

        CmsBorrador borrador = new CmsBorrador();

        borrador.setIdBorrador(10L);
        borrador.setIdProyecto(3L);
        borrador.setIdUsuarioRegistro(7L);

        borrador.setTipoObjetivo(
                TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);

        borrador.setRevisionEdicion(2L);
        borrador.setEstado(EstadoBorrador.EN_EDICION);

        return borrador;
    }

    private static Proyecto proyecto(Long id, boolean activo) {

        Proyecto proyecto = new Proyecto();

        proyecto.setIdProyecto(id);
        proyecto.setActivo(activo);

        return proyecto;
    }

    private static Pagina pagina(Long id) {

        Pagina pagina = new Pagina();

        pagina.setIdPagina(id);
        pagina.setActivo(true);

        return pagina;
    }

    private static Seccion seccion(Long id, Long idPagina) {

        Seccion seccion = new Seccion();

        seccion.setIdSeccion(id);
        seccion.setIdPagina(idPagina);
        seccion.setActivo(true);

        return seccion;
    }
}