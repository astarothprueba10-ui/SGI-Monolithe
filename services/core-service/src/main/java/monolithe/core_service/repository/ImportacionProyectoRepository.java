package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ImportacionProyectoRepository {
    private final JdbcTemplate jdbc;
    public record Referencia(Long id, String codigo, boolean activo) {}
    public record LoteExistente(Long id, Long proyecto, Long manzana, String numero, boolean activo) {}

    public List<Referencia> etapas(Long proyecto) {
        return jdbc.query("SELECT id_etapa, codigo, activo FROM public.inm_etapas WHERE id_proyecto = ?",
                (r,n) -> new Referencia(r.getLong(1), r.getString(2), r.getBoolean(3)), proyecto);
    }
    public List<Referencia> zonas(Long proyecto) {
        return jdbc.query("SELECT id_zona, codigo, activo FROM public.inm_zonas WHERE id_proyecto = ?",
                (r,n) -> new Referencia(r.getLong(1), r.getString(2), r.getBoolean(3)), proyecto);
    }
    public List<Referencia> manzanas(Long proyecto) {
        return jdbc.query("""
            SELECT m.id_manzana, e.codigo || chr(31) || m.codigo, m.activo AND e.activo
            FROM public.inm_manzanas m JOIN public.inm_etapas e ON e.id_etapa=m.id_etapa
            WHERE m.id_proyecto = ?
            """, (r,n) -> new Referencia(r.getLong(1), r.getString(2), r.getBoolean(3)), proyecto);
    }
    public List<Referencia> lotes(Long proyecto) {
        return jdbc.query("""
            SELECT l.id_lote,l.codigo,l.activo AND m.activo AND e.activo FROM public.inm_lotes l
            JOIN public.inm_manzanas m ON m.id_manzana=l.id_manzana
            JOIN public.inm_etapas e ON e.id_etapa=m.id_etapa
            WHERE l.id_proyecto=?
            """, (r,n) -> new Referencia(r.getLong(1),r.getString(2),r.getBoolean(3)), proyecto);
    }
    public java.util.Map<String,LoteExistente> lotesPorCodigos(List<String> codigos) {
        if(codigos.isEmpty()) return java.util.Map.of();
        var named=new org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate(jdbc);
        var resultado=new java.util.HashMap<String,LoteExistente>();
        named.query("""
            SELECT codigo,id_lote,id_proyecto,id_manzana,numero,activo
            FROM public.inm_lotes WHERE codigo IN (:codigos)
            """,java.util.Map.of("codigos",codigos),(org.springframework.jdbc.core.RowCallbackHandler)r ->
                resultado.put(r.getString(1),new LoteExistente(r.getLong(2),r.getLong(3),r.getLong(4),r.getString(5),r.getBoolean(6))));
        return resultado;
    }
    public List<LoteExistente> lote(String codigo) {
        return jdbc.query("""
            SELECT id_lote,id_proyecto,id_manzana,numero,activo FROM public.inm_lotes WHERE codigo=?
            """, (r,n) -> new LoteExistente(r.getLong(1),r.getLong(2),r.getLong(3),r.getString(4),r.getBoolean(5)), codigo);
    }
    public boolean numeroExiste(Long manzana, String numero) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS (SELECT 1 FROM public.inm_lotes WHERE id_manzana=? AND numero=?)
            """, Boolean.class, manzana, numero));
    }
    // La restricción ux_los_cocos_numero_unico_activo exige números únicos en todo PROY-001 (id 2).
    public List<String> estadosEtapa() {
        return jdbc.queryForList("SELECT codigo FROM public.cfg_estados_etapa WHERE activo", String.class);
    }
    public List<String> estadosManzana() {
        return jdbc.queryForList("SELECT codigo FROM public.cfg_estados_manzana WHERE activo", String.class);
    }
    public List<String> tiposLote() {
        return jdbc.queryForList("SELECT codigo FROM public.cfg_tipos_lote WHERE activo", String.class);
    }
}
