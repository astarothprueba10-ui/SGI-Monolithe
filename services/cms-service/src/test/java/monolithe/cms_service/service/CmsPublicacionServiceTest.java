package monolithe.cms_service.service;

import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.CmsPublicacionHistorial;
import monolithe.cms_service.entity.CmsPublicacionVersion;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.CmsBorradorImagenRepository;
import monolithe.cms_service.repository.CmsBorradorRepository;
import monolithe.cms_service.repository.CmsPublicacionHistorialRepository;
import monolithe.cms_service.repository.CmsPublicacionVersionRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.SeccionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CmsPublicacionServiceTest {

    @Mock private CmsBorradorRepository borradorRepository;
    @Mock private CmsBorradorImagenRepository imagenRepository;
    @Mock private PaginaRepository paginaRepository;
    @Mock private CmsPublicacionVersionRepository versionRepository;
    @Mock private SeccionRepository seccionRepository;
    @Mock private CmsPublicacionHistorialRepository historialRepository;
    @Mock private monolithe.cms_service.repository.MultimediaRepository multimediaRepository;
    @Mock private monolithe.cms_service.repository.MultimediaAsignacionRepository asignacionRepository;
    @Mock private monolithe.cms_service.repository.TipoMultimediaRepository tiposMultimedia;
    @Mock private monolithe.cms_service.repository.UsoMultimediaRepository usosMultimedia;
    @Mock private StorageBorradoresPrivado storagePrivado;
    @Mock private SupabaseStorageService storagePublico;
    @InjectMocks private CmsPublicacionService service;

    private CmsBorrador borrador;
    private Pagina pagina;
    private Seccion principal;
    private Seccion promoOculta;
    private Seccion otra;

    @Test
    void imagenesRequierenHabilitacionExplicitaDelBackend() {
        var error = assertThrows(ConflictException.class,
                () -> service.publicarContenido(12L, 5L, 0L, 7L));
        assertTrue(error.getMessage().contains("deshabilitada"));
        verifyNoInteractions(storagePublico, storagePrivado, borradorRepository);
    }

    @BeforeEach
    void preparar() {
        borrador = new CmsBorrador();
        borrador.setIdBorrador(12L);
        borrador.setIdUsuarioRegistro(7L);
        borrador.setIdPagina(91L);
        borrador.setRevisionBase(0L);
        borrador.setRevisionEdicion(5L);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);
        borrador.setEstado(EstadoBorrador.EN_EDICION);
        borrador.setContenidoPendiente(Map.of("secciones", List.of(
                Map.of("id_seccion", 14, "titulo", "Nuevo título"),
                Map.of("id_seccion", 23, "subtitulo", "Nueva etiqueta"))));

        pagina = new Pagina();
        pagina.setIdPagina(91L);
        pagina.setCodigo("INICIO");
        pagina.setSlug("inicio");
        pagina.setTitulo("Página oficial");
        pagina.setActivo(true);

        principal = seccion(14L, "HERO_PRINCIPAL", true);
        principal.setTitulo("Título anterior");
        principal.setContenido("Texto que debe permanecer");
        principal.setConfiguracion(Map.of("dimensiones", Map.of("ancho", 200)));
        promoOculta = seccion(23L, "HERO_SLIDE_2_PROMO", false);
        promoOculta.setTitulo("Precio protegido");
        promoOculta.setContenido("Descripción comercial protegida");
        promoOculta.setSubtitulo("Etiqueta anterior");
        otra = seccion(44L, "SECCION_AJENA_AL_HERO", true);
        otra.setTitulo("No tocar");
    }

    private void prepararDatos() {
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(12L, 7L))
                .thenReturn(Optional.of(borrador));
        when(paginaRepository.findWithLockByIdPagina(91L)).thenReturn(Optional.of(pagina));
        when(seccionRepository.findWithLockByIdPaginaOrderByOrdenAsc(91L))
                .thenReturn(List.of(principal, promoOculta, otra));
    }

    private void prepararGuardado() {
        when(versionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(borradorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(historialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void publicaSoloTextosPermitidosYRegistraSnapshotsCompletos() {
        prepararDatos();
        when(versionRepository.findWithLockByIdPagina(91L)).thenReturn(Optional.empty());
        prepararGuardado();

        CmsPublicacionHistorial historia = service.publicarTextos(12L, 5L, 0L, 7L);

        assertEquals("Nuevo título", principal.getTitulo());
        assertEquals("Texto que debe permanecer", principal.getContenido());
        assertEquals("Nueva etiqueta", promoOculta.getSubtitulo());
        assertEquals("Precio protegido", promoOculta.getTitulo());
        assertEquals("Descripción comercial protegida", promoOculta.getContenido());
        assertTrue(promoOculta.getVisible());
        assertEquals("No tocar", otra.getTitulo());
        assertEquals("Página oficial", pagina.getTitulo());
        assertEquals(EstadoBorrador.PUBLICADO, borrador.getEstado());
        assertEquals(7L, borrador.getIdUsuarioPublicacion());
        assertNotNull(borrador.getFechaPublicacion());
        assertEquals(0L, historia.getRevisionAnterior());
        assertEquals(1L, historia.getRevisionNueva());
        assertEquals(91L, historia.getIdPagina());

        Map<String, Object> anterior = historia.getSnapshotAnterior();
        Map<String, Object> nuevo = historia.getSnapshotNuevo();
        assertEquals(3, ((List<?>) anterior.get("secciones")).size());
        assertEquals("INICIO", ((Map<?, ?>) anterior.get("pagina")).get("codigo"));
        assertEquals("Título anterior", snapshotSeccion(anterior, 14L).get("titulo"));
        assertEquals("Nuevo título", snapshotSeccion(nuevo, 14L).get("titulo"));
        assertEquals("Etiqueta anterior", snapshotSeccion(anterior, 23L).get("subtitulo"));
        assertEquals("Nueva etiqueta", snapshotSeccion(nuevo, 23L).get("subtitulo"));
        assertEquals(false, snapshotSeccion(anterior, 23L).get("visible"));
        assertEquals(true, snapshotSeccion(nuevo, 23L).get("visible"));
        assertEquals("No tocar", snapshotSeccion(nuevo, 44L).get("titulo"));
        verify(seccionRepository).saveAll(any());
        verify(borradorRepository).save(borrador);
        verify(versionRepository).save(argThat(v -> v.getIdPagina().equals(91L)
                && v.getRevision().equals(1L)));
        verify(historialRepository).save(any());
    }

    @Test
    void noHaceVisibleUnaPromocionQueNoFormaParteDeLaPublicacion() {
        prepararDatos();
        borrador.setContenidoPendiente(Map.of("secciones", List.of(
                Map.of("id_seccion", 14L, "titulo", "Nuevo título"))));
        prepararGuardado();

        service.publicarTextos(12L, 5L, 0L, 7L);

        assertTrue(principal.getVisible());
        assertFalse(promoOculta.getVisible());
        assertEquals("Etiqueta anterior", promoOculta.getSubtitulo());
    }

    @Test
    void permitePublicarSlideTresSinModificarLosDatosComerciales() {
        prepararDatos();
        promoOculta.setCodigo("HERO_SLIDE_3_PROMO");
        prepararGuardado();

        service.publicarTextos(12L, 5L, 0L, 7L);

        assertTrue(promoOculta.getVisible());
        assertEquals("Nueva etiqueta", promoOculta.getSubtitulo());
        assertEquals("Precio protegido", promoOculta.getTitulo());
        assertEquals("Descripción comercial protegida", promoOculta.getContenido());
    }

    @Test
    void respetaVersionExistenteEIncrementaSoloUnaVez() {
        prepararDatos();
        borrador.setRevisionBase(8L);
        CmsPublicacionVersion version = new CmsPublicacionVersion();
        version.setIdPagina(91L);
        version.setRevision(8L);
        when(versionRepository.findWithLockByIdPagina(91L)).thenReturn(Optional.of(version));
        prepararGuardado();

        CmsPublicacionHistorial historia = service.publicarTextos(12L, 5L, 8L, 7L);

        assertEquals(9L, version.getRevision());
        assertEquals(8L, historia.getRevisionAnterior());
        assertEquals(9L, historia.getRevisionNueva());
        verify(versionRepository).save(same(version));
    }

    @Test
    void noAccedeABorradorDeOtroUsuario() {
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(12L, 9L))
                .thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 9L));
        verifyNoInteractions(paginaRepository, versionRepository, seccionRepository, historialRepository);
    }

    @Test
    void noPublicaBorradoresDescartadosNiDeVisibilidad() {
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(12L, 7L))
                .thenReturn(Optional.of(borrador));
        borrador.setEstado(EstadoBorrador.DESCARTADO);
        assertThrows(ConflictException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        borrador.setEstado(EstadoBorrador.EN_EDICION);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        assertThrows(ConflictException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        verifyNoInteractions(paginaRepository, versionRepository, seccionRepository, historialRepository);
    }

    @Test
    void evitaCerrarBorradoresConImagenesPrivadasSinPublicar() {
        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(12L, 7L))
                .thenReturn(Optional.of(borrador));
        when(imagenRepository.existsByIdBorrador(12L)).thenReturn(true);
        assertThrows(ConflictException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        assertEquals(EstadoBorrador.EN_EDICION, borrador.getEstado());
        verifyNoInteractions(paginaRepository, versionRepository, seccionRepository, historialRepository);
    }

    @Test
    void rechazaRevisionEditorialObsoletaSinEscrituras() {
        prepararDatos();
        assertThrows(ConflictException.class,
                () -> service.publicarTextos(12L, 4L, 0L, 7L));
        assertSinEscrituras();
    }

    @Test
    void rechazaRevisionPublicadaObsoletaSinEscrituras() {
        prepararDatos();
        CmsPublicacionVersion version = new CmsPublicacionVersion();
        version.setRevision(1L);
        when(versionRepository.findWithLockByIdPagina(91L)).thenReturn(Optional.of(version));
        assertThrows(ConflictException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        assertSinEscrituras();
    }

    @Test
    void rechazaVersionEsperadaDiferenteDeLaActualSinEscrituras() {
        prepararDatos();
        assertThrows(ConflictException.class,
                () -> service.publicarTextos(12L, 5L, 2L, 7L));
        assertSinEscrituras();
    }

    @Test
    void protegeTitulosComercialesDeSlidesSecundarios() {
        prepararDatos();
        borrador.setContenidoPendiente(Map.of("secciones", List.of(
                Map.of("id_seccion", 23L, "titulo", "Cambio indebido"))));
        assertThrows(IllegalArgumentException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        assertEquals("Precio protegido", promoOculta.getTitulo());
        assertSinEscrituras();
    }

    @Test
    void noPublicaSeccionesInactivas() {
        prepararDatos();
        principal.setActivo(false);
        assertThrows(IllegalArgumentException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        assertSinEscrituras();
    }

    @Test
    void restringeLaPublicacionALaPaginaInicio() {
        prepararDatos();
        pagina.setCodigo("OTRA_PAGINA");
        assertThrows(IllegalArgumentException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        assertSinEscrituras();
    }

    @Test
    void validaParametrosAntesDeConsultar() {
        assertThrows(IllegalArgumentException.class,
                () -> service.publicarTextos(0L, 5L, 0L, 7L));
        assertThrows(IllegalArgumentException.class,
                () -> service.publicarTextos(12L, null, 0L, 7L));
        assertThrows(IllegalArgumentException.class,
                () -> service.publicarTextos(12L, 5L, -1L, 7L));
        assertThrows(IllegalArgumentException.class,
                () -> service.publicarTextos(12L, 5L, 0L, null));
        verifyNoInteractions(borradorRepository);
    }

    @Test
    void errorAlRegistrarHistorialSePropagaParaAbortarTransaccion() {
        prepararDatos();
        when(versionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(borradorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(historialRepository.save(any()))
                .thenThrow(new IllegalStateException("Error de escritura del historial"));

        assertThrows(IllegalStateException.class,
                () -> service.publicarTextos(12L, 5L, 0L, 7L));
        // El rollback real de las sentencias SQL lo garantiza @Transactional.
        // Esta prueba unitaria solo comprueba que la excepción no se oculta.
        verify(seccionRepository).saveAll(any());
        verify(historialRepository).save(any());
    }

    @Test
    void tieneControlDePermisoYTransaccionConRollbackPorDefecto() throws Exception {
        Method metodo = CmsPublicacionService.class.getMethod("publicarTextos",
                Long.class, Long.class, Long.class, Long.class);
        assertEquals("hasAuthority('web_content.publish')",
                metodo.getAnnotation(PreAuthorize.class).value());
        Transactional tx = metodo.getAnnotation(Transactional.class);
        assertNotNull(tx);
        assertFalse(tx.readOnly());
    }

    @Test
    void snapshotDesacoplaLaConfiguracionJsonDeLaEntidad() {
        Map<String, Object> detalle = new LinkedHashMap<>();
        detalle.put("ancho", 200);
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("dimensiones", detalle);
        principal.setConfiguracion(config);
        Map<String, Object> snapshot = CmsPublicacionSnapshot.capturar(pagina, List.of(principal));
        detalle.put("ancho", 300);
        Map<?, ?> guardada = (Map<?, ?>) snapshotSeccion(snapshot, 14L).get("configuracion");
        assertEquals(200, ((Map<?, ?>) guardada.get("dimensiones")).get("ancho"));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> snapshotSeccion(Map<String, Object> snapshot, Long id) {
        return ((List<Map<String, Object>>) snapshot.get("secciones")).stream()
                .filter(s -> id.equals(s.get("id_seccion"))).findFirst().orElseThrow();
    }

    private void assertSinEscrituras() {
        verify(versionRepository, never()).save(any());
        verify(seccionRepository, never()).saveAll(any());
        verify(borradorRepository, never()).save(any());
        verify(historialRepository, never()).save(any());
    }

    private static Seccion seccion(Long id, String codigo, boolean visible) {
        Seccion s = new Seccion();
        s.setIdSeccion(id);
        s.setIdPagina(91L);
        s.setCodigo(codigo);
        s.setActivo(true);
        s.setVisible(visible);
        return s;
    }
}
