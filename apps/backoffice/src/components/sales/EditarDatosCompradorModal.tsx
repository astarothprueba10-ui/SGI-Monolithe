import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { InfoIcon, UserRoundIcon, Building2Icon, MapPinIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { crmBackend, type CrmCatalogs, type CrmAdvisor, type CrmDatosCompradorVenta } from '../../services/crmBackend';
import { sanitizarLead, validarNuevoLead, type LeadField, type LeadFormValues } from '../../utils/crmLeadValidation';
import { toast } from 'sonner';
import { coreService, type UbicacionGeograficaResponse } from '../../services/coreService';

interface Props {
  open: boolean;
  idProspecto: number;
  lote: string;
  proyecto: string;
  modalidad: 'CONTADO' | 'FINANCIADA';
  puedeReasignar: boolean;
  asesorNombre: string;
  onClose: () => void;
  onGuardar: (datos: CrmDatosCompradorVenta) => void;
}

const VACIO: LeadFormValues = {
  names: '', paternalSurname: '', maternalSurname: '', phone: '',
  email: '', idProyecto: '', origenCodigo: 'WEB', motivoContacto: '',
  mensaje: '', idAsesor: '', tipoDocumento: 'DNI', numeroDocumento: '', direccion: ''
};

export function EditarDatosCompradorModal({
  open, idProspecto, lote, proyecto, modalidad, puedeReasignar, asesorNombre, onClose, onGuardar
}: Props) {
  const [form, setForm] = useState<LeadFormValues>(VACIO);
  const [catalogos, setCatalogos] = useState<CrmCatalogs | null>(null);
  const [asesores, setAsesores] = useState<CrmAdvisor[]>([]);
  const [original, setOriginal] = useState<CrmDatosCompradorVenta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [tocados, setTocados] = useState<Partial<Record<LeadField, boolean>>>({});
  const [referencia, setReferencia] = useState('');
  const [paises, setPaises] = useState<UbicacionGeograficaResponse[]>([]);
  const [departamentos, setDepartamentos] = useState<UbicacionGeograficaResponse[]>([]);
  const [provincias, setProvincias] = useState<UbicacionGeograficaResponse[]>([]);
  const [distritos, setDistritos] = useState<UbicacionGeograficaResponse[]>([]);
  const [geo, setGeo] = useState<{
    idPais: number | null;
    idDepartamento: number | null;
    idProvincia: number | null;
    idDistrito: number | null;
  }>({idPais: null, idDepartamento: null, idProvincia: null, idDistrito: null});
  const [errorGeo, setErrorGeo] = useState<string | null>(null);
  // El motivo corresponde a la captación del lead; no se pide en una venta.
  const errores = useMemo(() => validarNuevoLead({
    ...form, motivoContacto: 'Revisión de datos contractuales'
  }), [form]);
  const actualizar = (campo: LeadField, valor: string) => {
    setForm(previo => ({
      ...previo,
      [campo]: sanitizarLead(campo, valor, previo.tipoDocumento)
    }));
    setTocados(previo => ({ ...previo, [campo]: true }));
  };
  const error = (campo: LeadField) =>
    (enviado || tocados[campo]) && errores[campo] ? (
      <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">{errores[campo]}</p>
    ) : null;
  const invalido = (campo: LeadField) => Boolean((enviado || tocados[campo]) && errores[campo]);

  useEffect(() => {
    if (!open || !idProspecto) return;
    let activo = true;
    setCargando(true);
    setErrorCarga(null);
    setEnviado(false);
    setTocados({});
    setOriginal(null);
    setReferencia('');
    setGeo({idPais: null,idDepartamento: null,idProvincia: null,idDistrito: null});
    setPaises([]);setDepartamentos([]);setProvincias([]);setDistritos([]);
    setErrorGeo(null);
    Promise.all([
      crmBackend.datosCompradorParaVenta(idProspecto),
      crmBackend.catalogos(),
      puedeReasignar ? crmBackend.asesores() : Promise.resolve([] as CrmAdvisor[]),
      coreService.getUbicaciones()
    ]).then(([datos, lista, asesoresDisponibles, paisesDisponibles]) => {
      if (!activo) return;
      setOriginal(datos);
      setCatalogos(lista);
      setAsesores(asesoresDisponibles);
      const peru = paisesDisponibles.find(p => p.codigo === 'PE' && p.tipo === 'PAIS');
      setPaises(peru ? [peru] : []);
      setGeo({
        idPais: datos.idPais ?? peru?.idUbicacion ?? null,
        idDepartamento: datos.idDepartamento ?? null,
        idProvincia: datos.idProvincia ?? null,
        idDistrito: datos.idDistrito ?? null
      });
      setReferencia(datos.referencia ?? '');
      setForm({
        names: datos.nombres ?? '',
        paternalSurname: datos.apellidoPaterno ?? '',
        maternalSurname: datos.apellidoMaterno ?? '',
        phone: sanitizarLead('phone', datos.telefono ?? ''),
        email: datos.correo ?? '',
        idProyecto: datos.idProyectoInteres || '',
        origenCodigo: datos.origenCodigo ?? 'WEB',
        motivoContacto: datos.motivoContacto ?? '',
        mensaje: datos.mensaje ?? '',
        idAsesor: datos.idAsesor ?? '',
        tipoDocumento: datos.tipoDocumento ?? 'DNI',
        numeroDocumento: datos.numeroDocumento ?? '',
        direccion: datos.direccion ?? ''
      });
    }).catch((e: unknown) => {
      if (activo) setErrorCarga(e instanceof Error ? e.message : 'No se pudieron consultar los datos.');
    }).finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [open, idProspecto, puedeReasignar]);

  const guardar = () => {
    setEnviado(true);
    if (!original || cargando || errorCarga) return;
    if (Object.keys(errores).length) {
      toast.error('Corrige los campos marcados en rojo antes de continuar.');
      return;
    }
    if (!form.direccion.trim() || !geo.idPais || !geo.idDepartamento ||
        !geo.idProvincia || !geo.idDistrito) {
      toast.error('Complete la dirección, país, departamento, provincia y distrito.');
      return;
    }
    if (referencia.trim().length > 255) {
      toast.error('La referencia del domicilio no debe superar 255 caracteres.');
      return;
    }
    if (!puedeReasignar && form.idAsesor !== (original.idAsesor ?? '')) {
      toast.error('No tienes permiso para reasignar al asesor comercial.');
      return;
    }
    onGuardar({
      idProspecto,
      nombres: form.names.trim(),
      apellidoPaterno: form.paternalSurname.trim(),
      apellidoMaterno: form.maternalSurname.trim(),
      telefono: form.phone.trim(),
      correo: form.email.trim().toLowerCase(),
      idProyectoInteres: Number(form.idProyecto),
      origenCodigo: form.origenCodigo,
      motivoContacto: form.motivoContacto.trim(),
      mensaje: form.mensaje.trim(),
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento.trim(),
      direccion: form.direccion.trim(),
      referencia: referencia.trim(),
      idPais: geo.idPais,
      idDepartamento: geo.idDepartamento,
      idProvincia: geo.idProvincia,
      idDistrito: geo.idDistrito,
      idAsesor: form.idAsesor === '' ? null : Number(form.idAsesor)
    });
  };

  const campo = (key: LeadField, label: string, input: ReactNode, full = false) => (
    <div className={full ? 'min-w-0 sm:col-span-2' : 'min-w-0'} key={key}>
      <label className="mb-1.5 block text-xs font-semibold text-brand-700">{label}</label>
      {input}
      {error(key)}
    </div>
  );
  const propsError = (key: LeadField) => ({
    'aria-invalid': invalido(key) as boolean,
    className: invalido(key) ? 'border-red-500 focus:border-red-600' : ''
  });

  return (
    <Modal open={open} onClose={onClose} width="max-w-3xl"
      title="Editar datos del cliente comprador"
      description="Verifica y actualiza la información del comprador antes de registrar la venta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!original || cargando || !!errorCarga} onClick={guardar}>
            Guardar cambios
          </Button>
        </>
      }>
      {cargando ? <p className="py-10 text-center text-sm text-brand-500">Cargando expediente del comprador…</p>
      : errorCarga ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorCarga} Cierra el formulario y vuelve a validar la venta.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
            <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p><strong>Revisión obligatoria:</strong> la información del comprador se utilizará
              para elaborar el contrato y crear su usuario de acceso. Comprueba cuidadosamente
              los datos antes de continuar. Los cambios se aplicarán al registrar la venta pendiente.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-xs text-brand-700 sm:grid-cols-3">
            <span className="flex items-center gap-1.5"><UserRoundIcon className="h-4 w-4" /> Cliente comprador</span>
            <span className="flex items-center gap-1.5"><Building2Icon className="h-4 w-4 shrink-0" /> {proyecto}</span>
            <span className="flex items-center gap-1.5"><MapPinIcon className="h-4 w-4 shrink-0" /> {lote} · {modalidad === 'CONTADO' ? 'Contado' : 'Financiado'}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {campo('names', 'Nombres *', <Input required maxLength={120} value={form.names}
              onChange={e => actualizar('names', e.target.value)} {...propsError('names')} />)}
            {campo('paternalSurname', 'Apellido paterno *', <Input required maxLength={80} value={form.paternalSurname}
              onChange={e => actualizar('paternalSurname', e.target.value)} {...propsError('paternalSurname')} />)}
            {campo('maternalSurname', 'Apellido materno', <Input maxLength={80} value={form.maternalSurname}
              onChange={e => actualizar('maternalSurname', e.target.value)} {...propsError('maternalSurname')} />)}
            {campo('phone', 'Teléfono / WhatsApp *', <Input required type="tel" maxLength={16}
              value={form.phone} onChange={e => actualizar('phone', e.target.value)} {...propsError('phone')} />)}
            {campo('email', 'Correo electrónico *', <Input required type="email" maxLength={180}
              value={form.email} onChange={e => actualizar('email', e.target.value)} {...propsError('email')} />)}
            {campo('idProyecto', 'Proyecto de interés *', <Select value={form.idProyecto}
              onChange={e => setForm(p => ({...p,idProyecto:e.target.value ? Number(e.target.value) : ''}))}
              {...propsError('idProyecto')}>
              <option value="">Selecciona un proyecto...</option>
              {catalogos?.proyectos.map(p => <option value={p.id} key={p.id}>{p.nombre}</option>)}
            </Select>)}
            {campo('origenCodigo', 'Canal de origen *', <Select value={form.origenCodigo}
              onChange={e => setForm(p => ({...p,origenCodigo:e.target.value}))}
              {...propsError('origenCodigo')}>
              <option value="">Selecciona un canal...</option>
              {catalogos?.origenes.map(o => <option value={o.codigo} key={o.codigo}>{o.nombre}</option>)}
            </Select>)}
            {campo('tipoDocumento', 'Tipo de documento *', <Select value={form.tipoDocumento}
              onChange={e => setForm(p => ({ ...p, tipoDocumento:e.target.value, numeroDocumento:'' }))}>
              <option value="DNI">DNI</option><option value="CE">Carné de extranjería</option>
              <option value="RUC">RUC</option><option value="PASAPORTE">Pasaporte</option>
            </Select>)}
            {campo('numeroDocumento', 'Número de documento *', <Input required
              inputMode={form.tipoDocumento === 'PASAPORTE' ? 'text' : 'numeric'}
              maxLength={form.tipoDocumento === 'DNI' ? 8 : form.tipoDocumento === 'RUC' ? 11 : form.tipoDocumento === 'CE' ? 12 : 20}
              value={form.numeroDocumento} onChange={e => actualizar('numeroDocumento',e.target.value)}
              {...propsError('numeroDocumento')} />)}
            {campo('direccion', 'Dirección', <Input maxLength={255} value={form.direccion}
              onChange={e => actualizar('direccion', e.target.value)} {...propsError('direccion')} />)}
            {campo('motivoContacto', 'Motivo de contacto *', <Input required maxLength={150}
              value={form.motivoContacto} onChange={e => actualizar('motivoContacto', e.target.value)}
              {...propsError('motivoContacto')} />, true)}
            {campo('mensaje', 'Nota adicional', <Input maxLength={4000} value={form.mensaje}
              onChange={e => actualizar('mensaje', e.target.value)} {...propsError('mensaje')} />, true)}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-brand-700">Asesor responsable</label>
              <Select disabled={!puedeReasignar} value={form.idAsesor}
                onChange={e => setForm(p => ({ ...p, idAsesor: e.target.value ? Number(e.target.value) : '' }))}
                className={!puedeReasignar ? 'cursor-not-allowed bg-slate-100 text-slate-600' : ''}>
                <option value="" disabled={Boolean(original?.idAsesor)}>Sin asesor asignado</option>
                {original?.idAsesor && (!puedeReasignar ||
                    !asesores.some(a => a.id_asesor === original.idAsesor)) && (
                  <option value={original.idAsesor}>
                    {asesorNombre || `Asesor #${original.idAsesor}`}
                  </option>
                )}
                {puedeReasignar && asesores.filter(a => a.activo).map(a => (
                  <option value={a.id_asesor} key={a.id_asesor}>{a.nombre_completo}</option>
                ))}
              </Select>
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-500">
                <InfoIcon className="h-3.5 w-3.5" /> Solo Supervisor comercial y Gerencia pueden reasignar el asesor responsable.
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
