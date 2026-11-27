package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.PlanoSvgProyectoRequest;
import monolithe.core_service.dto.PlanoSvgProyectoResponse;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.regex.Pattern;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class PlanoSvgProyectoService {
    private static final Set<String> TIPOS = Set.of("path","rect","circle","ellipse","polygon","polyline","line","text");
    private static final Set<String> ATRIBUTOS = Set.of("d","x","y","x1","y1","x2","y2","cx","cy","r","rx","ry",
        "width","height","points","fill","stroke","stroke-width","fill-opacity","stroke-opacity",
        "opacity","transform","font-size","text-anchor","stroke-linecap","stroke-linejoin");
    private static final Pattern NUMERICO = Pattern.compile("[-+0-9.eE]+");
    private static final Pattern LISTA_NUMEROS = Pattern.compile("[-+0-9.eE,\\s]+");
    private static final Pattern PATH = Pattern.compile("[-+0-9.eE,\\sMmLlHhVvCcSsQqTtAaZz]+");
    private static final Pattern COLOR = Pattern.compile("(?:#[0-9a-fA-F]{3,8}|none|transparent|black|white|green|blue|red|gray|grey|silver|navy|teal|olive|lime|yellow|orange|rgb\\(\\s*[0-9,\\s.]+\\))");
    private static final Pattern TRANSFORM = Pattern.compile("(?:(?:matrix|translate|scale|rotate|skewX|skewY)\\([-+0-9.eE,\\s]+\\)\\s*)+");
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    @Transactional(readOnly=true)
    public PlanoSvgProyectoResponse obtener(Long proyecto) {
        return jdbc.query("""
            SELECT documento::text,fecha_actualizacion FROM public.inm_planos_svg_proyecto WHERE id_proyecto=?
            """, (rs,row) -> {
                try {
                    return new PlanoSvgProyectoResponse(proyecto,
                        mapper.readValue(rs.getString(1),PlanoSvgProyectoRequest.class),
                        rs.getObject(2,OffsetDateTime.class));
                } catch (Exception ex) { throw new IllegalStateException("El SVG almacenado no es válido.",ex); }
            },proyecto).stream().findFirst().orElse(null);
    }

    public record CambioAsociacion(@jakarta.validation.constraints.PositiveOrZero int indice,
        @jakarta.validation.constraints.Size(max=80) String codigoLote) {}
    public record CambiosAsociaciones(@jakarta.validation.constraints.NotNull OffsetDateTime revision,
        @jakarta.validation.constraints.NotEmpty @jakarta.validation.constraints.Size(max=2000)
        List<@jakarta.validation.constraints.NotNull @jakarta.validation.Valid CambioAsociacion> cambios) {}
    public record ResultadoAsociaciones(OffsetDateTime fechaActualizacion) {}

    @Transactional
    public ResultadoAsociaciones guardarAsociaciones(Long proyecto, CambiosAsociaciones request) {
        long inicio=System.nanoTime();
        var actual=jdbc.query("""
            SELECT documento::text,fecha_actualizacion FROM public.inm_planos_svg_proyecto
            WHERE id_proyecto=? FOR UPDATE
            """,(rs,n)->new PlanoSvgProyectoResponse(proyecto,
                mapper.readValue(rs.getString(1),PlanoSvgProyectoRequest.class),
                rs.getObject(2,OffsetDateTime.class)),proyecto).stream().findFirst()
            .orElseThrow(()->new RecursoNoEncontradoException("No existe un SVG guardado."));
        if(!actual.fechaActualizacion().isEqual(request.revision()))
            throw new monolithe.core_service.exception.ConflictoNegocioException("El SVG cambió en otra sesión. Recarga el plano antes de guardar.");
        long lectura=System.nanoTime();
        var elementos=new ArrayList<>(actual.documento().elementos());
        var indices=new HashSet<Integer>();
        for(var cambio:request.cambios()){
            int i=cambio.indice();
            if(i<0||i>=elementos.size()||!indices.add(i))
                throw new ReglaNegocioException("Índice de figura inválido o repetido.");
            var e=elementos.get(i);
            elementos.set(i,new PlanoSvgProyectoRequest.Elemento(e.tipo(),e.atributos(),e.texto(),cambio.codigoLote()));
        }
        var documento=new PlanoSvgProyectoRequest(actual.documento().nombreArchivo(),actual.documento().viewBox(),elementos);
        validar(proyecto,documento);
        long validacion=System.nanoTime();
        var fecha=jdbc.queryForObject("""
            UPDATE public.inm_planos_svg_proyecto SET documento=CAST(? AS jsonb),fecha_actualizacion=clock_timestamp()
            WHERE id_proyecto=? RETURNING fecha_actualizacion
            """,(rs,n)->rs.getObject(1,OffsetDateTime.class),mapper.writeValueAsString(documento),proyecto);
        org.slf4j.LoggerFactory.getLogger(getClass()).info(
            "Guardar SVG asociaciones proyecto={} cambios={} lecturaMs={} validacionMs={} escrituraMs={} totalMs={}",
            proyecto,indices.size(),(lectura-inicio)/1_000_000,(validacion-lectura)/1_000_000,
            (System.nanoTime()-validacion)/1_000_000,(System.nanoTime()-inicio)/1_000_000);
        return new ResultadoAsociaciones(fecha);
    }

    @Transactional
    public PlanoSvgProyectoResponse guardar(Long proyecto, PlanoSvgProyectoRequest documento) {
        long inicio=System.nanoTime();
        validar(proyecto,documento);
        long validacion=System.nanoTime();
        try {
            var fecha=jdbc.queryForObject("""
                INSERT INTO public.inm_planos_svg_proyecto(id_proyecto,nombre_archivo,documento,fecha_actualizacion)
                VALUES(?,?,CAST(? AS jsonb),now())
                ON CONFLICT(id_proyecto) DO UPDATE SET nombre_archivo=excluded.nombre_archivo,
                  documento=excluded.documento,fecha_actualizacion=now()
                RETURNING fecha_actualizacion
                """, (rs,n)->rs.getObject(1,OffsetDateTime.class),proyecto, documento.nombreArchivo(), mapper.writeValueAsString(documento));
            org.slf4j.LoggerFactory.getLogger(getClass()).info("Guardar SVG completo proyecto={} validacionMs={} totalMs={}",
                proyecto,(validacion-inicio)/1_000_000,(System.nanoTime()-inicio)/1_000_000);
            return new PlanoSvgProyectoResponse(proyecto,documento,fecha);
        } catch (Exception ex) { throw new IllegalStateException("No se pudo guardar el plano SVG.",ex); }
    }

    void validar(Long proyecto, PlanoSvgProyectoRequest documento) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=? AND activo)",Boolean.class,proyecto)))
            throw new RecursoNoEncontradoException("Proyecto no encontrado o inactivo.");
        if (!documento.nombreArchivo().matches("(?i)[^/\\\\]{1,250}\\.svg"))
            throw new ReglaNegocioException("Solo se aceptan planos con extensión SVG.");
        var box=documento.viewBox();
        if(box.size()!=4 || box.stream().anyMatch(n->n==null || !Double.isFinite(n) || Math.abs(n)>1e7)
            || box.get(2)<=0 || box.get(3)<=0)
            throw new ReglaNegocioException("Dimensiones SVG inválidas.");
        var codigos = new HashSet<>(jdbc.queryForList(
            "SELECT codigo FROM public.inm_lotes WHERE id_proyecto=? AND activo",String.class,proyecto));
        var vinculados=new HashSet<String>();
        int total=0;
        for(var e:documento.elementos()) {
            if(!TIPOS.contains(e.tipo())) throw new ReglaNegocioException("Elemento SVG no admitido: "+e.tipo());
            if(e.texto()!=null && e.texto().length()>150) throw new ReglaNegocioException("Texto SVG excesivo.");
            if(e.codigoLote()!=null) {
                if(!codigos.contains(e.codigoLote()) || !vinculados.add(e.codigoLote()))
                    throw new ReglaNegocioException("Un lote del SVG no pertenece al proyecto o está repetido: "+e.codigoLote());
                validarSuperficie(e,box);
            }
            for(var entry:e.atributos().entrySet()) {
                String key=entry.getKey(),v=entry.getValue();
                total+=key.length()+v.length();
                if(!ATRIBUTOS.contains(key) || v.length()>16000 || !atributoSeguro(key,v))
                    throw new ReglaNegocioException("Atributo SVG inválido: "+key);
            }
            if(total>2500000) throw new ReglaNegocioException("El SVG excede el tamaño permitido.");
        }
    }

    private void validarSuperficie(PlanoSvgProyectoRequest.Elemento e,List<Double> box){
        var a=e.atributos();
        if(!Set.of("rect","polygon","path").contains(e.tipo())
            || "none".equalsIgnoreCase(a.get("fill")) || "transparent".equalsIgnoreCase(a.get("fill"))
            || ("path".equals(e.tipo()) && !a.getOrDefault("d","").strip().matches("(?s).*[zZ]$")))
            throw new ReglaNegocioException("Solo se pueden asociar superficies de lotes.");
        double[] b=null;
        try{
            if("rect".equals(e.tipo())){
                double x=Double.parseDouble(a.getOrDefault("x","0")),y=Double.parseDouble(a.getOrDefault("y","0"));
                b=new double[]{x,y,x+Double.parseDouble(a.get("width")),y+Double.parseDouble(a.get("height"))};
            }else if("polygon".equals(e.tipo())){
                var p=a.getOrDefault("points","").trim().split("[\\s,]+");
                if(p.length>=6&&p.length%2==0){
                    b=new double[]{Double.POSITIVE_INFINITY,Double.POSITIVE_INFINITY,Double.NEGATIVE_INFINITY,Double.NEGATIVE_INFINITY};
                    for(int i=0;i<p.length;i+=2){double x=Double.parseDouble(p[i]),y=Double.parseDouble(p[i+1]);
                        b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}
                }
            }
        }catch(IllegalArgumentException|NullPointerException ex){throw new ReglaNegocioException("Dimensiones de figura inválidas.");}
        if(b!=null && b[0]<=box.get(0)+box.get(2)*.02 && b[1]<=box.get(1)+box.get(3)*.02
            && b[2]>=box.get(0)+box.get(2)*.98 && b[3]>=box.get(1)+box.get(3)*.98)
            throw new ReglaNegocioException("No se puede asociar el fondo general del plano.");
    }

    private boolean atributoSeguro(String key,String v) {
        if (v.isBlank()) return false;
        if ("fill".equals(key) || "stroke".equals(key)) return COLOR.matcher(v).matches();
        if ("transform".equals(key)) return TRANSFORM.matcher(v).matches();
        if ("d".equals(key)) return PATH.matcher(v).matches();
        if ("points".equals(key)) return LISTA_NUMEROS.matcher(v).matches();
        if ("text-anchor".equals(key)) return Set.of("start","middle","end").contains(v);
        if ("stroke-linecap".equals(key)) return Set.of("butt","round","square").contains(v);
        if ("stroke-linejoin".equals(key)) return Set.of("round","miter","bevel").contains(v);
        if (!NUMERICO.matcher(v).matches()) return false;
        try { return Double.isFinite(Double.parseDouble(v)); }
        catch(NumberFormatException ex){ return false; }
    }
}
