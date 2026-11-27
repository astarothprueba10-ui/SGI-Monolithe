package monolithe.core_service.service;

import monolithe.core_service.dto.ConfiguracionProyectoResponse;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.GestionComercialDto;
import monolithe.core_service.dto.SimulacionComercialResponse;
import monolithe.core_service.entity.Lote;
import monolithe.core_service.entity.Zona;
import monolithe.core_service.exception.*;
import monolithe.core_service.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GestionComercialServiceTest {
    private final ConfiguracionProyectoService configuracion=mock(ConfiguracionProyectoService.class);
    private final PublicacionComercialRepository repo=mock(PublicacionComercialRepository.class);
    private final LoteRepository lotes=mock(LoteRepository.class);
    private final AjusteTipoLoteRepository ajustes=mock(AjusteTipoLoteRepository.class);
    private final SimulacionComercialService simulacion=mock(SimulacionComercialService.class);
    private final JsonMapper mapper=JsonMapper.builder().build();
    private final PublicacionComercialService service=new PublicacionComercialService(configuracion,repo,lotes,ajustes,simulacion,mapper);
    private final Long proyecto=100L,actor=5L;
    private final Tarifa tarifa1=new Tarifa("Z-A","E1","PEN",TipoTarifa.MONTO_FIJO,BigDecimal.valueOf(26000),LocalDate.of(2020,1,1),null);
    private final Tarifa tarifa2=new Tarifa("Z-A","E2","PEN",TipoTarifa.MONTO_FIJO,BigDecimal.valueOf(27000),LocalDate.of(2020,1,1),null);
    private final Datos datos=new Datos(List.of(new Etapa("E1","Etapa 1",Disponibilidad.REGULAR,TipoDescuento.NINGUNO,BigDecimal.ZERO),
        new Etapa("E2","Etapa 2",Disponibilidad.REGULAR,TipoDescuento.NINGUNO,BigDecimal.ZERO)),
        List.of(new Asignacion(10L,"E1"),new Asignacion(20L,"E2")),List.of(),List.of(tarifa1,tarifa2));
    private final ConfiguracionProyectoResponse config=new ConfiguracionProyectoResponse(1,datos,
        List.of(new ConfiguracionProyectoResponse.Manzana(10L,"M1","M1"),new ConfiguracionProyectoResponse.Manzana(20L,"M2","M2")),
        List.of(new ConfiguracionProyectoResponse.Lote(1L,10L,"L1","DISPONIBLE"),new ConfiguracionProyectoResponse.Lote(2L,10L,"L2","RESERVADO"),
            new ConfiguracionProyectoResponse.Lote(3L,20L,"L3","NO_DISPONIBLE"),new ConfiguracionProyectoResponse.Lote(4L,20L,"L4","BLOQUEADO")),
        List.of("Z-A"),List.of("PEN"));

    @BeforeEach void preparar() {
        when(repo.puedeVerificarIntegridadPublicacion()).thenReturn(true);
        when(repo.versionPublicada(proyecto)).thenReturn(1);
        when(repo.proyectoHabilitado(proyecto)).thenReturn(true);
        when(configuracion.obtener(proyecto)).thenReturn(config);
        when(repo.seleccionRegistrada(proyecto,1)).thenReturn(true);
        when(repo.ultimoEstado(proyecto,1)).thenReturn(Optional.of(new PublicacionComercialRepository.EventoEstado(10L,
            mapper.writeValueAsString(new GestionComercialDto.Estado(List.of("E1"),datos.tarifas())))));
        when(repo.foto(proyecto,1)).thenReturn("[]");
        when(repo.protegidos(proyecto)).thenReturn(List.of(2L));
        when(repo.reglas(proyecto,1)).thenReturn(List.of(
            new PublicacionComercialRepository.Regla(1L,"E1","HABILITADA",11L,true),
            new PublicacionComercialRepository.Regla(2L,"E1","PROTEGIDA",null,false),
            new PublicacionComercialRepository.Regla(3L,"E2","BLOQUEADA",13L,true),
            new PublicacionComercialRepository.Regla(4L,"E2","BLOQUEADA",14L,true)));
        doAnswer(inv->{
            var nuevo=mapper.readTree(inv.getArgument(5,String.class)).get("estado");
            when(repo.ultimoEstado(proyecto,1)).thenReturn(Optional.of(new PublicacionComercialRepository.EventoEstado(11L,nuevo.toString())));
            return null;
        }).when(repo).evento(eq(proyecto),eq(1),eq(actor),anyString(),anyString(),anyString());
    }

    @Test void cierreYReaperturaNoEscribenPreciosNiRepublican() {
        var r=service.guardarDisponibilidad(proyecto,actor,new GestionComercialDto.Disponibilidad(10L,List.of("E2")));
        assertEquals(List.of("E2"),r.estado().etapasHabilitadas());
        assertEquals(11L,r.revision());
        verify(repo).bloquearInventario(1L,actor,1);
        verify(repo).habilitarInventario(3L,actor,1);
        verify(repo).cambiarSituacion(proyecto,1,1L,"BLOQUEADA");
        verify(repo).cambiarSituacion(proyecto,1,3L,"HABILITADA");
        verify(repo,never()).habilitarInventario(eq(4L),anyLong(),anyInt());
        verify(repo,never()).cambiarSituacion(eq(proyecto),eq(1),eq(2L),anyString());
        verify(repo,never()).registrarPrecio(any(),anyInt());
        verify(repo,never()).publicar(anyLong(),anyInt(),anyLong());
        verify(repo).evento(eq(proyecto),eq(1),eq(actor),eq("DISPONIBILIDAD"),anyString(),anyString());
        verifyNoInteractions(lotes,ajustes,simulacion);
    }

    @Test void precioFaltanteImpideCambiosAntesDeModificarInventario() {
        when(repo.reglas(proyecto,1)).thenReturn(List.of(
            new PublicacionComercialRepository.Regla(1L,"E1","HABILITADA",11L,true),
            new PublicacionComercialRepository.Regla(3L,"E2","BLOQUEADA",null,false)));
        assertThrows(ReglaNegocioException.class,()->service.guardarDisponibilidad(proyecto,actor,new GestionComercialDto.Disponibilidad(10L,List.of("E2"))));
        verify(repo,never()).cambiarSituacion(anyLong(),anyInt(),anyLong(),anyString());
        verify(repo,never()).bloquearInventario(anyLong(),anyLong(),anyInt());
        verify(repo,never()).evento(anyLong(),anyInt(),anyLong(),anyString(),anyString(),anyString());
    }

    @Test void rechazaRevisionDesactualizadaYEtapasAjenas() {
        assertThrows(ConflictoNegocioException.class,()->service.guardarDisponibilidad(proyecto,actor,new GestionComercialDto.Disponibilidad(9L,List.of("E2"))));
        assertThrows(ReglaNegocioException.class,()->service.guardarDisponibilidad(proyecto,actor,new GestionComercialDto.Disponibilidad(10L,List.of("AJENA"))));
        verify(repo,never()).cambiarSituacion(anyLong(),anyInt(),anyLong(),anyString());
    }

    @Test void tarifaSoloAfectaGrupoYConservaEtapasYOperaciones() {
        var lote=mock(Lote.class);
        var protegido=mock(Lote.class);
        var zona=mock(Zona.class);
        when(zona.getCodigo()).thenReturn("Z-A");
        when(lote.getIdLote()).thenReturn(1L);when(lote.getCodigo()).thenReturn("L1");when(lote.getZona()).thenReturn(zona);
        when(protegido.getIdLote()).thenReturn(2L);when(protegido.getZona()).thenReturn(zona);
        when(lotes.findAllById(List.of(1L,2L))).thenReturn(List.of(lote,protegido));
        BigDecimal valor=BigDecimal.valueOf(28000);
        when(simulacion.evaluar(any(),eq(lote),eq("PEN"),any(),any())).thenReturn(
            new SimulacionComercialResponse(1,1L,"L1","DISPONIBLE","Z-A","E1","REGULAR","PEN",LocalDate.now(),
                "SIMULADO","",valor,BigDecimal.ZERO,BigDecimal.ZERO,valor));
        when(repo.registrarPrecio(any(),eq(1))).thenReturn(21L);
        var nueva=new Tarifa("Z-A","E1","PEN",TipoTarifa.MONTO_FIJO,valor,LocalDate.of(2020,1,1),null);
        var r=service.guardarTarifa(proyecto,actor,new GestionComercialDto.CambioTarifa(10L,nueva));
        assertEquals(List.of("E1"),r.estado().etapasHabilitadas());
        assertTrue(r.estado().tarifas().containsAll(List.of(nueva,tarifa2)));
        verify(lotes).findAllById(List.of(1L,2L));
        verify(repo).actualizarPrecioRegla(eq(proyecto),eq(1),argThat(f->f.idLote().equals(1L)&&f.precioFinal().equals(valor)),eq(21L),eq("HABILITADA"));
        verify(repo,never()).cambiarSituacion(anyLong(),anyInt(),anyLong(),anyString());
        verify(repo,never()).habilitarInventario(anyLong(),anyLong(),anyInt());
        verify(repo,never()).bloquearInventario(anyLong(),anyLong(),anyInt());
        verify(repo,never()).publicar(anyLong(),anyInt(),anyLong());
    }

    @Test void tarifaAnteriorNoConvierteSeleccionInferidaEnConfirmada() {
        when(repo.seleccionRegistrada(proyecto,1)).thenReturn(false);
        assertTrue(service.gestion(proyecto).inferida());
    }
}
