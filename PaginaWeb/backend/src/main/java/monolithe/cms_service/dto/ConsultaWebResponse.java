package monolithe.cms_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultaWebResponse {

    private Long idConsulta;
    private String codigo;
    private String nombre;
    private String correo;
    private String telefono;
    private Long idProyecto;
    private OffsetDateTime fechaRecepcion;
    private String mensaje;
}
