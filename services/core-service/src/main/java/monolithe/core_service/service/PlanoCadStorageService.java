package monolithe.core_service.service;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.service.PlanoCadArchivoValidator.Archivo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class PlanoCadStorageService {
    private static final String BUCKET="planos-cad-private";
    private final JdbcTemplate jdbc;
    private final RestClient client;
    private final JsonMapper mapper;
    private final String url;
    private final String key;

    public PlanoCadStorageService(JdbcTemplate jdbc,JsonMapper mapper,
            @Value("${SUPABASE_URL:}") String supabaseUrl,
            @Value("${supabase.storage.service-role-key:}") String secretKey) {
        this.jdbc=jdbc;
        this.mapper=mapper;
        this.client=RestClient.create();
        this.url=supabaseUrl==null?"":supabaseUrl.trim().replaceAll("/+$","");
        this.key=secretKey==null?"":secretKey.trim();
    }

    public record Ficha(Long id,String nombre,String formato,long bytes,int version,
                        String sha256,OffsetDateTime fechaCarga) {}
    public record Descarga(String url,int caducaSegundos,String nombre) {}

    @Transactional(readOnly=true)
    public List<Ficha> listar(Long proyecto) {
        verificarProyecto(proyecto);
        return jdbc.query("""
            SELECT id_plano_archivo,nombre_original,formato,bytes,version,sha256,fecha_carga
            FROM public.inm_planos_cad_archivos WHERE id_proyecto=?
            ORDER BY version DESC
            """,(rs,n)->new Ficha(rs.getLong(1),rs.getString(2),rs.getString(3),
                rs.getLong(4),rs.getInt(5),rs.getString(6),rs.getObject(7,OffsetDateTime.class)),proyecto);
    }

    @Transactional
    public Ficha cargar(Long proyecto,Long actor,MultipartFile archivo) {
        verificarProyecto(proyecto);
        if(actor==null || actor<=0)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sesión de usuario inválida.");
        if(archivo==null || archivo.isEmpty() || archivo.getSize()>PlanoCadArchivoValidator.MAX_BYTES)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Adjunta un DWG o SVG de hasta 20 MB.");
        final byte[] bytes;
        try { bytes=archivo.getBytes(); }
        catch(java.io.IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"No fue posible leer el archivo.",ex);
        }
        Archivo info=PlanoCadArchivoValidator.verificar(archivo.getOriginalFilename(),bytes);
        List<Ficha> existentes=jdbc.query("""
            SELECT id_plano_archivo,nombre_original,formato,bytes,version,sha256,fecha_carga
            FROM public.inm_planos_cad_archivos WHERE id_proyecto=? AND sha256=?
            """,(rs,n)->new Ficha(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getLong(4),
                rs.getInt(5),rs.getString(6),rs.getObject(7,OffsetDateTime.class)),
            proyecto,info.sha256());
        if(!existentes.isEmpty()) return existentes.getFirst();
        String base=validarStorage();
        jdbc.queryForObject("SELECT id_proyecto FROM public.inm_proyectos WHERE id_proyecto=? FOR UPDATE",
            Long.class,proyecto);
        Integer version=jdbc.queryForObject("""
            SELECT coalesce(max(version),0)+1 FROM public.inm_planos_cad_archivos WHERE id_proyecto=?
            """,Integer.class,proyecto);
        String ruta="proyectos/"+proyecto+"/originales/"+UUID.randomUUID()+"."+info.formato().toLowerCase(Locale.ROOT);
        try {
            client.post().uri(base+"/object/"+BUCKET+"/"+ruta)
                .header("apikey",key).header("Authorization","Bearer "+key)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("x-upsert","false").body(bytes).retrieve().toBodilessEntity();
        } catch(RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "No fue posible almacenar el plano original en Supabase Storage.",ex);
        }
        try {
            return jdbc.queryForObject("""
                INSERT INTO public.inm_planos_cad_archivos(id_proyecto,version,formato,nombre_original,
                  ruta_archivo,mime,bytes,sha256,id_usuario) VALUES(?,?,?,?,?,?,?,?,?)
                RETURNING id_plano_archivo,nombre_original,formato,bytes,version,sha256,fecha_carga
                """,(rs,n)->new Ficha(rs.getLong(1),rs.getString(2),rs.getString(3),
                    rs.getLong(4),rs.getInt(5),rs.getString(6),rs.getObject(7,OffsetDateTime.class)),
                    proyecto,version,info.formato(),info.nombre(),ruta,info.mime(),bytes.length,info.sha256(),actor);
        } catch(RuntimeException ex) {
            try {
                client.method(HttpMethod.DELETE).uri(base+"/object/"+BUCKET+"/"+ruta)
                    .header("apikey",key).header("Authorization","Bearer "+key)
                    .retrieve().toBodilessEntity();
            } catch(Exception ignored) {
                // La base de datos conserva su integridad. Se limpiará el objeto huérfano por mantenimiento.
            }
            throw ex;
        }
    }

    @Transactional(readOnly=true)
    public Descarga firmarDescarga(Long proyecto,Long idArchivo) {
        verificarProyecto(proyecto);
        var fila=jdbc.query("""
            SELECT ruta_archivo,nombre_original FROM public.inm_planos_cad_archivos
            WHERE id_proyecto=? AND id_plano_archivo=?
            """,(rs,n)->Map.entry(rs.getString(1),rs.getString(2)),proyecto,idArchivo)
            .stream().findFirst().orElseThrow(()->new ResponseStatusException(
                HttpStatus.NOT_FOUND,"Plano no encontrado."));
        String base=validarStorage();
        String ruta="/object/sign/"+BUCKET+"/"+fila.getKey();
        try {
            String raw=client.post().uri(base+ruta)
                .header("apikey",key).header("Authorization","Bearer "+key)
                .contentType(MediaType.APPLICATION_JSON).body(Map.of("expiresIn",180))
                .retrieve().body(String.class);
            String firmado=mapper.readTree(raw==null?"":raw).path("signedURL").asString("");
            URI u=URI.create(firmado);
            if(u.isAbsolute() || !ruta.equals(u.getRawPath()) || u.getRawQuery()==null
               || !u.getRawQuery().matches("token=[a-zA-Z0-9._~%+\\-]+"))
                throw new IllegalStateException("Enlace firmado inválido.");
            return new Descarga(base+firmado,180,fila.getValue());
        } catch(Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "No fue posible generar la descarga privada.",ex);
        }
    }

    private void verificarProyecto(Long proyecto) {
        boolean existe=Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=? AND activo)
            """,Boolean.class,proyecto));
        if(!existe) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Proyecto no encontrado.");
    }

    private String validarStorage() {
        if(key.isBlank() || url.isBlank())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Storage no está configurado en el Core Service. Revisa SUPABASE_URL y SUPABASE_SECRET_KEY.");
        URI u;
        try {u=URI.create(url);}
        catch(IllegalArgumentException ex) {throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE,"URL de Supabase inválida.",ex);}
        if(!"https".equalsIgnoreCase(u.getScheme()) || u.getHost()==null
            || !u.getHost().endsWith(".supabase.co") || u.getUserInfo()!=null || u.getPort()!=-1
            || u.getRawQuery()!=null || u.getRawFragment()!=null
            || (u.getRawPath()!=null && !u.getRawPath().isBlank()))
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Servidor de Storage no autorizado.");
        return url+"/storage/v1";
    }
}
