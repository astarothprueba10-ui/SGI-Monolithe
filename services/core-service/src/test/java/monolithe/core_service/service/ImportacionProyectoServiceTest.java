package monolithe.core_service.service;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import monolithe.core_service.dto.ImportacionProyectoRequest;
import monolithe.core_service.dto.ImportacionProyectoRequest.Fila;
import monolithe.core_service.dto.ZonaResponse;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.ImportacionProyectoRepository;
import monolithe.core_service.repository.ImportacionProyectoRepository.Referencia;
import monolithe.core_service.repository.ProyectoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ImportacionProyectoServiceTest {
    private final ImportacionProyectoRepository repo = mock(ImportacionProyectoRepository.class);
    private final ProyectoRepository proyectos = mock(ProyectoRepository.class);
    private final EtapaService etapas = mock(EtapaService.class);
    private final ZonaService zonas = mock(ZonaService.class);
    private final ManzanaService manzanas = mock(ManzanaService.class);
    private final LoteService lotes = mock(LoteService.class);
    private ValidatorFactory factory;
    private ImportacionProyectoService service;

    @BeforeEach
    void preparar() {
        factory = Validation.buildDefaultValidatorFactory();
        service = new ImportacionProyectoService(repo, proyectos, etapas, zonas, manzanas, lotes, factory.getValidator());
        Proyecto p = new Proyecto();
        p.setCodigo("PROY-001");
        when(proyectos.findById(2L)).thenReturn(Optional.of(p));
        when(repo.estadosEtapa()).thenReturn(List.of("ACTIVO"));
        when(repo.estadosManzana()).thenReturn(List.of("ACTIVO"));
        when(repo.tiposLote()).thenReturn(List.of("REGULAR"));
    }
    @AfterEach
    void cerrar() { factory.close(); }

    private Fila zona(int numero, String codigo) {
        return new Fila("Zonas", numero, Map.of("codigo", codigo, "nombre", "Zona de prueba", "orden", "1", "descripcion", ""));
    }

    private ImportacionProyectoRequest solicitud(List<Fila> filas, String huella) {
        return new ImportacionProyectoRequest(1, "PROY-001", filas, huella);
    }

    @Test
    void vistaPreviaNoRegistraYDetectaExistentes() {
        when(repo.zonas(2L)).thenReturn(List.of(new Referencia(9L, "Z-A", true)));
        var r = service.previsualizar(2L, solicitud(List.of(zona(2,"Z-A"),zona(3,"Z-B")), null));
        assertEquals(List.of("EXISTENTE","NUEVO"), r.filas().stream().map(f -> f.estado()).toList());
        verifyNoInteractions(etapas, zonas, manzanas, lotes);
    }

    @Test
    void confirmaSoloTrasValidarYConservaExistentes() {
        when(repo.zonas(2L)).thenReturn(List.of(new Referencia(9L, "Z-A", true)));
        when(zonas.crear(any())).thenReturn(new ZonaResponse(10L,2L,"PROY-001","Proyecto","Z-B","Zona de prueba",null,1,true));
        var filas = List.of(zona(2,"Z-A"),zona(3,"Z-B"));
        var previo = service.previsualizar(2L, solicitud(filas,null));
        assertTrue(service.confirmar(2L, solicitud(filas,previo.huella())).confirmado());
        verify(zonas, times(1)).crear(argThat(z -> z.codigo().equals("Z-B")));
        verifyNoInteractions(etapas, manzanas, lotes);
    }

    @Test
    void detectaArchivoDuplicadoYNoRegistra() {
        var filas = List.of(zona(2,"Z-A"), zona(3,"z-a"));
        var previo = service.previsualizar(2L, solicitud(filas,null));
        assertEquals("ERROR", previo.filas().get(1).estado());
        assertThrows(ReglaNegocioException.class, () -> service.confirmar(2L, solicitud(filas,previo.huella())));
        verifyNoInteractions(etapas, zonas, manzanas, lotes);
    }

    @Test
    void rechazaVistaPreviaDesactualizada() {
        var filas = List.of(zona(2,"Z-A"));
        var previo = service.previsualizar(2L, solicitud(filas,null));
        when(repo.zonas(2L)).thenReturn(List.of(new Referencia(9L,"Z-A",true)));
        assertThrows(ConflictoNegocioException.class, () -> service.confirmar(2L,solicitud(filas,previo.huella())));
        verifyNoInteractions(etapas, zonas, manzanas, lotes);
    }

    @Test
    void rechazaLoteSinManzanaYPlantillaDeOtroProyecto() {
        var c = new HashMap<String,String>();
        for (String key : List.of("codigo_etapa_fisica","codigo_manzana","codigo","numero","codigo_zona","codigo_tipo_lote",
                "area_m2","frente_m","fondo_m","lateral_derecho_m","lateral_izquierdo_m","observaciones")) c.put(key,"");
        c.put("codigo","LT-01"); c.put("codigo_manzana","M-A"); c.put("codigo_etapa_fisica","ET-01");
        var fila = new Fila("Lotes",2,c);
        assertEquals("ERROR",service.previsualizar(2L,solicitud(List.of(fila),null)).filas().getFirst().estado());
        assertThrows(ReglaNegocioException.class, () -> service.previsualizar(2L,new ImportacionProyectoRequest(1,"PROY-002",List.of(fila),null)));
    }
}
