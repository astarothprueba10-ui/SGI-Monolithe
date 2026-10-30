package monolithe.cms_service.service;

import monolithe.cms_service.entity.CmsBorradorImagen;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.repository.CmsBorradorImagenRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CmsBorradorImagenesDescartadasLimpiezaTest {
    @Mock CmsBorradorImagenRepository imagenes;
    @Mock StorageBorradoresPrivado storage;
    @InjectMocks CmsBorradorImagenesDescartadasLimpieza limpieza;

    private static CmsBorradorImagen imagen(String key) {
        var i = new CmsBorradorImagen();
        i.setIdImagenBorrador(4L);
        i.setIdBorrador(2L);
        i.setIdSeccion(1L);
        i.setObjectKey(key);
        return i;
    }

    private void pendientes(CmsBorradorImagen... items) {
        when(imagenes.buscarPendientesDescartados(
                eq(EstadoBorrador.DESCARTADO), eq(EstadoBorrador.PUBLICADO),
                eq("cms-drafts-private"),
                eq(PageRequest.of(0, 50)))).thenReturn(List.of(items));
    }

    @Test void eliminaObjetoAntesDeReferencia() {
        String key = "borradores/2/1/11111111-1111-1111-1111-111111111111.jpg";
        pendientes(imagen(key));
        when(imagenes.eliminarReferenciaDescartada(4L, key)).thenReturn(1);
        limpieza.ejecutarLote();
        var orden = inOrder(storage, imagenes);
        orden.verify(storage).eliminar(key);
        orden.verify(imagenes).eliminarReferenciaDescartada(4L, key);
    }

    @Test void siStorageFallaConservaReferenciaParaReintento() {
        String key = "borradores/2/1/11111111-1111-1111-1111-111111111111.jpg";
        pendientes(imagen(key));
        doThrow(new IllegalStateException("Storage temporalmente no disponible"))
                .when(storage).eliminar(key);
        assertDoesNotThrow(() -> limpieza.ejecutarLote());
        verify(imagenes, never()).eliminarReferenciaDescartada(any(), any());
    }

    @Test void siBDFallaElRegistroQuedaParaReintento() {
        String key = "borradores/2/1/11111111-1111-1111-1111-111111111111.jpg";
        pendientes(imagen(key));
        when(imagenes.eliminarReferenciaDescartada(4L, key))
                .thenThrow(new IllegalStateException("BD temporalmente no disponible"));
        assertDoesNotThrow(() -> limpieza.ejecutarLote());
        verify(storage).eliminar(key);
    }

    @Test void noEliminaUnaRutaQueNoCoincideConElBorrador() {
        pendientes(imagen("borradores/999/1/11111111-1111-1111-1111-111111111111.jpg"));
        limpieza.ejecutarLote();
        verifyNoInteractions(storage);
        verify(imagenes, never()).eliminarReferenciaDescartada(any(), any());
    }

    @Test void sinPendientesNoContactaStorage() {
        pendientes();
        limpieza.ejecutarLote();
        verifyNoInteractions(storage);
        verify(imagenes, never()).eliminarReferenciaDescartada(any(), any());
    }
}
