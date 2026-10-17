package monolithe.cms_service.service;

import monolithe.cms_service.dto.ConsultaWebRequest;
import monolithe.cms_service.entity.ConsultaWeb;
import monolithe.cms_service.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ConsultaWebServiceTest {
    private final ConsultaWebRepository consultas = mock(ConsultaWebRepository.class);
    private final CaptacionRepository captaciones = mock(CaptacionRepository.class);
    private final CaptacionService crm = mock(CaptacionService.class);
    private final ConsultaWebService service = new ConsultaWebService(consultas, captaciones, crm,
            mock(EstadoService.class), mock(PaginaRepository.class));
    private ConsultaWebRequest reintento() {
        var r = new ConsultaWebRequest(); r.setIdSolicitud(UUID.randomUUID());
        when(captaciones.consultaAnterior(r.getIdSolicitud())).thenReturn(10L);
        var c = new ConsultaWeb(); c.setIdConsultaWeb(10L); c.setCodigo("CW-guardado");
        when(consultas.findById(10L)).thenReturn(Optional.of(c)); return r;
    }
    @Test void unReintentoDevuelveElMismoCodigoSinCrearOtraConsulta() {
        var r = reintento(); assertEquals("MON-000010", service.registrarConsulta(r).getCodigo());
        assertEquals("MON-000010", service.registrarConsulta(r).getCodigo());
        verify(consultas, never()).saveAndFlush(any()); verify(crm, times(2)).registrar(r, null, 10L);
    }
    @Test void noConfirmaCuandoLaBaseNoConfirmaLaCaptacion() {
        var r = reintento(); when(crm.registrar(r, null, 10L))
                .thenThrow(new DataAccessResourceFailureException("Sin conexión"));
        assertThrows(DataAccessResourceFailureException.class, () -> service.registrarConsulta(r));
    }
}
