package monolithe.core_service.service;
import monolithe.core_service.dto.ConfiguracionProyectoResponse;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.GestionComercialDto.CambioMatriz;
import monolithe.core_service.exception.ReglaNegocioException;
import java.math.BigDecimal;
import java.util.*;

final class MatrizRecargosComercial {
    private MatrizRecargosComercial(){}
    static List<Tarifa> generar(ConfiguracionProyectoResponse config,CambioMatriz req){
        var zonas=new HashSet<>(config.zonas());
        if(!zonas.contains("D"))throw new ReglaNegocioException("La matriz requiere una zona regular D.");
        var componentes=new TreeSet<String>();
        for(String z:zonas){
            if(z.equals("D"))continue;
            if(!z.matches("[A-CE-Z]+")||z.chars().distinct().count()!=z.length())
                throw new ReglaNegocioException("La zona "+z+" no es una combinación válida.");
            for(char ch:z.toCharArray()){
                String k=String.valueOf(ch);
                if(!zonas.contains(k))throw new ReglaNegocioException("Falta la zona simple "+k+" para componer "+z+".");
                componentes.add(k);
            }
        }
        if(!req.recargos().keySet().equals(componentes))throw new ReglaNegocioException("Completa los recargos de todas las zonas simples: "+componentes+".");
        if(req.precioBase().signum()<=0||req.recargos().values().stream().anyMatch(v->v==null||v.signum()<0))
            throw new ReglaNegocioException("El precio base debe ser positivo y los recargos no negativos.");
        if(config.datos().etapas().isEmpty())throw new ReglaNegocioException("Registra al menos una etapa comercial.");
        if((long)zonas.size()*config.datos().etapas().size()>2000)throw new ReglaNegocioException("Demasiadas combinaciones.");
        var tarifas=new ArrayList<Tarifa>();
        for(var etapa:config.datos().etapas())for(String z:new TreeSet<>(zonas)){
            BigDecimal valor=req.precioBase();
            if(!z.equals("D"))for(char ch:z.toCharArray())valor=valor.add(req.recargos().get(String.valueOf(ch)));
            if(valor.compareTo(new BigDecimal("9999999999.99"))>0)throw new ReglaNegocioException("El precio de "+z+" excede el máximo admitido.");
            tarifas.add(new Tarifa(z,etapa.codigo(),"PEN",TipoTarifa.MONTO_FIJO,valor,req.vigenteDesde(),req.vigenteHasta()));
        }
        return tarifas;
    }
}
