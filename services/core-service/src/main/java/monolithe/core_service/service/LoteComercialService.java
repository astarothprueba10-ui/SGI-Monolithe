package monolithe.core_service.service;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.*;
import monolithe.core_service.dto.LoteComercialDto.*;
import monolithe.core_service.dto.GestionComercialDto.CambioAsignacion;
import monolithe.core_service.entity.Lote;
import monolithe.core_service.exception.*;
import monolithe.core_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import java.math.*;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LoteComercialService {
 private final LoteService lotes;
 private final LoteRepository repo;
 private final ManzanaRepository manzanas;
 private final ZonaRepository zonas;
 private final EstadoLoteRepository estados;
 private final ConfiguracionProyectoService config;
 private final ManzanaComercialService bloques;
 private final PublicacionComercialService comercial;
 private final PublicacionComercialRepository publicaciones;
 private final SimulacionComercialService simulacion;
 private final AjusteTipoLoteRepository ajustes;
 private final JdbcTemplate jdbc;
 private final jakarta.persistence.EntityManager entityManager;
 static String estado(String inventario,boolean publicado,boolean abierta,boolean comercializable){
   if("VENDIDO".equals(inventario)||"RESERVADO".equals(inventario)||"BLOQUEADO".equals(inventario))return inventario;
   if(publicado&&!abierta)return "BLOQUEADO_COMERCIALMENTE";
   return publicado&&comercializable&&"DISPONIBLE".equals(inventario)?"DISPONIBLE":"NO_DISPONIBLE";
 }
 static String siguienteNumero(List<String> numeros){
   BigInteger max=BigInteger.ZERO;int ancho=2;
   for(String n:numeros)if(n!=null&&n.matches("[0-9]{1,20}")){
     var valor=new BigInteger(n);if(valor.compareTo(max)>0)max=valor;ancho=Math.max(ancho,n.length());
   }
   String n=max.add(BigInteger.ONE).toString();
   return "0".repeat(Math.max(0,ancho-n.length()))+n;
 }
 private String etapa(ConfiguracionProyectoRequest.Datos d,LoteResponse l){
   return d.lotes().stream().filter(a->a.id().equals(l.idLote())).map(ConfiguracionProyectoRequest.Asignacion::codigoEtapa).findFirst()
    .orElseGet(()->d.manzanas().stream().filter(a->a.id().equals(l.idManzana())).map(ConfiguracionProyectoRequest.Asignacion::codigoEtapa).findFirst().orElse(null));
 }
 @Transactional(readOnly=true)
 public Listado listar(Long proyecto){
   var catalogo=bloques.listar(proyecto);var c=config.obtener(proyecto);
   var reglas=new HashMap<Long,PublicacionComercialRepository.Regla>();
   if(catalogo.publicado())for(var r:publicaciones.reglas(proyecto,c.version()))reglas.put(r.id(),r);
   var protegidos=new HashSet<>(publicaciones.protegidos(proyecto));
   var disponibles=new HashSet<>(lotes.listarComercializables(proyecto));
   var precios=new HashMap<Long,BigDecimal>();
   jdbc.query("""
     SELECT DISTINCT ON(p.id_lote) p.id_lote,p.precio FROM public.inm_lotes_precios p
     JOIN public.inm_lotes l USING(id_lote) JOIN public.cfg_monedas m USING(id_moneda)
     WHERE l.id_proyecto=? AND p.activo AND m.activo AND m.codigo='PEN' AND p.fecha_desde<=now()
       AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now())
     ORDER BY p.id_lote,p.fecha_desde DESC,p.id_lote_precio DESC
     """,(org.springframework.jdbc.core.RowCallbackHandler)r->precios.put(r.getLong(1),r.getBigDecimal(2)),proyecto);
   var filas=lotes.buscar(new LoteFiltroRequest(proyecto,null,null,null,null,null,null,null,null,true)).stream().map(l->{
      var regla=reglas.get(l.idLote());String codigo=regla!=null&&regla.etapa()!=null?regla.etapa():etapa(c.datos(),l);
      var e=catalogo.etapas().stream().filter(x->x.codigo().equals(codigo)).findFirst().orElse(null);
      boolean protegido=protegidos.contains(l.idLote())||regla!=null&&"PROTEGIDA".equals(regla.situacion());
      return new Fila(l,codigo,e==null?null:e.nombre(),estado(l.codigoEstadoLote(),catalogo.publicado()&&e!=null,e!=null&&e.habilitada(),!protegido&&disponibles.contains(l.idLote())),precios.get(l.idLote()),protegido);
   }).toList();
   var sugerencias=new HashMap<Long,Identidad>();
   for(var m:catalogo.manzanas())if(m.activa())sugerencias.put(m.id(),identidad(m));
   return new Listado(catalogo,filas,sugerencias);
 }
 private Identidad identidad(ManzanaComercialDto.Fila m){
   var numeros=new ArrayList<>(repo.findByManzana_IdManzanaOrderByNumeroAsc(m.id()).stream().map(Lote::getNumero).toList());
   String numero,codigo;
   do{numero=siguienteNumero(numeros);codigo=m.codigo()+"-L"+numero;numeros.add(numero);
     if(codigo.length()>40||numero.length()>20)throw new ReglaNegocioException("Se agotó la numeración de la manzana.");
   }while(repo.existsByCodigo(codigo));
   return new Identidad(codigo,numero);
 }
 private record Contexto(ManzanaComercialDto.Listado catalogo,ConfiguracionProyectoResponse config,
    ManzanaComercialDto.Fila manzana,ManzanaComercialDto.Zona zona,ManzanaComercialDto.Etapa etapa,LoteResponse anterior,boolean protegido){}
 private Contexto contexto(Long proyecto,Consulta q){
   var cat=bloques.listar(proyecto);var c=config.obtener(proyecto);
   var ant=q.idLote()==null?null:lotes.obtenerPorId(q.idLote());
   if(ant!=null&&(!proyecto.equals(ant.idProyecto())||!Boolean.TRUE.equals(ant.activo())))throw new ReglaNegocioException("El lote no está activo en este proyecto.");
   var m=cat.manzanas().stream().filter(x->x.id().equals(q.idManzana())&&x.activa()).findFirst().orElseThrow(()->new ReglaNegocioException("Selecciona una manzana activa del proyecto."));
   var e=cat.etapas().stream().filter(x->x.codigo().equals(q.codigoEtapa())).findFirst().orElseThrow(()->new ReglaNegocioException("Selecciona una etapa comercial válida."));
   if(ant==null&&!Objects.equals(m.codigoEtapa(),e.codigo()))throw new ReglaNegocioException("La manzana no pertenece a la etapa comercial seleccionada.");
   if(ant!=null&&!Objects.equals(ant.idManzana(),m.id()))throw new ReglaNegocioException("No se puede cambiar la manzana de un lote existente: protege su identidad en el plano.");
   var z=m.zonas().stream().filter(x->x.id().equals(q.idZona())&&x.activa()).findFirst().orElseThrow(()->new ReglaNegocioException("Selecciona una zona activa asociada a la manzana."));
   boolean protegido=ant!=null&&(publicaciones.protegidos(proyecto).contains(ant.idLote())||cat.publicado()&&publicaciones.reglas(proyecto,c.version()).stream().anyMatch(r->r.id().equals(ant.idLote())&&"PROTEGIDA".equals(r.situacion())));
   if(protegido)throw new ReglaNegocioException("El lote tiene una operación protegida y no se puede modificar desde este formulario.");
   return new Contexto(cat,c,m,z,e,ant,protegido);
 }
 @Transactional(readOnly=true)
 public Vista revisar(Long proyecto,Consulta q){return revisar(proyecto,q,contexto(proyecto,q));}
 private Vista revisar(Long proyecto,Consulta q,Contexto x){
   String numero,codigo;
   if(x.anterior()!=null){numero=x.anterior().numero();codigo=x.anterior().codigo();}
   else {var id=identidad(x.manzana());numero=id.numero();codigo=id.codigo();}
   var d=x.config().datos();
   var etapas=d.etapas().stream().map(e->e.disponibilidad()==ConfiguracionProyectoRequest.Disponibilidad.BLOQUEADA?
     new ConfiguracionProyectoRequest.Etapa(e.codigo(),e.nombre(),ConfiguracionProyectoRequest.Disponibilidad.REGULAR,ConfiguracionProyectoRequest.TipoDescuento.NINGUNO,BigDecimal.ZERO):e).toList();
   var datos=new ConfiguracionProyectoRequest.Datos(etapas,List.of(new ConfiguracionProyectoRequest.Asignacion(q.idManzana(),q.codigoEtapa())),List.of(),d.tarifas());
   var ahora=ZonedDateTime.now(ZoneId.of("America/Lima"));
   var temporal=new Lote();temporal.setIdLote(q.idLote()==null?0L:q.idLote());temporal.setCodigo(codigo);
   temporal.setManzana(manzanas.findById(q.idManzana()).orElseThrow());temporal.setZona(zonas.findById(q.idZona()).orElseThrow());
   temporal.setAreaM2(q.areaM2());temporal.setEstadoLote(estados.findByCodigo("NO_DISPONIBLE").orElseThrow());
   if(q.idLote()!=null)temporal.setTipoLote(repo.findById(q.idLote()).orElseThrow().getTipoLote());
   var r=simulacion.evaluar(new ConfiguracionProyectoResponse(x.config().version(),datos,x.config().manzanas(),x.config().lotes(),x.config().zonas(),x.config().monedas()),
     temporal,"PEN",ahora,ajustes.findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(proyecto));
   var regular=d.tarifas().stream().filter(t->"D".equals(t.codigoZona())&&q.codigoEtapa().equals(t.codigoEtapa())&&"PEN".equals(t.moneda())
      &&!t.vigenteDesde().isAfter(ahora.toLocalDate())&&(t.vigenteHasta()==null||!t.vigenteHasta().isBefore(ahora.toLocalDate()))).toList();
   BigDecimal base=regular.size()==1?(regular.getFirst().tipoTarifa()==ConfiguracionProyectoRequest.TipoTarifa.POR_M2?regular.getFirst().valor().multiply(q.areaM2()):regular.getFirst().valor()).setScale(2,RoundingMode.HALF_UP):null;
   boolean ok="SIMULADO".equals(r.resultado())&&r.precioSimulado()!=null&&r.precioSimulado().signum()>0;
   String estado=x.catalogo().publicado()?(x.etapa().habilitada()?(ok?"DISPONIBLE":"NO_DISPONIBLE"):"BLOQUEADO_COMERCIALMENTE"):"NO_DISPONIBLE";
   if(x.anterior()!=null&&"BLOQUEADO".equals(x.anterior().codigoEstadoLote()))estado="BLOQUEADO";
   return new Vista(x.catalogo().revision(),codigo,numero,estado,base,ok&&base!=null?r.precioBase().subtract(base):null,
     r.ajusteTipo(),r.descuento(),r.precioSimulado(),ok?"Precio calculado según etapa y zona.":r.mensaje(),ok);
 }
 @Transactional
 public Listado guardar(Long proyecto,Long actor,Cambio req){
   publicaciones.bloquearProyecto(proyecto);
   if(!publicaciones.proyectoHabilitado(proyecto))throw new ReglaNegocioException("El proyecto no está activo.");
   var q=req.ubicacion();var x=contexto(proyecto,q);var vista=revisar(proyecto,q,x);
   if(req.revision()!=vista.revision()||!Objects.equals(req.codigoRevisado(),vista.codigo())||!Objects.equals(req.numeroRevisado(),vista.numero())
     ||!mismoPrecio(req.precioRevisado(),vista.precioFinal()))throw new ConflictoNegocioException("La numeración o tarifa cambió. Revisa nuevamente antes de guardar.");
   boolean nuevo=x.anterior()==null;
   boolean cambiaComercial=nuevo||!Objects.equals(x.anterior().idZona(),q.idZona())||x.anterior().areaM2().compareTo(q.areaM2())!=0||!Objects.equals(etapa(x.config().datos(),x.anterior()),q.codigoEtapa());
   if(x.catalogo().publicado()&&cambiaComercial&&!vista.calculado())throw new ReglaNegocioException(vista.mensaje());
   var solicitud=new LoteRequest(q.idManzana(),q.idZona(),nuevo?null:x.anterior().codigoTipoLote(),
     nuevo?"NO_DISPONIBLE":x.anterior().codigoEstadoLote(),vista.codigo(),vista.numero(),q.areaM2(),
     req.frenteM(),req.fondoM(),req.lateralDerechoM(),req.lateralIzquierdoM(),req.observaciones(),true);
   LoteResponse guardado=nuevo?lotes.crear(solicitud):lotes.actualizarComercial(q.idLote(),solicitud,x.catalogo().publicado()&&cambiaComercial);
   repo.flush();
   if(x.catalogo().publicado()&&cambiaComercial)
     comercial.guardarAsignacion(proyecto,actor,new CambioAsignacion(vista.revision(),"lotes",guardado.idLote(),q.codigoEtapa()),true);
   else if(!x.catalogo().publicado()&&!nuevo&&cambiaComercial&&!Objects.equals(etapa(x.config().datos(),x.anterior()),q.codigoEtapa())){
     var d=x.config().datos();var asign=new ArrayList<>(d.lotes().stream().filter(a->!a.id().equals(q.idLote())).toList());
     asign.add(new ConfiguracionProyectoRequest.Asignacion(q.idLote(),q.codigoEtapa()));
     config.guardar(proyecto,actor,new ConfiguracionProyectoRequest(x.config().version(),new ConfiguracionProyectoRequest.Datos(d.etapas(),d.manzanas(),asign,d.tarifas())));
   }
   // El cambio de inventario por JDBC debe reflejarse en la lectura JPA de la misma transacción.
   entityManager.clear();
   return listar(proyecto);
 }
 private static boolean mismoPrecio(BigDecimal a,BigDecimal b){return a==null?b==null:b!=null&&a.compareTo(b)==0;}
}
