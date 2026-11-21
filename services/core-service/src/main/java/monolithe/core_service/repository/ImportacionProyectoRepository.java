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
