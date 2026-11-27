package monolithe.core_service.service;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ManzanaComercialDto.*;
import monolithe.core_service.dto.ConfiguracionProyectoRequest;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.Asignacion;
import monolithe.core_service.dto.GestionComercialDto.CambioAsignacion;
import monolithe.core_service.exception.*;
import monolithe.core_service.repository.ConfiguracionProyectoRepository;
import monolithe.core_service.repository.PublicacionComercialRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ManzanaComercialService {
    private final JdbcTemplate jdbc;
    private final ConfiguracionProyectoService configuracion;
    private final ConfiguracionProyectoRepository configuraciones;
    private final PublicacionComercialService comercial;
    private final PublicacionComercialRepository publicaciones;
    private record Base(Long id,String codigo,String nombre,int orden,boolean activa,String inactiva){}
    private record Conteo(Long id,int lotes,int vendidos){}
    private record Vinculo(Long manzana,Zona zona){}
    private List<Base> bases(Long proyecto){
        return jdbc.query("""
            SELECT id_manzana,codigo,nombre,numero_orden,activo,codigo_etapa_comercial_inactiva
            FROM public.inm_manzanas WHERE id_proyecto=? ORDER BY numero_orden,id_manzana
            """,(r,n)->new Base(r.getLong(1),r.getString(2),r.getString(3),r.getInt(4),r.getBoolean(5),r.getString(6)),proyecto);
    }
    static String estado(boolean activa,int lotes,int vendidos,boolean abierta){
        if(lotes>0&&lotes==vendidos)return "VENDIDA";
        if(!activa)return "INACTIVA";
        return abierta?"ACTIVA":"BLOQUEADA_COMERCIALMENTE";
    }
    // Secuencia alfabética estilo A...Z, AA...AZ. Respeta el prefijo de la primera manzana reconocible.
    static String siguienteCodigo(List<String> codigos){
        var patron=Pattern.compile("^(.+[-_])([A-Z]{1,5})$");
        String prefijo="MZ-";int max=0;boolean detectado=false;
        for(String c:codigos){var m=patron.matcher(c);if(m.matches()&&!detectado){prefijo=m.group(1);detectado=true;}}
        for(String c:codigos){
            var m=patron.matcher(c);if(!m.matches()||!m.group(1).equals(prefijo))continue;
            int n=0;for(char ch:m.group(2).toCharArray())n=n*26+ch-'A'+1;max=Math.max(max,n);
        }
        String candidato;do{int n=++max;StringBuilder sufijo=new StringBuilder();
            while(n>0){n--;sufijo.append((char)('A'+n%26));n/=26;}
            candidato=prefijo+sufijo.reverse();
        }while(codigos.contains(candidato));
        return candidato;
    }
    static String nombreSugerido(String codigo){return "Manzana "+codigo.replaceFirst("^.*[-_]","");}
    @Transactional(readOnly=true)
    public Listado listar(Long proyecto){
        return listar(proyecto,configuracion.obtenerLecturaMapa(proyecto));
    }

    Listado listar(Long proyecto,ConfiguracionProyectoService.LecturaMapa config){
        long inicio=System.nanoTime();
        boolean publicado=config.publicado();
        var abiertas=config.abiertas();
        var etapas=config.datos().etapas().stream().map(e->new Etapa(e.codigo(),e.nombre(),abiertas.contains(e.codigo()))).toList();
        var catalogo=jdbc.query("SELECT id_zona,codigo,nombre,activo FROM public.inm_zonas WHERE id_proyecto=? ORDER BY numero_orden,codigo",
            (r,n)->new Zona(r.getLong(1),r.getString(2),r.getString(3),r.getBoolean(4)),proyecto);
        var conteos=jdbc.query("""
            SELECT l.id_manzana,count(*)::int,count(*) FILTER(WHERE s.codigo='VENDIDO')::int
            FROM public.inm_lotes l JOIN public.cfg_estados_lote s USING(id_estado_lote)
            WHERE l.id_proyecto=? AND l.activo GROUP BY l.id_manzana
            """,(r,n)->new Conteo(r.getLong(1),r.getInt(2),r.getInt(3)),proyecto);
        var vinculadas=jdbc.query("""
            SELECT DISTINCT v.id_manzana,z.id_zona,z.codigo,z.nombre,z.activo
            FROM (SELECT id_manzana,id_zona FROM public.inm_manzanas_zonas WHERE id_proyecto=?
                  UNION SELECT id_manzana,id_zona FROM public.inm_lotes WHERE id_proyecto=? AND activo AND id_zona IS NOT NULL) v
            JOIN public.inm_zonas z ON z.id_zona=v.id_zona
            ORDER BY z.codigo
            """,(r,n)->new Vinculo(r.getLong(1),new Zona(r.getLong(2),r.getString(3),r.getString(4),r.getBoolean(5))),proyecto,proyecto);
        var bases=bases(proyecto);
        var filas=bases.stream().map(m->{
            String codigo=!m.activa()&&m.inactiva()!=null?m.inactiva():config.datos().manzanas().stream().filter(x->x.id().equals(m.id())).map(Asignacion::codigoEtapa).findFirst().orElse(null);
            var etapa=etapas.stream().filter(x->x.codigo().equals(codigo)).findFirst().orElse(null);
            var c=conteos.stream().filter(x->x.id().equals(m.id())).findFirst().orElse(new Conteo(m.id(),0,0));
            return new Fila(m.id(),m.codigo(),m.nombre(),m.orden(),codigo,etapa==null?null:etapa.nombre(),
                estado(m.activa(),c.lotes(),c.vendidos(),etapa!=null&&etapa.habilitada()),m.activa(),c.lotes(),c.vendidos(),
                vinculadas.stream().filter(x->x.manzana().equals(m.id())).map(Vinculo::zona).toList());
        }).toList();
        String sugerido=siguienteCodigo(bases.stream().map(Base::codigo).toList());
        org.slf4j.LoggerFactory.getLogger(getClass()).info("Detalle manzanas proyecto={} filas={} totalMs={}",proyecto,filas.size(),(System.nanoTime()-inicio)/1_000_000);
        return new Listado(publicado?config.revision():config.version(),publicado,etapas,catalogo,filas,sugerido,nombreSugerido(sugerido));
    }
    @Transactional
    public Listado guardar(Long proyecto,Long actor,Cambio req){
        publicaciones.bloquearProyecto(proyecto);
        if(!publicaciones.proyectoHabilitado(proyecto))throw new ReglaNegocioException("El proyecto no está activo.");
        var anterior=listar(proyecto);
        if(anterior.revision()!=req.revision())throw new ConflictoNegocioException("La configuración cambió. Recarga antes de guardar.");
        if(anterior.etapas().stream().noneMatch(e->e.codigo().equals(req.codigoEtapa())))throw new ReglaNegocioException("Selecciona una etapa comercial del proyecto.");
        var previo=req.id()==null?null:anterior.manzanas().stream().filter(m->m.id().equals(req.id())).findFirst().orElseThrow(()->new RecursoNoEncontradoException("Manzana no encontrada en este proyecto."));
        if(anterior.manzanas().stream().anyMatch(m->!m.id().equals(req.id())&&m.codigo().equalsIgnoreCase(req.codigo())))throw new ConflictoNegocioException("Ya existe una manzana con ese código en el proyecto.");
        if(previo!=null&&previo.lotes()>0&&!req.activa())throw new ReglaNegocioException("No se puede desactivar una manzana con lotes activos.");
        if(previo!=null&&previo.lotes()>0&&!previo.codigo().equals(req.codigo()))throw new ReglaNegocioException("No se puede cambiar el código de una manzana con lotes asociados.");
        var zonas=new TreeSet<>(req.zonas());
        if(zonas.size()!=req.zonas().size())throw new ReglaNegocioException("Hay zonas duplicadas.");
        if(zonas.isEmpty())throw new ReglaNegocioException("Selecciona al menos una zona.");
        for(Long z:zonas)if(anterior.zonas().stream().noneMatch(x->x.id().equals(z)&&x.activa()))
            throw new ReglaNegocioException("La zona seleccionada no está activa o no pertenece al proyecto.");
        if(previo!=null){
            var usadas=jdbc.queryForList("SELECT DISTINCT id_zona FROM public.inm_lotes WHERE id_proyecto=? AND id_manzana=? AND activo AND id_zona IS NOT NULL",Long.class,proyecto,previo.id());
            if(!zonas.containsAll(usadas))throw new ReglaNegocioException("No se puede retirar una zona utilizada por los lotes de la manzana.");
        }
        Long id=req.id();
        if(id==null){
            // La FK física es un detalle de compatibilidad. No define condiciones comerciales.
            Long fisica=jdbc.query("SELECT id_etapa FROM public.inm_etapas WHERE id_proyecto=? AND activo ORDER BY numero_orden,id_etapa LIMIT 1",(r,n)->r.getLong(1),proyecto).stream().findFirst().orElse(null);
            if(fisica==null){
                fisica=jdbc.queryForObject("""
                    INSERT INTO public.inm_etapas(id_proyecto,id_estado_etapa,codigo,nombre,numero_orden,activo)
                    SELECT ?,id_estado_etapa,'SOPORTE-ESTRUCTURA','Soporte interno de estructura',1,true
                    FROM public.cfg_estados_etapa WHERE codigo='ACTIVA' AND activo RETURNING id_etapa
                    """,Long.class,proyecto);
            }
            int orden=anterior.manzanas().stream().mapToInt(Fila::orden).max().orElse(0)+1;
            id=jdbc.queryForObject("""
                INSERT INTO public.inm_manzanas(id_proyecto,id_etapa,id_estado_manzana,codigo,nombre,numero_orden,activo)
                SELECT ?,?,id_estado_manzana,?,?,?,true FROM public.cfg_estados_manzana WHERE codigo='ACTIVA' AND activo RETURNING id_manzana
                """,Long.class,proyecto,fisica,req.codigo(),req.nombre().trim(),orden);
        }else{
            jdbc.update("UPDATE public.inm_manzanas SET codigo=?,nombre=?,activo=true,fecha_actualizacion=now() WHERE id_proyecto=? AND id_manzana=?",req.codigo(),req.nombre().trim(),proyecto,id);
        }
        jdbc.update("DELETE FROM public.inm_manzanas_zonas WHERE id_proyecto=? AND id_manzana=?",proyecto,id);
        for(Long z:zonas)jdbc.update("INSERT INTO public.inm_manzanas_zonas(id_proyecto,id_manzana,id_zona) VALUES(?,?,?)",proyecto,id,z);
        if(anterior.publicado()){
            if(previo==null||!Objects.equals(previo.codigoEtapa(),req.codigoEtapa())||!previo.activa()&&req.activa())
                comercial.guardarAsignacion(proyecto,actor,new CambioAsignacion(anterior.revision(),"manzanas",id,req.codigoEtapa()));
        }else{
            var c=configuracion.obtener(proyecto);var d=c.datos();final Long idFinal=id;
            var asignaciones=new ArrayList<>(d.manzanas().stream().filter(x->!x.id().equals(idFinal)).toList());
            if(req.activa())asignaciones.add(new Asignacion(id,req.codigoEtapa()));
            configuracion.guardar(proyecto,actor,new ConfiguracionProyectoRequest(c.version(),new ConfiguracionProyectoRequest.Datos(d.etapas(),asignaciones,d.lotes(),d.tarifas())));
        }
        jdbc.update("""
            UPDATE public.inm_manzanas SET activo=?,codigo_etapa_comercial_inactiva=?,fecha_actualizacion=now(),id_estado_manzana=
                (SELECT id_estado_manzana FROM public.cfg_estados_manzana WHERE codigo=? AND activo)
            WHERE id_proyecto=? AND id_manzana=?
            """,req.activa(),req.activa()?null:req.codigoEtapa(),req.activa()?"ACTIVA":"INACTIVA",proyecto,id);
        return listar(proyecto);
    }
}
