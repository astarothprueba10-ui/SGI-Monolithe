import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { InfoIcon, UserRoundIcon, Building2Icon, MapPinIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { crmBackend, type CrmCatalogs, type CrmAdvisor, type CrmDatosCompradorVenta, type CrmDatosConyugeVenta, type EstadoCivilReniec } from '../../services/crmBackend';
import { sanitizarLead, validarNuevoLead, type LeadField, type LeadFormValues } from '../../utils/crmLeadValidation';
import { toast } from 'sonner';
import { CONYUGE_VACIO, validarConyugeVenta } from '../../utils/crmConyugeVenta';
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
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivilReniec | ''>('');
  const [conyuge, setConyuge] = useState<CrmDatosConyugeVenta>(CONYUGE_VACIO);
  const [conyugeErroresVisibles, setConyugeErroresVisibles] = useState(false);
  const erroresConyuge = useMemo(() => validarConyugeVenta(conyuge), [conyuge]);
  const actualizarConyuge = (campo: keyof CrmDatosConyugeVenta, valor: string) => {
    setConyuge(prev => ({
      ...prev,
      [campo]: campo === 'telefono' ? valor.replace(/[^0-9+]/g, '')
        : campo === 'numeroDocumento' ? (prev.tipoDocumento === 'PASAPORTE'
          ? valor.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
          : valor.replace(/\D/g, ''))
        : campo === 'nombres' || campo === 'apellidoPaterno' || campo === 'apellidoMaterno'
          ? valor.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ -]/g, '')
          : valor
    }));
  };

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
    setEstadoCivil('');
    setConyuge(CONYUGE_VACIO);
    setConyugeErroresVisibles(false);
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
      setEstadoCivil(datos.estadoCivil ?? '');
      setConyuge(datos.conyuge ?? CONYUGE_VACIO);
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

  useEffect(() => {
    if (!open || !geo.idPais) return;
    let activo = true;
    setErrorGeo(null);
    coreService.getUbicaciones(geo.idPais).then(datos => {
      if (activo) setDepartamentos(datos.filter(u => u.tipo === 'DEPARTAMENTO'));
    }).catch(() => {if (activo) setErrorGeo('No se pudo consultar el catálogo de departamentos.');});
    return () => { activo = false; };
  }, [open, geo.idPais]);

  useEffect(() => {
    if (!open || !geo.idDepartamento) return;
    let activo = true;
    setErrorGeo(null);
    coreService.getUbicaciones(geo.idDepartamento).then(datos => {
      if (activo) setProvincias(datos.filter(u => u.tipo === 'PROVINCIA'));
    }).catch(() => {if (activo) setErrorGeo('No se pudo consultar el catálogo de provincias.');});
    return () => { activo = false; };
  }, [open, geo.idDepartamento]);

  useEffect(() => {
    if (!open || !geo.idProvincia) return;
    let activo = true;
    setErrorGeo(null);
    coreService.getUbicaciones(geo.idProvincia).then(datos => {
      if (activo) setDistritos(datos.filter(u => u.tipo === 'DISTRITO'));
    }).catch(() => {if (activo) setErrorGeo('No se pudo consultar el catálogo de distritos.');});
    return () => { activo = false; };
  }, [open, geo.idProvincia]);

  const guardar = () => {
    setEnviado(true);
    if (!original || cargando || errorCarga) return;
    if (Object.keys(errores).length) {
      toast.error('Corrige los campos marcados en rojo antes de continuar.');
      return;
    }
    if (!estadoCivil) {
      toast.error('Seleccione el estado civil del comprador.');
      return;
    }
    if (estadoCivil === 'CASADO') {
      setConyugeErroresVisibles(true);
      if (Object.keys(erroresConyuge).length > 0) {
        toast.error('Revise los datos del cónyuge marcados en rojo.');
        return;
      }
      if (conyuge.tipoDocumento === form.tipoDocumento &&
          conyuge.numeroDocumento.trim().toUpperCase() === form.numeroDocumento.trim().toUpperCase()) {
        toast.error('El cónyuge no puede tener el mismo documento que el comprador.');
        return;
      }
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
      idAsesor: form.idAsesor === '' ? null : Number(form.idAsesor),
      estadoCivil,
      conyuge: estadoCivil === 'CASADO'
        ? {
            ...conyuge, nombres: conyuge.nombres.trim(),
            apellidoPaterno: conyuge.apellidoPaterno.trim(),
            apellidoMaterno: conyuge.apellidoMaterno.trim(),
            telefono: conyuge.telefono.trim(),
            correo: conyuge.correo.trim().toLowerCase(),
            numeroDocumento: conyuge.numeroDocumento.trim().toUpperCase()
          }
        : null
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
            <div className="min-w-0 sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-brand-700">
                Estado civil (según DNI) *
              </label>
              <Select required value={estadoCivil} aria-invalid={enviado && !estadoCivil}
                onChange={e => {
                  setEstadoCivil(e.target.value as EstadoCivilReniec);
                  setConyugeErroresVisibles(false);
                }}>
                <option value="">Selecciona el estado civil</option>
                <option value="SOLTERO">Soltero(a)</option>
                <option value="CASADO">Casado(a)</option>
                <option value="DIVORCIADO">Divorciado(a)</option>
                <option value="VIUDO">Viudo(a)</option>
              </Select>
              {enviado && !estadoCivil &&
                <p role="alert" className="mt-1 text-xs text-red-600">El estado civil es obligatorio.</p>}
            </div>
            {estadoCivil === 'CASADO' && (
              <section className="min-w-0 space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3 sm:col-span-2 sm:p-4">
                <div>
                  <h3 className="text-sm font-semibold text-brand-900">Datos del cónyuge</h3>
                  <p className="mt-1 text-xs text-brand-600">
                    Información para preparar el contrato. No crea automáticamente otro comprador ni usuario.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {([
                    ['nombres','Nombres *',120],
                    ['apellidoPaterno','Apellido paterno *',80],
                    ['apellidoMaterno','Apellido materno',80],
                    ['telefono','Teléfono *',18],
                    ['correo','Correo electrónico *',180]
                  ] as const).map(([key,label,maxLength]) => (
                    <div key={key} className="min-w-0">
                      <label className="mb-1 block text-xs font-semibold text-brand-700">{label}</label>
                      <Input value={conyuge[key]} maxLength={maxLength}
                        type={key === 'correo' ? 'email' : 'text'}
                        onChange={e => actualizarConyuge(key,e.target.value)}
                        aria-invalid={conyugeErroresVisibles && !!erroresConyuge[key]}
                        className={conyugeErroresVisibles && erroresConyuge[key] ? 'border-red-500' : ''} />
                      {conyugeErroresVisibles && erroresConyuge[key] &&
                        <p role="alert" className="mt-1 text-xs text-red-600">{erroresConyuge[key]}</p>}
                    </div>
                  ))}
                  <div className="min-w-0">
                    <label className="mb-1 block text-xs font-semibold text-brand-700">Tipo de documento *</label>
                    <Select value={conyuge.tipoDocumento} onChange={e => setConyuge(c => ({
                      ...c, tipoDocumento:e.target.value as CrmDatosConyugeVenta['tipoDocumento'],
                      numeroDocumento: ''
                    }))}>
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de extranjería</option>
                      <option value="PASAPORTE">Pasaporte</option>
                      <option value="RUC">RUC</option>
                    </Select>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-brand-700">Número de documento *</label>
                    <Input value={conyuge.numeroDocumento}
                      maxLength={conyuge.tipoDocumento === 'DNI' ? 8
                        : conyuge.tipoDocumento === 'RUC' ? 11
                        : conyuge.tipoDocumento === 'CE' ? 12 : 20}
                      inputMode={conyuge.tipoDocumento === 'PASAPORTE' ? 'text' : 'numeric'}
                      onChange={e => actualizarConyuge('numeroDocumento',e.target.value)}
                      aria-invalid={conyugeErroresVisibles && !!erroresConyuge.numeroDocumento}
                      className={conyugeErroresVisibles && erroresConyuge.numeroDocumento ? 'border-red-500' : ''}/>
                    {conyugeErroresVisibles && erroresConyuge.numeroDocumento &&
                      <p role="alert" className="mt-1 text-xs text-red-600">{erroresConyuge.numeroDocumento}</p>}
                  </div>
                </div>
              </section>
            )}
            {campo('direccion', 'Dirección *', <Input required maxLength={255}
              placeholder="Dirección de domicilio" value={form.direccion}
              onChange={e => actualizar('direccion', e.target.value)}
              aria-invalid={enviado && !form.direccion.trim()}
              className={enviado && !form.direccion.trim() ? 'border-red-500' : ''}
            />, true)}
            <div className="min-w-0 sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-brand-700">
                Referencia del domicilio
              </label>
              <Input maxLength={255} placeholder="Referencia para ubicar el domicilio"
                value={referencia} onChange={e => setReferencia(e.target.value)} />
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-brand-700">País *</label>
              <Select value={geo.idPais ?? ''} required disabled={paises.length <= 1}
                onChange={e => {
                  const idPais = Number(e.target.value) || null;
                  setGeo({idPais,idDepartamento:null,idProvincia:null,idDistrito:null});
                  setDepartamentos([]);setProvincias([]);setDistritos([]);
                }}>
                <option value="">Selecciona un país</option>
                {paises.map(p => <option value={p.idUbicacion} key={p.idUbicacion}>{p.nombre}</option>)}
              </Select>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-brand-700">Departamento *</label>
              <Select required value={geo.idDepartamento ?? ''} disabled={!geo.idPais}
                aria-invalid={enviado && !geo.idDepartamento}
                onChange={e => {
                  setGeo(p => ({...p,idDepartamento:Number(e.target.value)||null,
                    idProvincia:null,idDistrito:null}));
                  setProvincias([]);setDistritos([]);
                }}>
                <option value="">Seleccionar departamento</option>
                {departamentos.map(d => <option value={d.idUbicacion} key={d.idUbicacion}>{d.nombre}</option>)}
              </Select>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-brand-700">Provincia *</label>
              <Select required value={geo.idProvincia ?? ''} disabled={!geo.idDepartamento}
                aria-invalid={enviado && !geo.idProvincia}
                onChange={e => {
                  setGeo(p => ({...p,idProvincia:Number(e.target.value)||null,idDistrito:null}));
                  setDistritos([]);
                }}>
                <option value="">{geo.idDepartamento ? 'Seleccionar provincia' : 'Primero selecciona departamento'}</option>
                {provincias.map(p => <option value={p.idUbicacion} key={p.idUbicacion}>{p.nombre}</option>)}
              </Select>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-brand-700">Distrito *</label>
              <Select required value={geo.idDistrito ?? ''} disabled={!geo.idProvincia}
                aria-invalid={enviado && !geo.idDistrito}
                onChange={e => setGeo(p => ({...p,idDistrito:Number(e.target.value)||null}))}>
                <option value="">{geo.idProvincia ? 'Seleccionar distrito' : 'Primero selecciona provincia'}</option>
                {distritos.map(d => <option value={d.idUbicacion} key={d.idUbicacion}>{d.nombre}</option>)}
              </Select>
            </div>
            {errorGeo && <p role="alert" className="text-xs text-red-600 sm:col-span-2">{errorGeo}</p>}
            {enviado && (!geo.idPais || !geo.idDepartamento || !geo.idProvincia ||
                !geo.idDistrito || !form.direccion.trim()) && (
              <p role="alert" className="text-xs font-semibold text-red-600 sm:col-span-2">
                Completa la dirección y su ubicación geográfica.
              </p>
            )}
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
