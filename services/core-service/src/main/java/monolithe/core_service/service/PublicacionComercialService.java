package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.*;
import monolithe.core_service.dto.PublicacionComercialResponse.Fila;
import monolithe.core_service.entity.Lote;
import monolithe.core_service.entity.AjusteTipoLote;
import monolithe.core_service.exception.*;
import monolithe.core_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.time.*;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PublicacionComercialService {
    private final ConfiguracionProyectoService configuracion;
    private final PublicacionComercialRepository repository;
    private final LoteRepository lotes;
    private final AjusteTipoLoteRepository ajustes;
    private final SimulacionComercialService simulacion;
    private final JsonMapper mapper;

    @Transactional(readOnly=true)
    public PublicacionComercialResponse previsualizar(Long proyecto, PublicacionComercialRequest request) {
        if (!repository.proyectoHabilitado(proyecto)) throw new ReglaNegocioException("Proyecto no habilitado.");
        var config = configuracion.obtener(proyecto);
        int publicada = repository.versionPublicada(proyecto);
        if (config.version()!=request.version() || config.version()<=publicada)
            throw new ConflictoNegocioException("Guarda un borrador nuevo antes de publicar.");
        if (!config.monedas().contains("PEN") || config.lotes().isEmpty() || config.datos().etapas().isEmpty())
            throw new ReglaNegocioException("Se requieren lotes, etapas y moneda PEN para publicar.");
        var filas = evaluar(proyecto,config,request.habilitarNoDisponibles());
        return new PublicacionComercialResponse(config.version(),publicada,huella(proyecto,config.version(),publicada,request.habilitarNoDisponibles(),filas),false,filas);
    }

    @Transactional
    public PublicacionComercialResponse publicar(Long proyecto, Long actor, PublicacionComercialRequest request) {
        repository.bloquearProyecto(proyecto);
        var previo = previsualizar(proyecto,request);
        if (!previo.huella().equals(request.huella())) throw new ConflictoNegocioException("La revisión cambió. Valida de nuevo.");
        if (previo.lotes().stream().anyMatch(f -> f.situacion().equals("ERROR")))
            throw new ReglaNegocioException("Corrige todos los lotes con errores antes de publicar.");
        repository.publicar(proyecto,previo.version(),actor);
        previo.lotes().forEach(f -> registrar(proyecto,previo.version(),actor,f));
        return new PublicacionComercialResponse(previo.version(),previo.version(),previo.huella(),true,previo.lotes());
    }

    public int versionPublicada(Long proyecto) {
        return repository.versionPublicada(proyecto);
    }

    private List<Fila> evaluar(Long proyecto, ConfiguracionProyectoResponse config, boolean habilitar) {
        var protegidos = new HashSet<>(repository.protegidos(proyecto));
        var candidatos = ajustes.findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(proyecto);
        var ahora = ZonedDateTime.now(ZoneId.of("America/Lima"));
        var parcelas = lotes.findAllById(config.lotes().stream().map(ConfiguracionProyectoResponse.Lote::id).toList());
        if (parcelas.size()!=config.lotes().size()) throw new ConflictoNegocioException("El inventario cambió.");
        return parcelas.stream().sorted(Comparator.comparing(Lote::getIdLote))
            .map(l -> evaluarFila(config,l,protegidos.contains(l.getIdLote()),habilitar,ahora,candidatos)).toList();
    }

    private Fila evaluarFila(ConfiguracionProyectoResponse config,Lote lote,boolean protegido,
            boolean habilitar,ZonedDateTime ahora,List<AjusteTipoLote> candidatos) {
        BigDecimal actual = repository.precioActual(lote.getIdLote());
        if (protegido) return sinPrecio(lote,null,"PROTEGIDA","Operación existente: se conserva el precio.",actual);
        var r = simulacion.evaluar(config,lote,"PEN",ahora,candidatos);
        if (!r.resultado().equals("SIMULADO")) {
            return sinPrecio(lote,r.codigoEtapa(),
                ClasificadorPublicacionComercial.situacion(r.resultado()),
                ClasificadorPublicacionComercial.detalle(r.resultado(),r.mensaje()),actual);
        }
        if (!precioValido(r)) {
            return sinPrecio(lote,r.codigoEtapa(),"ERROR","Precio fuera de los límites permitidos.",actual);
        }
        var hasta = config.datos().tarifas().stream()
            .filter(t -> Objects.equals(t.codigoZona(),r.codigoZona()) && t.codigoEtapa().equals(r.codigoEtapa()) && t.moneda().equals("PEN"))
            .findFirst().orElseThrow().vigenteHasta();
        return new Fila(lote.getIdLote(),lote.getCodigo(),r.estadoInventario(),r.codigoEtapa(),"HABILITADA",
            "Precio comercial calculado en PEN.",actual,r.precioBase(),r.ajusteTipo(),r.descuento(),r.precioSimulado(),
            hasta,habilitar && r.estadoInventario().equals("NO_DISPONIBLE"));
    }

    private boolean precioValido(SimulacionComercialResponse r) {
        return r.precioSimulado().signum()>0 && r.ajusteTipo().signum()>=0
            && List.of(r.precioBase(),r.ajusteTipo(),r.descuento(),r.precioSimulado(),r.precioBase().add(r.ajusteTipo()))
                .stream().allMatch(n -> n.signum()>=0 && n.precision()-n.scale()<=12);
    }

    private Fila sinPrecio(Lote lote,String etapa,String situacion,String mensaje,BigDecimal actual) {
        return new Fila(lote.getIdLote(),lote.getCodigo(),lote.getEstadoLote().getCodigo(),etapa,situacion,
            mensaje,actual,null,null,null,null,null,false);
    }

    private void registrar(Long proyecto,int version,Long actor,Fila fila) {
        Long precio = fila.situacion().equals("HABILITADA") ? repository.registrarPrecio(fila,version) : null;
        repository.registrarFila(proyecto,version,fila,precio);
        if (fila.habilitarInventario()) repository.habilitarInventario(fila.idLote(),actor,version);
    }

    private String huella(Long proyecto,int version,int publicada,boolean habilitar,List<Fila> filas) {
        try {
            byte[] bytes=mapper.writeValueAsBytes(List.of(proyecto,version,publicada,habilitar,filas));
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo verificar la revisión comercial.",ex);
        }
    }
}
