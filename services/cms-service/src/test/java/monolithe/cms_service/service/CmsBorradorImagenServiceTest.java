package monolithe.cms_service.service;

import monolithe.cms_service.entity.*;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CmsBorradorImagenServiceTest {
    @Mock CmsBorradorRepository borradores;
    @Mock CmsBorradorImagenRepository imagenes;
    @Mock SeccionRepository secciones;
    @Mock ImagenBorradorValidador validador;
    @Mock StorageBorradoresPrivado storage;
    @InjectMocks CmsBorradorImagenService servicio;

    private CmsBorrador borrador() {
        CmsBorrador b = new CmsBorrador();
        b.setIdBorrador(5L);
        b.setIdPagina(1L);
        b.setIdUsuarioRegistro(7L);
        b.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);
        b.setEstado(EstadoBorrador.EN_EDICION);
        b.setRevisionEdicion(2L);
        return b;
    }

    private Seccion seccion() {
        Seccion s = new Seccion();
        s.setIdSeccion(9L);
        s.setIdPagina(1L);
        s.setActivo(true);
        return s;
    }

    @AfterEach void despues() {
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.clearSynchronization();
    }

    @Test void rechazaRevisionObsoletaAntesDeSubir() {
        when(borradores.findWithLockByIdBorradorAndIdUsuarioRegistro(5L, 7L))
                .thenReturn(Optional.of(borrador()));
        when(secciones.findById(9L)).thenReturn(Optional.of(seccion()));
        assertThrows(ConflictException.class, () -> servicio.guardar(5L, 9L, 1L, 7L,
                new MockMultipartFile("archivo", "foto.jpg", "image/jpeg", new byte[]{1})));
        verifyNoInteractions(validador, storage, imagenes);
    }

    @Test void nuevaImagenSeCompensaCuandoHayRollback() {
        when(borradores.findWithLockByIdBorradorAndIdUsuarioRegistro(5L, 7L))
                .thenReturn(Optional.of(borrador()));
        when(secciones.findById(9L)).thenReturn(Optional.of(seccion()));
        when(imagenes.findByIdBorradorAndIdSeccion(5L, 9L)).thenReturn(Optional.empty());
        when(validador.validar(any())).thenReturn(new ImagenBorradorValidador.ImagenValidada(
                new byte[]{1,2,3}, "image/png", ".png", "0123456789abcdef"));
        TransactionSynchronizationManager.initSynchronization();
        var resultado = servicio.guardar(5L, 9L, 2L, 7L,
                new MockMultipartFile("archivo", "foto.png", "image/png", new byte[]{1}));
        assertEquals(3L, resultado.revisionEdicion());
        var captura = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(storage).subir(captura.capture(), any(), eq("image/png"));
        assertTrue(captura.getValue().matches("borradores/5/9/[0-9a-f-]{36}\\.png"));
        for (var sync : TransactionSynchronizationManager.getSynchronizations())
            sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        verify(storage).eliminar(captura.getValue());
    }

    @Test void borradorAjenoNuncaAccedeStorage() {
        when(borradores.findByIdBorradorAndIdUsuarioRegistro(5L, 8L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> servicio.obtener(5L, 9L, 8L));
        verifyNoInteractions(imagenes, storage);
    }

    @Test void noAceptaBorradorDeVisibilidad() {
        CmsBorrador b = borrador();
        b.setTipoObjetivo(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        when(borradores.findByIdBorradorAndIdUsuarioRegistro(5L, 7L)).thenReturn(Optional.of(b));
        assertThrows(ConflictException.class, () -> servicio.obtener(5L, 9L, 7L));
        verifyNoInteractions(imagenes, storage);
    }

    @Test void noAccedeSeccionAjena() {
        when(borradores.findByIdBorradorAndIdUsuarioRegistro(5L, 7L)).thenReturn(Optional.of(borrador()));
        Seccion s = seccion(); s.setIdPagina(3L);
        when(secciones.findById(9L)).thenReturn(Optional.of(s));
        assertThrows(ResourceNotFoundException.class, () -> servicio.obtener(5L, 9L, 7L));
        verifyNoInteractions(imagenes, storage);
    }

    @Test void descargaCompruebaHash() {
        when(borradores.findByIdBorradorAndIdUsuarioRegistro(5L, 7L)).thenReturn(Optional.of(borrador()));
        when(secciones.findById(9L)).thenReturn(Optional.of(seccion()));
        CmsBorradorImagen img = new CmsBorradorImagen();
        img.setObjectKey("borradores/5/9/00000000-0000-0000-0000-000000000000.jpg");
        img.setMimeType("image/jpeg");
        img.setHashSha256("incorrecto");
        when(imagenes.findByIdBorradorAndIdSeccion(5L, 9L)).thenReturn(Optional.of(img));
        when(storage.descargar(img.getObjectKey())).thenReturn(new byte[]{1,2,3});
        assertThrows(IllegalStateException.class, () -> servicio.obtener(5L, 9L, 7L));
    }
}
