package monolithe.cms_service.service;

import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.CmsBorradorImagen;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.Multimedia;
import monolithe.cms_service.entity.MultimediaAsignacion;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.entity.TipoMultimedia;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.entity.UsoMultimedia;
import monolithe.cms_service.repository.CmsBorradorImagenRepository;
import monolithe.cms_service.repository.CmsBorradorRepository;
import monolithe.cms_service.repository.CmsPublicacionHistorialRepository;
import monolithe.cms_service.repository.CmsPublicacionVersionRepository;
import monolithe.cms_service.repository.MultimediaAsignacionRepository;
import monolithe.cms_service.repository.MultimediaRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.SeccionRepository;
import monolithe.cms_service.repository.TipoMultimediaRepository;
import monolithe.cms_service.repository.UsoMultimediaRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Prueba los callbacks de compensación del publicador sin acceder a Storage ni PostgreSQL reales.
 * Los cambios SQL requieren una prueba JPA transaccional aparte para comprobar rollback efectivo.
 */
@ExtendWith(MockitoExtension.class)
class CmsPublicacionImagenesCompensacionTest {
    private static final String CLAVE_PRIVADA = "borradores/12/23/fondo.png";
    private static final String CLAVE_PUBLICA =
            "contenido-web/inicio/23/12345678-1234-1234-1234-123456789abc.png";
    private static final byte[] IMAGEN = "imagen-de-prueba".getBytes(StandardCharsets.UTF_8);

    @Mock private CmsBorradorRepository borradorRepository;
    @Mock private CmsBorradorImagenRepository imagenRepository;
    @Mock private PaginaRepository paginaRepository;
    @Mock private CmsPublicacionVersionRepository versionRepository;
    @Mock private SeccionRepository seccionRepository;
    @Mock private CmsPublicacionHistorialRepository historialRepository;
    @Mock private MultimediaRepository multimediaRepository;
    @Mock private MultimediaAsignacionRepository asignacionRepository;
    @Mock private TipoMultimediaRepository tiposMultimedia;
    @Mock private UsoMultimediaRepository usosMultimedia;
    @Mock private StorageBorradoresPrivado storagePrivado;
    @Mock private SupabaseStorageService storagePublico;
    @InjectMocks private CmsPublicacionService service;

    private CmsBorrador borrador;
    private Seccion promocion;

    @BeforeEach
    void prepararEntorno() {
        // Simula el callback de Spring; no crea ni confirma una transacción JDBC.
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        ReflectionTestUtils.setField(service, "publicacionImagenesHabilitada", true);

        borrador = new CmsBorrador();
        borrador.setIdBorrador(12L);
        borrador.setIdUsuarioRegistro(7L);
        borrador.setIdPagina(91L);
        borrador.setRevisionEdicion(5L);
        borrador.setRevisionBase(0L);
        borrador.setEstado(EstadoBorrador.EN_EDICION);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);
        borrador.setContenidoPendiente(Map.of("secciones", List.of(Map.of("id_seccion", 23L))));

