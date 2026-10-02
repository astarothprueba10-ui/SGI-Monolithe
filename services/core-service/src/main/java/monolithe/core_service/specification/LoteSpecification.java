package monolithe.core_service.specification;

import jakarta.persistence.criteria.Predicate;
import monolithe.core_service.dto.LoteFiltroRequest;
import monolithe.core_service.entity.Lote;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class LoteSpecification {

    private LoteSpecification() {
    }

    public static Specification<Lote> conFiltros(LoteFiltroRequest filtro) {

        return (root, query, cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            if (filtro.idProyecto() != null) {
                predicates.add(
                        cb.equal(
                                root.get("idProyecto"),
                                filtro.idProyecto()
                        )
                );
            }

            if (filtro.idEtapa() != null) {
                predicates.add(
                        cb.equal(
                                root.get("manzana")
                                        .get("etapa")
                                        .get("idEtapa"),
                                filtro.idEtapa()
                        )
                );
            }

            if (filtro.idZona() != null) {
                predicates.add(
                        cb.equal(
                                root.get("zona")
                                        .get("idZona"),
                                filtro.idZona()
                        )
                );
            }

            if (filtro.idManzana() != null) {
                predicates.add(
                        cb.equal(
                                root.get("manzana")
                                        .get("idManzana"),
                                filtro.idManzana()
                        )
                );
            }

            if (filtro.idEstadoLote() != null) {
                predicates.add(
                        cb.equal(
                                root.get("estadoLote")
                                        .get("idEstadoLote"),
                                filtro.idEstadoLote()
                        )
                );
            }

            if (filtro.idTipoLote() != null) {
                predicates.add(
                        cb.equal(
                                root.get("tipoLote")
                                        .get("idTipoLote"),
                                filtro.idTipoLote()
                        )
                );
            }

            if (filtro.texto() != null && !filtro.texto().isBlank()) {

                String texto = "%"
                        + filtro.texto()
                        .trim()
                        .toLowerCase(Locale.ROOT)
                        + "%";

                Predicate codigo = cb.like(
                        cb.lower(root.get("codigo")),
                        texto
                );

                Predicate numero = cb.like(
                        cb.lower(root.get("numero")),
                        texto
                );

                predicates.add(
                        cb.or(codigo, numero)
                );
            }

            if (filtro.areaMin() != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.get("areaM2"),
                                filtro.areaMin()
                        )
                );
            }

            if (filtro.areaMax() != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("areaM2"),
                                filtro.areaMax()
                        )
                );
            }

            if (filtro.activo() != null) {
                predicates.add(
                        cb.equal(
                                root.get("activo"),
                                filtro.activo()
                        )
                );
            }

            return cb.and(
                    predicates.toArray(new Predicate[0])
            );
        };
    }
}