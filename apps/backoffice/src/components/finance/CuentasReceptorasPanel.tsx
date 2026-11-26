import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCwIcon, LandmarkIcon, ShieldCheckIcon } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert, EmptyState } from '../ui/Feedback';
import { Input, Select } from '../ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import { crmBackend, type CrmCuentasVenta } from '../../services/crmBackend';

type Moneda='PEN'|'USD';
const inicio={nombre:'',banco:'',titular:'',numeroCuenta:'',cci:'',moneda:'PEN' as Moneda};
const digitos=(v:string)=>v.replace(/[^0-9]/g,'');
export function CuentasReceptorasPanel(){
  const {can}=useAuth();
  const [datos,setDatos]=useState<CrmCuentasVenta|null>(null);
  const [form,setForm]=useState(inicio);
  const [revision,setRevision]=useState(0);
  const [cargando,setCargando]=useState(true);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState('');
  const [confirmacion,setConfirmacion]=useState(false);
  const cargar=()=>setRevision(n=>n+1);
  useEffect(()=>{
    let active=true;setCargando(true);setError('');
    void crmBackend.cuentasReceptorasVenta()
      .then(r=>{if(active)setDatos(r);})
      .catch(e=>{if(active){setDatos(null);setError(e instanceof Error?e.message:'No se pudieron consultar cuentas.');}})
      .finally(()=>{if(active)setCargando(false);});
    return ()=>{active=false;};
  },[revision]);

  const puedeCrear=can('finance.edit')&&Boolean(datos?.puedeConfigurar);
  const valido=form.nombre.trim().length>=5&&form.banco.trim().length>=3
    &&form.titular.trim().length>=5
    &&/^\d{8,30}$/.test(form.numeroCuenta)
    &&(!form.cci||/^\d{20}$/.test(form.cci))
    &&!/^([0-9])\1+$/.test(form.numeroCuenta)
    &&(!form.cci||!/^([0-9])\1+$/.test(form.cci))
    &&confirmacion;
  const guardar=async()=>{
    if(!puedeCrear||!valido||guardando)return;
    setGuardando(true);
    try{
      const r=await crmBackend.crearCuentaReceptora({
        nombre:form.nombre.trim(),banco:form.banco.trim(),
        titular:form.titular.trim(),numeroCuenta:form.numeroCuenta,
        cci:form.cci||null,moneda:form.moneda
      });
      toast.success('Cuenta receptora registrada',
        {description:`${r.nombre} · terminación ${r.terminaEn} · ${r.moneda}`});
      setForm(inicio);setConfirmacion(false);cargar();
    }catch(e){
      toast.error('No se pudo registrar la cuenta',{
        description:e instanceof Error?e.message:'Verifica los datos bancarios.'
      });
    }finally{setGuardando(false);}
  };

  return <div className="space-y-4">
    <Alert tone="info" title="Solo cuentas receptoras verificadas">
      Gerencia debe registrar una cuenta perteneciente realmente a la empresa.
      Los números de cuenta y CCI se almacenan de forma privada y no se devuelven
      íntegramente en esta pantalla. Registrar una cuenta no confirma ningún pago.
    </Alert>
    <Card>
      <CardHeader title="Cuentas disponibles para conciliación"
        description="Se excluyen las cuentas de demostración. Elige la cuenta correcta al verificar cada cobro."
        actions={<Button variant="secondary" icon={RefreshCwIcon} disabled={cargando}
          onClick={cargar}>Actualizar</Button>}/>
      {cargando&&<p className="p-5 text-sm text-brand-500">Consultando cuentas…</p>}
      {error&&<div className="p-4"><Alert tone="danger" title="Error de consulta">{error}</Alert></div>}
      {!cargando&&!error&&datos?.cuentas.length===0&&
        <EmptyState title="No existen cuentas reales configuradas"
          description="Gerencia puede añadir una cuenta bancaria verificada debajo."/>}
      {!cargando&&!error&&Boolean(datos?.cuentas.length)&&
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {datos?.cuentas.map(c=><div key={c.idCuenta}
            className="flex items-start gap-3 rounded-xl border border-brand-200 bg-white p-4">
            <span className="rounded-lg bg-brand-50 p-2 text-brand-700"><LandmarkIcon size={20}/></span>
            <div className="min-w-0">
              <p className="font-semibold text-brand-900">{c.nombre}</p>
              <p className="text-xs text-brand-500">{c.banco||c.tipo} · {c.moneda||c.idMoneda}</p>
              <p className="mt-2 font-mono text-xs text-brand-700">
                {c.terminaEn?`•••• ${c.terminaEn}`:c.codigo}
              </p>
            </div>
          </div>)}
        </div>}
    </Card>
    {puedeCrear&&<Card>
      <CardHeader title="Registrar cuenta bancaria receptora"
        description="Operación exclusiva de Gerencia con permisos financieros. No permite editar cuentas existentes."/>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-xs font-semibold text-brand-700">
          Nombre para identificar la cuenta *
          <Input className="mt-1" maxLength={120} value={form.nombre}
            placeholder="Cuenta principal de cobranzas"
            onChange={e=>setForm(s=>({...s,nombre:e.target.value}))}/>
        </label>
        <label className="text-xs font-semibold text-brand-700">
          Entidad bancaria *
          <Input className="mt-1" maxLength={120} value={form.banco}
            placeholder="Nombre del banco"
            onChange={e=>setForm(s=>({...s,banco:e.target.value}))}/>
        </label>
        <label className="text-xs font-semibold text-brand-700 sm:col-span-2">
          Titular legal de la cuenta *
          <Input className="mt-1" maxLength={180} value={form.titular}
            placeholder="Razón social que figura en el banco"
            onChange={e=>setForm(s=>({...s,titular:e.target.value}))}/>
        </label>
        <label className="text-xs font-semibold text-brand-700">
          Número de cuenta (solo dígitos) *
          <Input className="mt-1" inputMode="numeric" maxLength={30}
            autoComplete="off" value={form.numeroCuenta}
            onChange={e=>setForm(s=>({...s,numeroCuenta:digitos(e.target.value)}))}/>
          <span className="mt-1 block font-normal text-brand-500">Entre 8 y 30 dígitos.</span>
        </label>
        <label className="text-xs font-semibold text-brand-700">
          CCI (opcional)
          <Input className="mt-1" inputMode="numeric" maxLength={20}
            autoComplete="off" value={form.cci}
            onChange={e=>setForm(s=>({...s,cci:digitos(e.target.value)}))}/>
          <span className="mt-1 block font-normal text-brand-500">Si se indica, debe tener 20 dígitos.</span>
        </label>
        <label className="text-xs font-semibold text-brand-700">
          Moneda *
          <Select className="mt-1" value={form.moneda}
            onChange={e=>setForm(s=>({...s,moneda:e.target.value as Moneda}))}>
            <option value="PEN">PEN — Soles</option>
            <option value="USD">USD — Dólares</option>
          </Select>
        </label>
        <div className="flex items-center gap-2 self-end rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
          <ShieldCheckIcon size={18}/>
          Acceso exclusivo de Gerencia · operación auditada
        </div>
        <label className="flex items-start gap-2 sm:col-span-2">
          <input type="checkbox" checked={confirmacion}
            onChange={e=>setConfirmacion(e.target.checked)}/>
          <span className="text-xs text-brand-700">
            He cotejado los datos con la documentación bancaria oficial de la empresa.
            Confirmo que esta cuenta es real y está autorizada para recibir ingresos.
          </span>
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <Button variant="primary" disabled={!valido||guardando}
            onClick={()=>void guardar()}>
            {guardando?'Registrando…':'Registrar cuenta receptora'}
          </Button>
        </div>
      </div>
    </Card>}
    {!puedeCrear&&!cargando&&!error&&
      <p className="text-xs text-brand-500">La configuración de cuentas corresponde exclusivamente a Gerencia autorizada.</p>}
  </div>;
}
