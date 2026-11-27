package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.*;
import monolithe.core_service.dto.PublicacionComercialResponse.Fila;
import monolithe.core_service.dto.GestionComercialDto.*;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.Tarifa;
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
        var filas = evaluar(proyecto,configParaPrecios(config),seleccion);
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
        var inicial = configuracion.obtener(proyecto);
        registrarEvento(proyecto,previo.version(),actor,"INICIAL",null,null,new Estado(List.copyOf(new TreeSet<>(request.etapasHabilitar())),inicial.datos().tarifas()));
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

    private ConfiguracionProyectoResponse configParaPrecios(ConfiguracionProyectoResponse config) {
        var d = config.datos();
        var etapas = d.etapas().stream().map(e -> e.disponibilidad()==ConfiguracionProyectoRequest.Disponibilidad.BLOQUEADA
            ? new ConfiguracionProyectoRequest.Etapa(e.codigo(),e.nombre(),ConfiguracionProyectoRequest.Disponibilidad.REGULAR,
                ConfiguracionProyectoRequest.TipoDescuento.NINGUNO,BigDecimal.ZERO) : e).toList();
        return new ConfiguracionProyectoResponse(config.version(),new ConfiguracionProyectoRequest.Datos(etapas,d.manzanas(),d.lotes(),d.tarifas()),
            config.manzanas(),config.lotes(),config.zonas(),config.monedas());
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
            var sin = sinPrecio(lote,r.codigoEtapa(),
                ClasificadorPublicacionComercial.situacion(r.resultado()),
                ClasificadorPublicacionComercial.detalle(r.resultado(),r.mensaje()),actual);
            return new Fila(sin.idLote(),sin.codigo(),sin.estadoInventario(),sin.codigoEtapa(),sin.situacion(),sin.mensaje(),actual,
                null,null,null,null,null,false,"BLOQUEADA".equals(sin.situacion()) && "DISPONIBLE".equals(sin.estadoInventario()));
        }
        if (!precioValido(r)) {
            return sinPrecio(lote,r.codigoEtapa(),"ERROR","Precio fuera de los límites permitidos.",actual);
        }
        var hasta = config.datos().tarifas().stream()
            .filter(t -> Objects.equals(t.codigoZona(),r.codigoZona()) && t.codigoEtapa().equals(r.codigoEtapa()) && t.moneda().equals("PEN"))
            .findFirst().orElseThrow().vigenteHasta();
        boolean abierta = etapasHabilitar.contains(r.codigoEtapa());
        return new Fila(lote.getIdLote(),lote.getCodigo(),r.estadoInventario(),r.codigoEtapa(),abierta ? "HABILITADA" : "BLOQUEADA",
            abierta ? "Precio comercial calculado en PEN." : "Precio preparado; etapa cerrada para nuevas ventas.",actual,r.precioBase(),r.ajusteTipo(),r.descuento(),r.precioSimulado(),
            hasta,SeleccionEtapasPublicacion.liberarInventario(
                r.codigoEtapa(),r.estadoInventario(),etapasHabilitar),
                SeleccionEtapasPublicacion.bloquearInventario(r.codigoEtapa(),r.estadoInventario(),etapasHabilitar));
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
        Long precio = fila.precioFinal()!=null ? repository.registrarPrecio(fila,version) : null;
        repository.registrarFila(proyecto,version,fila,precio);
        if (fila.bloquearInventario()) repository.bloquearInventario(fila.idLote(),actor,version);
        if (fila.habilitarInventario()) repository.habilitarInventario(fila.idLote(),actor,version);
    }

    @Transactional(readOnly=true)
    public Respuesta gestion(Long proyecto) {
        exigirIntegridadPublicacion();
        int version = repository.versionPublicada(proyecto);
        if (version <= 0) throw new ConflictoNegocioException("Finaliza primero la configuración inicial.");
        var config = configuracion.obtener(proyecto);
        if (config.version()!=version) throw new ConflictoNegocioException("La configuración consultada no coincide con la publicación vigente.");
        var evento = repository.ultimoEstado(proyecto,version);
        if (evento.isPresent()) {
            var e = evento.get();
            return new Respuesta(version,e.id(),!repository.seleccionRegistrada(proyecto,version),mapper.readValue(e.json(),Estado.class));
        }
        // Las publicaciones anteriores no registraban la selección explícita. Nunca deducirla del inventario.
        return new Respuesta(version,0,true,new Estado(repository.etapasHistoricas(proyecto,version),config.datos().tarifas()));
    }

    @Transactional(readOnly=true)
    public List<Evento> historial(Long proyecto) {
        exigirIntegridadPublicacion();
        return repository.historial(proyecto);
    }

    private Respuesta bloquearGestion(Long proyecto,long revision) {
        exigirIntegridadPublicacion();
        repository.bloquearProyecto(proyecto);
        if (!repository.proyectoHabilitado(proyecto)) throw new ReglaNegocioException("Proyecto no habilitado.");
        var actual = gestion(proyecto);
        if (actual.revision()!=revision) throw new ConflictoNegocioException("La gestión comercial cambió. Recarga antes de guardar.");
        return actual;
    }

    private String etapaDe(ConfiguracionProyectoResponse c,ConfiguracionProyectoResponse.Lote l) {
        return c.datos().lotes().stream().filter(a->a.id().equals(l.id())).map(a->a.codigoEtapa()).findFirst()
            .orElseGet(()->c.datos().manzanas().stream().filter(a->a.id().equals(l.idManzana())).map(a->a.codigoEtapa()).findFirst().orElse(null));
    }

    private Map<Long,PublicacionComercialRepository.Regla> reglasPorLote(Long proyecto,int version) {
        var mapa = new HashMap<Long,PublicacionComercialRepository.Regla>();
        for (var r: repository.reglas(proyecto,version)) mapa.put(r.id(),r);
        return mapa;
    }

    @Transactional
    public Respuesta guardarDisponibilidad(Long proyecto,Long actor,Disponibilidad request) {
        var anterior = bloquearGestion(proyecto,request.revision());
        var config = configuracion.obtener(proyecto);
        var seleccion = SeleccionEtapasPublicacion.validar(request.etapasHabilitadas(),config.datos().etapas());
        var nuevo = new Estado(List.copyOf(seleccion),anterior.estado().tarifas());
        var foto = repository.foto(proyecto,anterior.version());
        var protegidos = new HashSet<>(repository.protegidos(proyecto));
        var reglas = reglasPorLote(proyecto,anterior.version());
        var cambios = new ArrayList<ConfiguracionProyectoResponse.Lote>();
        for (var lote: config.lotes()) {
            var regla = reglas.get(lote.id());
            if (protegidos.contains(lote.id()) || regla!=null && "PROTEGIDA".equals(regla.situacion())) continue;
            String etapa = etapaDe(config,lote);
            if (etapa==null) {
                if (regla!=null && "HABILITADA".equals(regla.situacion()))
                    throw new ReglaNegocioException("El lote "+lote.codigo()+" está habilitado sin etapa comercial coherente.");
                continue;
            }
            boolean abrir = seleccion.contains(etapa);
            boolean estabaAbierta = anterior.estado().etapasHabilitadas().contains(etapa);
            if (!anterior.inferida() && abrir==estabaAbierta && regla!=null && Objects.equals(etapa,regla.etapa())
                && (abrir ? "HABILITADA".equals(regla.situacion()) : "BLOQUEADA".equals(regla.situacion()) && !"DISPONIBLE".equals(lote.estadoInventario()))) continue;
            if (regla==null || !Objects.equals(etapa,regla.etapa()))
                throw new ReglaNegocioException("El lote "+lote.codigo()+" no tiene una regla publicada coherente. Revisa su asignación.");
            if (abrir && !regla.precioValido())
                throw new ReglaNegocioException("El lote "+lote.codigo()+" no tiene un precio preparado vigente. Guarda su tarifa en la matriz antes de abrir la etapa "+etapa+".");
            cambios.add(lote);
        }
        if(cambios.isEmpty() && !anterior.inferida() && anterior.estado().etapasHabilitadas().equals(nuevo.etapasHabilitadas())) return anterior;
        for (var lote: cambios) {
            var regla = reglas.get(lote.id());
            boolean abrir = seleccion.contains(regla.etapa());
            if (abrir) {
                // No registrar ni recalcular precios al abrir.
                if (!"HABILITADA".equals(regla.situacion())) repository.cambiarSituacion(proyecto,anterior.version(),lote.id(),"HABILITADA");
                if ("NO_DISPONIBLE".equals(lote.estadoInventario())) repository.habilitarInventario(lote.id(),actor,anterior.version());
            } else {
                if (!"BLOQUEADA".equals(regla.situacion())) repository.cambiarSituacion(proyecto,anterior.version(),lote.id(),"BLOQUEADA");
                if ("DISPONIBLE".equals(lote.estadoInventario())) repository.bloquearInventario(lote.id(),actor,anterior.version());
            }
        }
        registrarEvento(proyecto,anterior.version(),actor,"DISPONIBILIDAD",anterior.estado(),foto,nuevo);
        return gestion(proyecto);
    }

    private static List<ConfiguracionProyectoRequest.Asignacion> asignar(List<ConfiguracionProyectoRequest.Asignacion> lista,Long id,String etapa) {
        var nueva=new ArrayList<>(lista.stream().filter(a->!a.id().equals(id)).toList());
        if(etapa!=null&&!etapa.isBlank())nueva.add(new ConfiguracionProyectoRequest.Asignacion(id,etapa));
        return List.copyOf(nueva);
    }

    @Transactional
    public Respuesta guardarAsignacion(Long proyecto,Long actor,CambioAsignacion request) {
        var anterior=bloquearGestion(proyecto,request.revision());
        var config=configuracion.obtener(proyecto);
        var d=config.datos();
        boolean manzana="manzanas".equals(request.tipo());
        if(!manzana&&!"lotes".equals(request.tipo()))throw new ReglaNegocioException("Tipo de asignación inválido.");
        if(manzana&&config.manzanas().stream().noneMatch(m->m.id().equals(request.id()))||
            !manzana&&config.lotes().stream().noneMatch(l->l.id().equals(request.id())))
            throw new ReglaNegocioException("El registro no está activo o pertenece a otro proyecto.");
        String codigo=request.codigoEtapa();
        if(!codigo.isBlank()&&d.etapas().stream().noneMatch(e->e.codigo().equals(codigo)))
            throw new ReglaNegocioException("La etapa comercial no existe en este proyecto.");
        if(manzana&&codigo.isBlank())throw new ReglaNegocioException("Selecciona una etapa para la manzana publicada.");
        var nuevasManzanas=manzana?asignar(d.manzanas(),request.id(),codigo):d.manzanas();
        var nuevosLotes=manzana?d.lotes():asignar(d.lotes(),request.id(),codigo);
        var protegidos=new HashSet<>(repository.protegidos(proyecto));
        var reglas=reglasPorLote(proyecto,anterior.version());
        var grupo=config.lotes().stream().filter(l->manzana?l.idManzana().equals(request.id()):l.id().equals(request.id())).toList();
        for(var l:grupo) {
            var regla=reglas.get(l.id());
            if(!protegidos.contains(l.id())&&(regla==null||!"PROTEGIDA".equals(regla.situacion())))continue;
            if(!manzana)throw new ReglaNegocioException("El lote "+l.codigo()+" tiene una operación protegida y no puede reasignarse.");
            // Una excepción individual conserva la etapa histórica del lote comprometido.
            String antigua=etapaDe(config,l);
            if(antigua==null)throw new ReglaNegocioException("El lote protegido "+l.codigo()+" no tiene etapa histórica verificable; no se puede mover su manzana.");
            nuevosLotes=asignar(nuevosLotes,l.id(),antigua);
        }
        var datos=new ConfiguracionProyectoRequest.Datos(d.etapas(),nuevasManzanas,nuevosLotes,anterior.estado().tarifas());
        var destino=configParaPrecios(new ConfiguracionProyectoResponse(config.version(),datos,config.manzanas(),config.lotes(),config.zonas(),config.monedas()));
        var ahora=ZonedDateTime.now(ZoneId.of("America/Lima"));
        var candidatos=ajustes.findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(proyecto);
        var filas=new ArrayList<Fila>();
        for(var l:grupo) {
            var regla=reglas.get(l.id());
            if(protegidos.contains(l.id())||regla!=null&&"PROTEGIDA".equals(regla.situacion()))continue;
            String vieja=etapaDe(config,l),nueva=etapaDe(destino,l);
            if(nueva==null)throw new ReglaNegocioException("El lote "+l.codigo()+" quedaría sin etapa comercial.");
            if(regla!=null&&!Objects.equals(vieja,regla.etapa()))throw new ReglaNegocioException("El lote "+l.codigo()+" no tiene una regla coherente con su asignación actual.");
            if(regla!=null&&Objects.equals(vieja,nueva))continue;
            var parcela=lotes.findById(l.id()).orElseThrow(()->new ConflictoNegocioException("El inventario cambió."));
            var r=simulacion.evaluar(destino,parcela,"PEN",ahora,candidatos);
            if(!"SIMULADO".equals(r.resultado())||!precioValido(r)||!nueva.equals(r.codigoEtapa()))
                throw new ReglaNegocioException("Lote "+l.codigo()+": "+r.mensaje()+". Revisa la tarifa de la etapa de destino.");
            var vigencia=datos.tarifas().stream().filter(t->t.codigoEtapa().equals(nueva)&&Objects.equals(t.codigoZona(),r.codigoZona())&&"PEN".equals(t.moneda())
                &&!t.vigenteDesde().isAfter(ahora.toLocalDate())&&(t.vigenteHasta()==null||!t.vigenteHasta().isBefore(ahora.toLocalDate()))).toList();
            if(vigencia.size()!=1)throw new ReglaNegocioException("Falta una tarifa vigente única para "+l.codigo()+".");
            boolean abrir=anterior.estado().etapasHabilitadas().contains(nueva);
            filas.add(new Fila(l.id(),l.codigo(),l.estadoInventario(),nueva,abrir?"HABILITADA":"BLOQUEADA","Reasignación comercial",
                repository.precioActual(l.id()),r.precioBase(),r.ajusteTipo(),r.descuento(),r.precioSimulado(),vigencia.getFirst().vigenteHasta(),
                abrir&&"NO_DISPONIBLE".equals(l.estadoInventario()),!abrir&&"DISPONIBLE".equals(l.estadoInventario())));
        }
        var foto=repository.foto(proyecto,anterior.version());
        for(var f:filas) {
            var precio=repository.registrarPrecio(f,anterior.version());
            var regla=reglas.get(f.idLote());
            if(regla==null)repository.registrarFila(proyecto,anterior.version(),f,precio);
            else repository.reasignarRegla(proyecto,anterior.version(),f,precio,regla.etapa());
            if(f.bloquearInventario())repository.bloquearInventario(f.idLote(),actor,anterior.version());
            if(f.habilitarInventario())repository.habilitarInventario(f.idLote(),actor,anterior.version());
        }
        registrarEvento(proyecto,anterior.version(),actor,"ASIGNACIONES",
            new Estado(anterior.estado().etapasHabilitadas(),anterior.estado().tarifas(),null,d.manzanas(),d.lotes()),foto,
            new Estado(anterior.estado().etapasHabilitadas(),anterior.estado().tarifas(),null,nuevasManzanas,nuevosLotes));
        return gestion(proyecto);
    }

    @Transactional
    public Respuesta guardarEtapas(Long proyecto,Long actor,CambioEtapas request) {
        var anterior=bloquearGestion(proyecto,request.revision());
        var config=configuracion.obtener(proyecto);
        var antiguas=config.datos().etapas();
        var nuevas=request.etapas().stream().map(e -> e.disponibilidad()==ConfiguracionProyectoRequest.Disponibilidad.BLOQUEADA
            || e.disponibilidad()==ConfiguracionProyectoRequest.Disponibilidad.ANTICIPADA
            ? new ConfiguracionProyectoRequest.Etapa(e.codigo(),e.nombre(),ConfiguracionProyectoRequest.Disponibilidad.REGULAR,
                ConfiguracionProyectoRequest.TipoDescuento.NINGUNO,BigDecimal.ZERO) : e).toList();
        var codigos=ConfiguracionProyectoValidator.validarEtapas(nuevas);
        if (antiguas.stream().anyMatch(e->!codigos.contains(e.codigo())))
            throw new ReglaNegocioException("No se puede retirar o cambiar el código de una etapa publicada.");
        var recalcular=new HashSet<String>();
        for (var e: antiguas) {
            var n=nuevas.stream().filter(x->x.codigo().equals(e.codigo())).findFirst().orElseThrow();
            if (e.tipoDescuento()!=n.tipoDescuento() || e.descuento().compareTo(n.descuento())!=0)
                recalcular.add(e.codigo());
        }
        var hoy=LocalDate.now(ZoneId.of("America/Lima"));
        var protegidos=new HashSet<>(repository.protegidos(proyecto));
        var reglas=reglasPorLote(proyecto,anterior.version());
        var tarifas=new ArrayList<Tarifa>();
        for(var l:config.lotes()) {
            String etapa=etapaDe(config,l);
            if(!recalcular.contains(etapa)||protegidos.contains(l.id())||reglas.containsKey(l.id())&&"PROTEGIDA".equals(reglas.get(l.id()).situacion()))continue;
            var zona=l.codigoZona();
            var ts=anterior.estado().tarifas().stream().filter(t->Objects.equals(t.codigoZona(),zona)&&t.codigoEtapa().equals(etapa)&&"PEN".equals(t.moneda())
                &&!t.vigenteDesde().isAfter(hoy)&&(t.vigenteHasta()==null||!t.vigenteHasta().isBefore(hoy))).toList();
            if(ts.size()!=1)throw new ReglaNegocioException("El lote "+l.codigo()+" requiere una tarifa vigente de su zona antes de modificar el descuento.");
            if(!tarifas.contains(ts.getFirst()))tarifas.add(ts.getFirst());
        }
        var estadoAnterior=new Estado(anterior.estado().etapasHabilitadas(),anterior.estado().tarifas(),antiguas);
        registrarEvento(proyecto,anterior.version(),actor,"ETAPAS",estadoAnterior,repository.foto(proyecto,anterior.version()),
            new Estado(anterior.estado().etapasHabilitadas(),anterior.estado().tarifas(),nuevas));
        // El cambio de descuento y los precios derivados se guardan en la misma transacción.
        var actual=gestion(proyecto);
        for(var t:tarifas)actual=guardarTarifa(proyecto,actor,new CambioTarifa(actual.revision(),t));
        return actual;
    }

    @Transactional
    public Respuesta guardarTarifa(Long proyecto,Long actor,CambioTarifa request) {
        var anterior = bloquearGestion(proyecto,request.revision());
        return guardarTarifas(proyecto,actor,anterior,List.of(request.tarifa()),false);
    }

    @Transactional
    public Respuesta guardarMatriz(Long proyecto,Long actor,CambioMatriz request) {
        var anterior=bloquearGestion(proyecto,request.revision());
        var config=configuracion.obtener(proyecto);
        var nuevas=MatrizRecargosComercial.generar(config,request);
        return guardarTarifas(proyecto,actor,anterior,nuevas,true);
    }

    private Respuesta guardarTarifas(Long proyecto,Long actor,Respuesta anterior,List<Tarifa> nuevas,boolean matriz) {
        var config=configuracion.obtener(proyecto);
        var ahora=ZonedDateTime.now(ZoneId.of("America/Lima"));
        var d=config.datos();
        var tarifas=new ArrayList<>(anterior.estado().tarifas());
        for(var tarifa:nuevas) {
        if (!"PEN".equals(tarifa.moneda())) throw new ReglaNegocioException("La gestión de precios de venta actualmente utiliza PEN.");
        if (tarifa.vigenteDesde().isAfter(ahora.toLocalDate()) || tarifa.vigenteHasta()!=null && tarifa.vigenteHasta().isBefore(ahora.toLocalDate()))
            throw new ReglaNegocioException("La tarifa debe estar vigente hoy. No se admite programar cambios futuros en esta operación.");
        tarifas.removeIf(t->ConfiguracionProyectoValidator.claveTarifa(t).equals(ConfiguracionProyectoValidator.claveTarifa(tarifa)));
        tarifas.add(tarifa);
        // Validar la combinación solicitada; las tarifas históricas de zonas retiradas
        // se conservan en auditoría y no impiden editar otra combinación válida.
        ConfiguracionProyectoValidator.validarTarifas(new ConfiguracionProyectoRequest.Datos(d.etapas(),d.manzanas(),d.lotes(),List.of(tarifa)),config.zonas(),config.monedas());
        }
        if(tarifas.size()>2000)throw new ReglaNegocioException("La matriz supera el máximo de tarifas.");
        var datos = new ConfiguracionProyectoRequest.Datos(d.etapas(),d.manzanas(),d.lotes(),List.copyOf(tarifas));
        var paraPrecios = configParaPrecios(new ConfiguracionProyectoResponse(config.version(),datos,config.manzanas(),config.lotes(),config.zonas(),config.monedas()));
        var foto = repository.foto(proyecto,anterior.version());
        var protegidos = new HashSet<>(repository.protegidos(proyecto));
        var reglas = reglasPorLote(proyecto,anterior.version());
        var candidatos = ajustes.findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(proyecto);
        if(matriz&&candidatos.stream().anyMatch(a->!a.getFechaDesde().isAfter(ahora.toOffsetDateTime())&&(a.getFechaHasta()==null||a.getFechaHasta().isAfter(ahora.toOffsetDateTime()))))throw new ReglaNegocioException("Existen ajustes de tipo de lote activos. Revisa esos ajustes antes de guardar una matriz de recargos para evitar duplicidades.");
        var etapasAfectadas=nuevas.stream().map(Tarifa::codigoEtapa).collect(java.util.stream.Collectors.toSet());
        var afectados = config.lotes().stream().filter(l->etapasAfectadas.contains(etapaDe(config,l))).toList();
        var etapasPorLote=new HashMap<Long,String>();
        for(var l:afectados)etapasPorLote.put(l.id(),etapaDe(config,l));
        var parcelas = lotes.findAllById(afectados.stream().map(ConfiguracionProyectoResponse.Lote::id).toList());
        if (parcelas.size()!=afectados.size()) throw new ConflictoNegocioException("El inventario cambió.");
        for (var lote: parcelas) {
            if (lote.getZona()==null) continue;
            var tarifa=nuevas.stream().filter(t->t.codigoZona().equals(lote.getZona().getCodigo())&&t.codigoEtapa().equals(etapasPorLote.get(lote.getIdLote()))).findFirst().orElse(null);
            if(tarifa==null)continue;
            var regla = reglas.get(lote.getIdLote());
            if (protegidos.contains(lote.getIdLote()) || regla!=null && "PROTEGIDA".equals(regla.situacion())) continue;
            if (regla==null || !tarifa.codigoEtapa().equals(regla.etapa()))
                throw new ReglaNegocioException("El lote "+lote.getCodigo()+" no tiene una regla publicada coherente.");
            var r = simulacion.evaluar(paraPrecios,lote,"PEN",ahora,candidatos);
            if (!"SIMULADO".equals(r.resultado()) || !precioValido(r))
                throw new ReglaNegocioException("Lote "+lote.getCodigo()+": "+r.mensaje());
            // Conservar la situación comercial y el inventario; únicamente cambiar el precio de este grupo.
            var fila = new Fila(lote.getIdLote(),lote.getCodigo(),r.estadoInventario(),r.codigoEtapa(),regla.situacion(),
                "Tarifa actualizada",repository.precioActual(lote.getIdLote()),r.precioBase(),r.ajusteTipo(),r.descuento(),
                r.precioSimulado(),tarifa.vigenteHasta(),false,false);
            Long precio = repository.registrarPrecio(fila,anterior.version());
            repository.actualizarPrecioRegla(proyecto,anterior.version(),fila,precio,regla.situacion());
        }
        registrarEvento(proyecto,anterior.version(),actor,"TARIFAS",anterior.estado(),foto,new Estado(anterior.estado().etapasHabilitadas(),List.copyOf(tarifas)));
        return gestion(proyecto);
    }

    private void registrarEvento(Long proyecto,int version,Long actor,String tipo,Estado anterior,String foto,Estado nuevo) {
        var antes = new LinkedHashMap<String,Object>();
        if (anterior!=null) antes.put("estado",anterior);
        if (foto!=null) antes.put("lotes",mapper.readTree(foto));
        var despues = Map.of("estado",nuevo,"lotes",mapper.readTree(repository.foto(proyecto,version)));
        repository.evento(proyecto,version,actor,tipo,mapper.writeValueAsString(antes),mapper.writeValueAsString(despues));
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
