package monolithe.cms_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProyectoSummaryResponse {

    private Long idProyecto;
    private Long idCmsProyecto;
    private Long idPagina;
    private String codigo;
    private String nombre;
    private String descripcion;
    private String nombreComercial;
    private String resumenComercial;
    private String descripcionComercial;

    private Boolean destacado;
    private Integer orden;

    private String textoCta;
    private String urlCta;

    private String paginaCodigo;
    private String paginaSlug;
    private String direccion;
    private String ubicacionReferencia;
    private String distrito;
    private String provincia;
    private String departamento;
    private BigDecimal areaTotal;
    private BigDecimal latitud;
    private BigDecimal longitud;
    private Boolean activo;
}
