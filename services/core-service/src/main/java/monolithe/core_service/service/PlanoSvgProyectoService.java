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

    @Transactional
    public PlanoSvgProyectoResponse guardar(Long proyecto, PlanoSvgProyectoRequest documento) {
        validar(proyecto,documento);
        try {
            jdbc.update("""
                INSERT INTO public.inm_planos_svg_proyecto(id_proyecto,nombre_archivo,documento,fecha_actualizacion)
                VALUES(?,?,CAST(? AS jsonb),now())
                ON CONFLICT(id_proyecto) DO UPDATE SET nombre_archivo=excluded.nombre_archivo,
                  documento=excluded.documento,fecha_actualizacion=now()
                """, proyecto, documento.nombreArchivo(), mapper.writeValueAsString(documento));
        } catch (Exception ex) { throw new IllegalStateException("No se pudo guardar el plano SVG.",ex); }
        return obtener(proyecto);
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
