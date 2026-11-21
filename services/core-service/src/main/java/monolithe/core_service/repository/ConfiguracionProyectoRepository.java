package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.ConfiguracionProyectoResponse.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ConfiguracionProyectoRepository {
    private final JdbcTemplate jdbc;

    public record Version(int numero, String json) {}

    public Optional<Version> vigente(Long proyecto) {
        return jdbc.query("""
            SELECT version, configuracion::text AS json
            FROM public.inm_configuracion_comercial_borradores
            WHERE id_proyecto = ? ORDER BY version DESC LIMIT 1
            """, (rs, n) -> new Version(rs.getInt("version"), rs.getString("json")), proyecto)
                .stream().findFirst();
    }

    public boolean insertar(Long proyecto, int version, String json, Long actor) {
        return jdbc.update("""
            INSERT INTO public.inm_configuracion_comercial_borradores
            (id_proyecto, version, configuracion, id_usuario)
            VALUES (?, ?, CAST(? AS jsonb), ?)
            ON CONFLICT (id_proyecto, version) DO NOTHING
            """, proyecto, version, json, actor) == 1;
    }

    public List<Etapa> etapas(Long proyecto) {
        return jdbc.query("""
            SELECT codigo, nombre FROM public.inm_etapas_comerciales
            WHERE id_proyecto = ? AND activo ORDER BY numero_orden, codigo
            """, (rs, n) -> new Etapa(rs.getString("codigo"), rs.getString("nombre"),
                Disponibilidad.BLOQUEADA, TipoDescuento.NINGUNO, BigDecimal.ZERO), proyecto);
    }

    public List<Manzana> manzanas(Long proyecto) {
        return jdbc.query("""
            SELECT id_manzana, codigo, nombre FROM public.inm_manzanas
            WHERE id_proyecto = ? AND activo ORDER BY codigo, id_manzana
            """, (rs, n) -> new Manzana(rs.getLong("id_manzana"), rs.getString("codigo"),
                rs.getString("nombre")), proyecto);
    }

    public List<Lote> lotes(Long proyecto) {
        return jdbc.query("""
            SELECT id_lote, id_manzana, codigo FROM public.inm_lotes
            WHERE id_proyecto = ? AND activo ORDER BY codigo, id_lote
            """, (rs, n) -> new Lote(rs.getLong("id_lote"), rs.getLong("id_manzana"),
                rs.getString("codigo")), proyecto);
    }
}
