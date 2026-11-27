package monolithe.core_service.service;
import monolithe.core_service.dto.ConfiguracionProyectoResponse;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.GestionComercialDto.*;
import monolithe.core_service.exception.ReglaNegocioException;
import java.math.BigDecimal;
import java.util.*;

final class MatrizRecargosComercial {
    private MatrizRecargosComercial(){}
    static List<Tarifa> generar(ConfiguracionProyectoResponse config,CambioMatriz req){
        return generar(config,req,config.datos().etapas().stream().map(Etapa::codigo).toList());
    }
    static List<Tarifa> generar(ConfiguracionProyectoResponse config,CambioMatriz req,Collection<String> destino){
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
        if((long)zonas.size()*destino.size()>2000)throw new ReglaNegocioException("Demasiadas combinaciones.");
        var tarifas=new ArrayList<Tarifa>();
        for(var etapa:destino)for(String z:new TreeSet<>(zonas)){
            BigDecimal valor=req.precioBase();
            if(!z.equals("D"))for(char ch:z.toCharArray())valor=valor.add(req.recargos().get(String.valueOf(ch)));
            if(valor.compareTo(new BigDecimal("9999999999.99"))>0)throw new ReglaNegocioException("El precio de "+z+" excede el máximo admitido.");
            tarifas.add(new Tarifa(z,etapa,"PEN",TipoTarifa.MONTO_FIJO,valor,req.vigenteDesde(),req.vigenteHasta()));
        }
        return tarifas;
    }
    // Inferir solo un tarifario común verificable: misma cobertura, importes y vigencia.
    // No interpretar diferencias históricas como herencia ni cambiar precios al consultar.
    static Tarifario inferir(ConfiguracionProyectoResponse config,List<Tarifa> tarifas){
        var codigos=config.datos().etapas().stream().map(Etapa::codigo).toList();
        var existentes=codigos.stream().filter(e->tarifas.stream().anyMatch(t->e.equals(t.codigoEtapa())&&"PEN".equals(t.moneda()))).toList();
        var independiente=new Tarifario(null,existentes);
        if(existentes.isEmpty()||!config.zonas().contains("D"))return independiente;
        String primera=existentes.getFirst();
        var fila=tarifas.stream().filter(t->primera.equals(t.codigoEtapa())&&"PEN".equals(t.moneda())&&config.zonas().contains(t.codigoZona())).toList();
        var base=fila.stream().filter(t->"D".equals(t.codigoZona())).findFirst().orElse(null);
        if(base==null)return independiente;
        var recargos=new TreeMap<String,BigDecimal>();
        for(var t:fila)if(t.codigoZona().length()==1&&!"D".equals(t.codigoZona()))recargos.put(t.codigoZona(),t.valor().subtract(base.valor()));
        var req=new CambioMatriz(0L,base.valor(),recargos,base.vigenteDesde(),base.vigenteHasta());
        try{
            var esperadas=generar(config,req,existentes);
            var actuales=tarifas.stream().filter(t->existentes.contains(t.codigoEtapa())&&"PEN".equals(t.moneda())&&config.zonas().contains(t.codigoZona())).toList();
            if(actuales.size()!=esperadas.size()||esperadas.stream().anyMatch(t->actuales.stream().noneMatch(a->a.codigoEtapa().equals(t.codigoEtapa())&&a.codigoZona().equals(t.codigoZona())&&a.tipoTarifa()==t.tipoTarifa()&&a.valor().compareTo(t.valor())==0&&Objects.equals(a.vigenteDesde(),t.vigenteDesde())&&Objects.equals(a.vigenteHasta(),t.vigenteHasta()))))return independiente;
            return new Tarifario(new MatrizBase(base.valor(),Map.copyOf(recargos),base.vigenteDesde(),base.vigenteHasta()),List.of());
        }catch(ReglaNegocioException ex){return independiente;}
    }
    static CambioMatriz solicitud(long revision,MatrizBase base){
        return new CambioMatriz(revision,base.precioBase(),base.recargos(),base.vigenteDesde(),base.vigenteHasta());
    }
}