        promocion = new Seccion();
        promocion.setIdSeccion(23L);
        promocion.setIdPagina(91L);
        promocion.setCodigo("HERO_SLIDE_2_PROMO");
        promocion.setActivo(true);
        promocion.setVisible(false);
        promocion.setTitulo("Título comercial inmutable");
        promocion.setContenido("Descripción comercial inmutable");
    }

    @AfterEach
    void liberarSincronizacion() {
        TransactionSynchronizationManager.clearSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    private void prepararBorradorEImagen(byte[] bytes, String hash) {
        Pagina inicio = new Pagina();
        inicio.setIdPagina(91L);
        inicio.setCodigo("INICIO");
        inicio.setActivo(true);
        inicio.setTitulo("Sitio público");
        inicio.setSlug("inicio");

        CmsBorradorImagen imagen = new CmsBorradorImagen();
        imagen.setIdBorrador(12L);
        imagen.setIdSeccion(23L);
        imagen.setIdUsuarioRegistro(7L);
        imagen.setBucketId("cms-drafts-private");
        imagen.setObjectKey(CLAVE_PRIVADA);
        imagen.setMimeType("image/png");
        imagen.setTamanoBytes((long) bytes.length);
        imagen.setHashSha256(hash);

        when(borradorRepository.findWithLockByIdBorradorAndIdUsuarioRegistro(12L, 7L))
                .thenReturn(Optional.of(borrador));
        when(paginaRepository.findWithLockByIdPagina(91L)).thenReturn(Optional.of(inicio));
        when(versionRepository.findWithLockByIdPagina(91L)).thenReturn(Optional.empty());
        when(seccionRepository.findWithLockByIdPaginaOrderByOrdenAsc(91L))
                .thenReturn(List.of(promocion));
        when(imagenRepository.findByIdBorradorOrderByIdSeccionAsc(12L))
                .thenReturn(List.of(imagen));
        when(storagePrivado.descargar(CLAVE_PRIVADA)).thenReturn(bytes);
    }

    private void prepararCatalogosYSubida() {
        TipoMultimedia tipo = new TipoMultimedia();
        tipo.setIdTipoMultimedia(4);
        tipo.setCodigo("IMAGEN");
        when(tiposMultimedia.findByActivoTrueOrderByOrdenAsc()).thenReturn(List.of(tipo));
        UsoMultimedia uso = new UsoMultimedia();
        uso.setIdUsoMultimedia(7);
        uso.setCodigo("FONDO");
        when(usosMultimedia.findByActivoTrueOrderByOrdenAsc()).thenReturn(List.of(uso));
        when(storagePublico.nuevaClaveImagenCms(23L, "image/png")).thenReturn(CLAVE_PUBLICA);
    }

    private void prepararGuardados() {
        when(multimediaRepository.saveAndFlush(any(Multimedia.class))).thenAnswer(inv -> {
            Multimedia m = inv.getArgument(0);
            m.setIdMultimedia(101L);
            return m;
        });
        when(asignacionRepository.saveAndFlush(any(MultimediaAsignacion.class))).thenAnswer(inv -> {
            MultimediaAsignacion a = inv.getArgument(0);
            a.setIdMultimediaAsignacion(202L);
            return a;
        });
        when(versionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(borradorRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void confirmaYConservaArchivoPublicoTrasCommit() {
        prepararBorradorEImagen(IMAGEN, ImagenBorradorValidador.hash(IMAGEN));
        prepararCatalogosYSubida();
        prepararGuardados();
        when(historialRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> service.publicarContenido(12L, 5L, 0L, 7L));
        verify(storagePublico).subirImagenCms(CLAVE_PUBLICA, IMAGEN, "image/png");
        verify(multimediaRepository).saveAndFlush(argThat(m ->
                CLAVE_PUBLICA.equals(m.getClaveArchivo()) && m.getIdTipoMultimedia() == 4));
        verify(asignacionRepository).saveAndFlush(argThat(a ->
                a.getIdSeccion().equals(23L) && a.getIdUsoMultimedia() == 7
                        && Boolean.TRUE.equals(a.getVisible())));
        assertTrue(promocion.getVisible());
        assertEquals(EstadoBorrador.PUBLICADO, borrador.getEstado());

        TransactionSynchronizationUtils.triggerAfterCompletion(TransactionSynchronization.STATUS_COMMITTED);
        verify(storagePublico, never()).eliminarImagenCms(anyString());
    }

    @Test
    void eliminaObjetoPublicoSiFallaPersistenciaDelHistorial() {
        prepararBorradorEImagen(IMAGEN, ImagenBorradorValidador.hash(IMAGEN));
        prepararCatalogosYSubida();
        prepararGuardados();
        when(historialRepository.save(any())).thenThrow(new IllegalStateException("Error QA: historial"));

        assertThrows(IllegalStateException.class,
                () -> service.publicarContenido(12L, 5L, 0L, 7L));
        verify(storagePublico).subirImagenCms(CLAVE_PUBLICA, IMAGEN, "image/png");
        verify(storagePublico, never()).eliminarImagenCms(anyString());
        TransactionSynchronizationUtils.triggerAfterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        verify(storagePublico).eliminarImagenCms(CLAVE_PUBLICA);
    }

    @Test
    void intentaCompensarTimeoutDeSubidaAntesDeEscribirMultimedia() {
        prepararBorradorEImagen(IMAGEN, ImagenBorradorValidador.hash(IMAGEN));
        prepararCatalogosYSubida();
        doThrow(new IllegalStateException("Error QA: timeout tras subir"))
                .when(storagePublico).subirImagenCms(CLAVE_PUBLICA, IMAGEN, "image/png");

        assertThrows(IllegalStateException.class,
                () -> service.publicarContenido(12L, 5L, 0L, 7L));
        verify(multimediaRepository, never()).saveAndFlush(any());
        verify(historialRepository, never()).save(any());
        TransactionSynchronizationUtils.triggerAfterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        verify(storagePublico).eliminarImagenCms(CLAVE_PUBLICA);
    }

    @Test
    void rechazaImagenManipuladaAntesDeSubirNada() {
        prepararBorradorEImagen(IMAGEN, "0".repeat(64));
        assertThrows(RuntimeException.class,
                () -> service.publicarContenido(12L, 5L, 0L, 7L));
        verifyNoInteractions(storagePublico);
        assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
    }
}
