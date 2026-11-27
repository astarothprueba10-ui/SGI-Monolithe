package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.*;
import monolithe.core_service.dto.PublicacionComercialResponse.Fila;
import monolithe.core_service.entity.Lote;
import monolithe.core_service.entity.AjusteTipoLote;
import monolithe.core_service.exception.*;
import monolithe.core_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
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
        exigirIntegridadPublicacion();
        if (!repository.proyectoHabilitado(proyecto)) throw new ReglaNegocioException("Proyecto no habilitado.");
        int publicada = repository.versionPublicada(proyecto);
        if (publicada > 0) throw new ConflictoNegocioException("El proyecto ya fue publicado. No se admite otra publicación.");
        var config = configuracion.obtener(proyecto);
        if (config.version()!=request.version() || config.version()<=publicada)
            throw new ConflictoNegocioException("Guarda el borrador inicial antes de publicar.");
        if (!config.monedas().contains("PEN") || config.lotes().isEmpty() || config.datos().etapas().isEmpty())
            throw new ReglaNegocioException("Se requieren lotes, etapas y moneda PEN para publicar.");
        var seleccion = SeleccionEtapasPublicacion.validar(request.etapasHabilitar(), config.datos().etapas());
        var filas = evaluar(proyecto,config,seleccion);
        return new PublicacionComercialResponse(config.version(),publicada,
            huella(proyecto,config.version(),publicada,seleccion,filas),false,filas);
    }

    @Transactional
    public PublicacionComercialResponse publicar(Long proyecto, Long actor, PublicacionComercialRequest request) {
        exigirIntegridadPublicacion();
        repository.bloquearProyecto(proyecto);
        var previo = previsualizar(proyecto,request);
        if (!previo.huella().equals(request.huella())) throw new ConflictoNegocioException("La revisión cambió. Valida de nuevo.");
        if (previo.lotes().stream().anyMatch(f -> f.situacion().equals("ERROR")))
            throw new ReglaNegocioException("Corrige todos los lotes con errores antes de publicar.");
        repository.publicar(proyecto,previo.version(),actor);
        previo.lotes().forEach(f -> registrar(proyecto,previo.version(),actor,f));
        return new PublicacionComercialResponse(previo.version(),previo.version(),previo.huella(),true,previo.lotes());
    }

    private void exigirIntegridadPublicacion() {
        if (!repository.puedeVerificarIntegridadPublicacion()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "No se puede verificar la integridad de la publicación comercial. No se realizaron cambios.");
        }
    }

    public int versionPublicada(Long proyecto) {
        return repository.versionPublicada(proyecto);
    }

    private List<Fila> evaluar(Long proyecto, ConfiguracionProyectoResponse config, Set<String> etapasHabilitar) {
        var protegidos = new HashSet<>(repository.protegidos(proyecto));
        var candidatos = ajustes.findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(proyecto);
        var ahora = ZonedDateTime.now(ZoneId.of("America/Lima"));
        var parcelas = lotes.findAllById(config.lotes().stream().map(ConfiguracionProyectoResponse.Lote::id).toList());
        if (parcelas.size()!=config.lotes().size()) throw new ConflictoNegocioException("El inventario cambió.");
        return parcelas.stream().sorted(Comparator.comparing(Lote::getIdLote))
            .map(l -> evaluarFila(config,l,protegidos.contains(l.getIdLote()),etapasHabilitar,ahora,candidatos)).toList();
    }

    private Fila evaluarFila(ConfiguracionProyectoResponse config,Lote lote,boolean protegido,
            Set<String> etapasHabilitar,ZonedDateTime ahora,List<AjusteTipoLote> candidatos) {
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
            hasta,SeleccionEtapasPublicacion.liberarInventario(
                r.codigoEtapa(),r.estadoInventario(),etapasHabilitar));
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

    private String huella(Long proyecto,int version,int publicada,Set<String> etapasHabilitar,List<Fila> filas) {
        try {
            byte[] bytes=mapper.writeValueAsBytes(List.of(proyecto,version,publicada,List.copyOf(etapasHabilitar),filas));
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo verificar la revisión comercial.",ex);
        }
    }
}
