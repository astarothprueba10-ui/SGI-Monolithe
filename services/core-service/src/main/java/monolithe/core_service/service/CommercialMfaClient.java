package monolithe.core_service.service;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.SerializationFeature;
import monolithe.core_service.dto.*;
import monolithe.core_service.dto.GestionComercialDto.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.MessageDigest;
import java.util.*;

@Service
public class CommercialMfaClient {
    private final RestClient http;
    private final JsonMapper mapper;
    private final String key;
    public CommercialMfaClient(JsonMapper mapper,@Value("${services.auth.url:http://localhost:8081}") String url,@Value("${security.internal.mail-key:}") String key){
        this.mapper=mapper.rebuild().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS).build();this.http=RestClient.builder().baseUrl(url).build();this.key=key;
    }
    public Object normalizar(String accion,tools.jackson.databind.JsonNode datos){
        Class<?> tipo=switch(accion){
            case "MATRIZ" -> CambioMatriz.class;
            case "TARIFA" -> CambioTarifa.class;
            case "DISPONIBILIDAD" -> Disponibilidad.class;
            case "IMPORTACION" -> ImportacionProyectoRequest.class;
            case "PUBLICACION" -> PublicacionComercialRequest.class;
            case "ETAPAS" -> CambioEtapas.class;
            case "ASIGNACION" -> CambioAsignacion.class;
            case "MANZANA" -> ManzanaComercialDto.Cambio.class;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Acción comercial inválida.");
        };
        try{return mapper.treeToValue(datos,tipo);}catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Datos de confirmación inválidos.");}
    }
    String huella(Object datos){
        try{
            if(datos==null)throw new IllegalArgumentException("Datos ausentes");
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(datos)));
        }catch(Exception e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"No se pudo preparar la confirmación.");}
    }
    private RestClient.ResponseSpec enviar(Jwt jwt,String ruta,Object body){
        if(key==null||key.isBlank())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"La clave interna de correo no está configurada.");
        return http.post().uri("/api/auth/internal/commercial-mfa/"+ruta).headers(h->{h.setBearerAuth(jwt.getTokenValue());h.set("X-Internal-Service-Key",key);}).contentType(MediaType.APPLICATION_JSON).body(body).retrieve()
            .onStatus(HttpStatusCode::isError,(req,res)->{
                int status=res.getStatusCode().value();
                String mensaje="No se pudo confirmar la operación comercial.";
                try{var json=mapper.readTree(res.getBody());if(json.hasNonNull("message"))mensaje=json.get("message").asText();else if(json.hasNonNull("mensaje"))mensaje=json.get("mensaje").asText();}catch(Exception ignored){}
                throw new ResponseStatusException(status>=500?HttpStatus.SERVICE_UNAVAILABLE:res.getStatusCode(),mensaje);
            });
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> iniciar(Jwt jwt,long proyecto,String accion,Object datos){
        try{return enviar(jwt,"start",Map.of("proyecto",proyecto,"accion",accion,"huella",huella(datos))).body(Map.class);}
        catch(ResourceAccessException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Auth Service no está disponible para enviar el código.");}
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> verificar(Jwt jwt,UUID id,String codigo){
        try{return enviar(jwt,"verify",Map.of("challengeId",id,"codigo",codigo)).body(Map.class);}
        catch(ResourceAccessException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Auth Service no está disponible.");}
    }
    public void exigir(Jwt jwt,long proyecto,String accion,Object datos,String token){
        if(token==null||token.isBlank())throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,"Confirma primero esta operación mediante MFA por correo.");
        try{enviar(jwt,"consume",Map.of("proyecto",proyecto,"accion",accion,"huella",huella(datos),"approvalToken",token)).toBodilessEntity();}
        catch(ResourceAccessException e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"No se pudo comprobar la autorización comercial.");}
    }
}
