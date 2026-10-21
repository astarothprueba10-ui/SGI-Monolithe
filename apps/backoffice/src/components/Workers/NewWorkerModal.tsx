
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Input, Select, FieldLabel } from '../ui/Field';
import { Button } from '../ui/Button';
import { coreService } from '../../services/coreService';
import { ApiError } from '../../lib/apiClient';
import { GeoLocationSelector, type GeoLocationValue } from '../geo/GeoLocationSelector';

import type { CatalogosTrabajadorResponse } from '../../types/workers';

interface NewWorkerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Regex permitidos
const RE_SOLO_NOMBRE = /^[A-Za-z\u00C0-\u024F\s-]*$/;
const RE_SOLO_NUMEROS = /^\d*$/;
const RE_ALFANUMERICO = /^[A-Za-z0-9]*$/;
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TipoDoc = CatalogosTrabajadorResponse['tiposDocumento'][number];

function esTipoSoloNumerico(tipo: TipoDoc | undefined): boolean {
  if (!tipo) return false;
  const codigo = (tipo.codigo || '').toUpperCase();
  const nombre = (tipo.nombre || '').toLowerCase();
  if (codigo === 'DNI' || codigo === '01' || codigo === 'RUC' || codigo === '06') return true;
  if (codigo === 'CE' || codigo === '04' || nombre.includes('extranjer')) return true;
  return Boolean(tipo.soloNumerico);
}

function filtrarCaracteresDocumento(valor: string, soloNumerico: boolean): string {
  return soloNumerico ? valor.replace(/\D/g, '') : valor.replace(/[^A-Za-z0-9]/g, '');
}

function filtrarCaracteresNombre(valor: string): string {
  return valor.replace(/[^A-Za-z\u00C0-\u024F\s-]/g, '');
}

function filtrarTelefono(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 15);
}

function validarDocumento(valor: string, tipo: TipoDoc | undefined): string | undefined {
  if (!valor.trim()) return 'El numero de documento es obligatorio.';
  if (!tipo) return undefined;
  const doc = valor.trim();
  const soloNum = esTipoSoloNumerico(tipo);
  if (soloNum && !RE_SOLO_NUMEROS.test(doc)) {
    return `El documento ${tipo.nombre} solo admite digitos numericos.`;
  }
  if (!soloNum && !RE_ALFANUMERICO.test(doc)) {
    return `El documento ${tipo.nombre} solo admite letras y numeros, sin espacios.`;
  }
  if (tipo.longitudMinima !== null && doc.length < tipo.longitudMinima) {
    return `El documento debe tener al menos ${tipo.longitudMinima} caracteres.`;
  }
  if (tipo.longitudMaxima !== null && doc.length > tipo.longitudMaxima) {
    return `El documento no puede superar ${tipo.longitudMaxima} caracteres.`;
  }
  return undefined;
}

function validarNombreCampo(valor: string, etiqueta: string, requerido: boolean): string | undefined {
  if (requerido && !valor.trim()) return `${etiqueta} es obligatorio.`;
  if (valor.trim() && !RE_SOLO_NOMBRE.test(valor)) {
    return `${etiqueta} solo debe contener letras, tildes, \u00f1 y guiones.`;
  }
  return undefined;
}

function validarCorreo(valor: string): string | undefined {
  if (!valor.trim()) return undefined;
  if (!RE_CORREO.test(valor.trim())) {
    return 'Ingresa un correo valido (ej: persona@correo.com).';
  }
  return undefined;
}

function validarTelefono(valor: string): string | undefined {
  if (!valor.trim()) return undefined;
  if (!/^\d{7,15}$/.test(valor.trim())) {
    return 'El telefono debe contener entre 7 y 15 digitos.';
  }
  return undefined;
}

function FieldError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <p className="mt-1 text-xs text-rose-600">{mensaje}</p>;
}

function estadoInicial() {
  return {
    idTipoDocumento: '',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    correoElectronico: '',
    telefono: '',
    direccion: '',
    referencia: '',
    idPais: null as number | null,
    pais: '',
    idDepartamento: null as number | null,
    codigoDepartamento: '',
    departamento: '',
    idProvincia: null as number | null,
    codigoProvincia: '',
    provincia: '',
    idDistrito: null as number | null,
    codigoDistrito: '',
    distrito: '',
    idArea: '',
    idCargo: '',
    idHorario: '',
    idTipoVinculoLaboral: '',
    fechaIngreso: '',
    observaciones: ''
  };
}

type FormState = ReturnType<typeof estadoInicial>;
type FormKey = keyof FormState;
type FormErrors = Partial<Record<FormKey, string>>;
type TouchedFields = Partial<Record<FormKey, boolean>>;

function validarUbicacion(form: FormState, errores: FormErrors): void {
  if (!form.idPais || !form.pais.trim()) errores.pais = 'El pais es obligatorio.';
  if (!form.idDepartamento || !form.departamento.trim()) {
    errores.departamento = 'El departamento es obligatorio.';
  }
  if (!form.idProvincia || !form.provincia.trim()) {
    errores.provincia = 'La provincia es obligatoria.';
  }
  if (!form.idDistrito || !form.distrito.trim()) {
    errores.distrito = 'El distrito es obligatorio.';
  }
}

function validarSeccionPersonal(
  form: FormState,
  catalogos: CatalogosTrabajadorResponse,
  errores: FormErrors
): void {
  const tipo = catalogos.tiposDocumento.find((t) => String(t.idTipoDocumento) === form.idTipoDocumento);
  if (!form.idTipoDocumento) errores.idTipoDocumento = 'Selecciona el tipo de documento.';
  const errDoc = validarDocumento(form.numeroDocumento, tipo);
  if (errDoc) errores.numeroDocumento = errDoc;
  const errNom = validarNombreCampo(form.nombres, 'Los nombres', true);
  if (errNom) errores.nombres = errNom;
  const errPat = validarNombreCampo(form.apellidoPaterno, 'El apellido paterno', false);
  if (errPat) errores.apellidoPaterno = errPat;
  const errMat = validarNombreCampo(form.apellidoMaterno, 'El apellido materno', false);
  if (errMat) errores.apellidoMaterno = errMat;
  const errCorreo = validarCorreo(form.correoElectronico);
  if (errCorreo) errores.correoElectronico = errCorreo;
  const errTel = validarTelefono(form.telefono);
  if (errTel) errores.telefono = errTel;
  if (!form.direccion.trim()) errores.direccion = 'La direccion es obligatoria.';
  validarUbicacion(form, errores);
}

function validarSeccionLaboral(form: FormState, errores: FormErrors): void {
  if (!form.idArea) errores.idArea = 'Selecciona un area.';
  if (!form.idCargo) errores.idCargo = 'Selecciona un cargo.';
  if (!form.idTipoVinculoLaboral) {
    errores.idTipoVinculoLaboral = 'Selecciona el tipo de vinculo laboral.';
  }
  if (!form.fechaIngreso) errores.fechaIngreso = 'La fecha de ingreso es obligatoria.';
  if (form.fechaNacimiento) {
    const hoy = new Date().toISOString().split('T')[0];
    if (form.fechaNacimiento > hoy) {
      errores.fechaNacimiento = 'La fecha de nacimiento no puede ser futura.';
    }
  }
}

function validar(
  form: FormState,
  catalogos: CatalogosTrabajadorResponse
): FormErrors {
  const errores: FormErrors = {};
  validarSeccionPersonal(form, catalogos, errores);
  validarSeccionLaboral(form, errores);
  return errores;
}

// Mensaje de error legible segun el codigo HTTP / mensaje del backend
function mensajeDeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return `Conflicto de datos: ${err.message}`;
    }
    if (err.status === 403) {
      return 'No tienes permiso para registrar trabajadores.';
    }
    return err.message || `Error ${err.status} al registrar el trabajador.`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Ocurrio un error inesperado al registrar el trabajador.';
}

export function NewWorkerModal({
  open,
  onClose,
  onSuccess
}: NewWorkerModalProps) {

  const [catalogos, setCatalogos] =
    useState<CatalogosTrabajadorResponse | null>(null);

  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(estadoInicial());
  const [errores, setErrores] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitting, setSubmitting] = useState(false);
  const hoyRef = useRef(new Date().toISOString().split('T')[0]);

  // Cargar catalogos al abrir
  useEffect(() => {
    if (!open) return;

    let activo = true;

    async function cargarCatalogos() {
      setLoadingCatalogos(true);
      setErrorCatalogos(null);

      try {
        const resultado = await coreService.getWorkerCatalogs();
        if (activo) {
          setCatalogos(resultado);
        }
      } catch (err) {
        if (activo) {
          setErrorCatalogos(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los catalogos.'
          );
        }
      } finally {
        if (activo) {
          setLoadingCatalogos(false);
        }
      }
    }

    void cargarCatalogos();

    return () => {
      activo = false;
    };
  }, [open]);

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!open) {
      setForm(estadoInicial());
      setErrores({});
      setTouched({});
    }
  }, [open]);

  const tipoDocSeleccionado = catalogos?.tiposDocumento.find(
    (t) => String(t.idTipoDocumento) === form.idTipoDocumento
  );

  const cargosDisponibles =
    catalogos?.cargos.filter(
      (c) => String(c.idArea) === form.idArea
    ) ?? [];

  // Setter con validacion opcional inmediata
  function actualizarCampo<K extends FormKey>(
    key: K,
    valor: FormState[K],
    errorInmediato?: string | undefined
  ) {
    setForm((prev) => ({ ...prev, [key]: valor }));
    if (touched[key] || errorInmediato !== undefined) {
      setErrores((prev) => ({ ...prev, [key]: errorInmediato }));
    }
  }

  function marcarTocado(key: FormKey, errorBlur?: string | undefined) {
    setTouched((prev) => ({ ...prev, [key]: true }));
    setErrores((prev) => ({ ...prev, [key]: errorBlur }));
  }

  function handleTipoDocumentoChange(valor: string) {
    setForm((prev) => ({ ...prev, idTipoDocumento: valor, numeroDocumento: '' }));
    setErrores((prev) => ({
      ...prev,
      idTipoDocumento: valor ? undefined : 'Selecciona el tipo de documento.',
      numeroDocumento: undefined
    }));
    setTouched((prev) => ({ ...prev, numeroDocumento: false }));
  }

  function handleNumeroDocumentoChange(raw: string) {
    if (!tipoDocSeleccionado) return;
    const soloNum = esTipoSoloNumerico(tipoDocSeleccionado);
    const filtrado = filtrarCaracteresDocumento(raw, soloNum);
    actualizarCampo(
      'numeroDocumento', filtrado,
      touched.numeroDocumento ? validarDocumento(filtrado, tipoDocSeleccionado) : undefined
    );
  }

  function handleNombreChange(
    key: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno',
    raw: string
  ) {
    const filtrado = filtrarCaracteresNombre(raw);
    const esNom = key === 'nombres';
    const etiqueta = esNom ? 'Los nombres' : 'El apellido';
    actualizarCampo(
      key, filtrado,
      touched[key] ? validarNombreCampo(filtrado, etiqueta, esNom) : undefined
    );
  }

  function handleAreaChange(valor: string) {
    setForm((prev) => ({ ...prev, idArea: valor, idCargo: '' }));
    setErrores((prev) => ({
      ...prev,
      idArea: valor ? undefined : 'Selecciona un area.',
      idCargo: undefined
    }));
  }

  function handleGeoChange(geo: GeoLocationValue) {
    setForm((prev) => ({
      ...prev,
      idPais: geo.idPais ?? null,
      pais: geo.pais ?? '',
      idDepartamento: geo.idDepartamento ?? null,
      codigoDepartamento: geo.codigoDepartamento ?? '',
      departamento: geo.departamento ?? '',
      idProvincia: geo.idProvincia ?? null,
      codigoProvincia: geo.codigoProvincia ?? '',
      provincia: geo.provincia ?? '',
      idDistrito: geo.idDistrito ?? null,
      codigoDistrito: geo.codigoDistrito ?? '',
      distrito: geo.distrito ?? ''
    }));
    setErrores((prev) => ({
      ...prev,
      pais: geo.idPais ? undefined : prev.pais,
      departamento: geo.idDepartamento ? undefined : prev.departamento,
      provincia: geo.idProvincia ? undefined : prev.provincia,
      distrito: geo.idDistrito ? undefined : prev.distrito
    }));
  }

  function handleGeoBlur(field: 'pais' | 'departamento' | 'provincia' | 'distrito') {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errMap: Record<string, string | undefined> = {
      pais: !form.idPais ? 'El pais es obligatorio.' : undefined,
      departamento: !form.idDepartamento ? 'El departamento es obligatorio.' : undefined,
      provincia: !form.idProvincia ? 'La provincia es obligatoria.' : undefined,
      distrito: !form.idDistrito ? 'El distrito es obligatorio.' : undefined
    };
    setErrores((prev) => ({ ...prev, [field]: errMap[field] }));
  }

  function construirPayloadTrabajador(): Record<string, unknown> {
    return {
      informacionPersonal: {
        idTipoDocumento: Number(form.idTipoDocumento),
        numeroDocumento: form.numeroDocumento.trim(),
        nombres: form.nombres.trim(),
        apellidoPaterno: form.apellidoPaterno.trim() || null,
        apellidoMaterno: form.apellidoMaterno.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        correoElectronico: form.correoElectronico.trim() || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim(),
        referencia: form.referencia.trim() || null,
        departamento: form.departamento.trim(),
        provincia: form.provincia.trim(),
        distrito: form.distrito.trim()
      },
      informacionLaboral: {
        idCargo: Number(form.idCargo),
        idHorario: form.idHorario ? Number(form.idHorario) : null,
        idTipoVinculoLaboral: Number(form.idTipoVinculoLaboral),
        fechaIngreso: form.fechaIngreso,
        observaciones: form.observaciones.trim() || null
      }
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catalogos) return;
    const todosTocados: TouchedFields = {};
    (Object.keys(estadoInicial()) as FormKey[]).forEach((k) => { todosTocados[k] = true; });
    setTouched(todosTocados);
    const nuevosErrores = validar(form, catalogos);
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      toast.error('Revisa los campos antes de continuar.');
      return;
    }
    setSubmitting(true);
    try {
      await coreService.createWorker(construirPayloadTrabajador());
      toast.success('Trabajador registrado', {
        description: 'El trabajador fue registrado correctamente.'
      });
      setForm(estadoInicial());
      setErrores({});
      setTouched({});
      onClose();
      onSuccess();
    } catch (err) {
      const msg = mensajeDeError(err);
      const esConflicto = err instanceof ApiError && err.status === 409;
      toast.error(
        esConflicto ? 'Conflicto al registrar el trabajador' : 'No se pudo registrar el trabajador',
        { description: msg }
      );
    } finally {
      setSubmitting(false);
    }
  }

  const hoy = hoyRef.current;
  const soloNumDoc = esTipoSoloNumerico(tipoDocSeleccionado);
  const docMaxLength = tipoDocSeleccionado?.longitudMaxima ?? undefined;
  const docInputMode: React.InputHTMLAttributes<HTMLInputElement>['inputMode'] =
    soloNumDoc ? 'numeric' : 'text';

  return (
    <Modal
      open={open}
      onClose={submitting ? () => { } : onClose}
      title="Nuevo trabajador"
      description="Completa la informacion personal y laboral del trabajador."
      width="max-w-3xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || loadingCatalogos || Boolean(errorCatalogos)}
          >
            {submitting ? 'Guardando...' : 'Guardar trabajador'}
          </Button>
        </div>
      }
    >
      {loadingCatalogos ? (
        <p className="py-8 text-center text-brand-500">
          Cargando catalogos...
        </p>
      ) : errorCatalogos ? (
        <p className="py-6 text-center text-rose-700">
          {errorCatalogos}
        </p>
      ) : catalogos ? (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECCION: Informacion personal                     */}
          <section>
            <h3 className="mb-4 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
              Informacion personal
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Tipo de documento */}
              <div>
                <FieldLabel htmlFor="idTipoDocumento">
                  Tipo de documento *
                </FieldLabel>
                <Select
                  id="idTipoDocumento"
                  value={form.idTipoDocumento}
                  onChange={(e) => handleTipoDocumentoChange(e.target.value)}
                  onBlur={() =>
                    marcarTocado(
                      'idTipoDocumento',
                      !form.idTipoDocumento ? 'Selecciona el tipo de documento.' : undefined
                    )
                  }
                  disabled={submitting}
                >
                  <option value="">Seleccionar tipo</option>
                  {catalogos.tiposDocumento.map((tipo) => (
                    <option key={tipo.idTipoDocumento} value={tipo.idTipoDocumento}>
                      {tipo.nombre}
                    </option>
                  ))}
                </Select>
                <FieldError mensaje={errores.idTipoDocumento} />
              </div>

              {/* Numero de documento */}
              <div>
                <FieldLabel htmlFor="numeroDocumento">
                  Numero de documento *
                  {docMaxLength && (
                    <span className="ml-1 font-normal text-brand-400">
                      (max. {docMaxLength})
                    </span>
                  )}
                </FieldLabel>
                <Input
                  id="numeroDocumento"
                  value={form.numeroDocumento}
                  onChange={(e) => handleNumeroDocumentoChange(e.target.value)}
                  onBlur={() =>
                    marcarTocado(
                      'numeroDocumento',
                      validarDocumento(form.numeroDocumento, tipoDocSeleccionado)
                    )
                  }
                  placeholder={
                    tipoDocSeleccionado
                      ? tipoDocSeleccionado.soloNumerico
                        ? 'Solo digitos numericos'
                        : 'Letras y numeros'
                      : 'Selecciona el tipo primero'
                  }
                  autoComplete="off"
                  disabled={submitting || !form.idTipoDocumento}
                  maxLength={docMaxLength}
                  inputMode={docInputMode}
                />
                <FieldError mensaje={errores.numeroDocumento} />
              </div>

              {/* Nombres */}
              <div>
                <FieldLabel htmlFor="nombres">Nombres *</FieldLabel>
                <Input
                  id="nombres"
                  value={form.nombres}
                  onChange={(e) => handleNombreChange('nombres', e.target.value)}
                  onBlur={() =>
                    marcarTocado('nombres', validarNombreCampo(form.nombres, 'Los nombres', true))
                  }
                  placeholder="Nombres completos"
                  disabled={submitting}
                />
                <FieldError mensaje={errores.nombres} />
              </div>

              {/* Apellido paterno */}
              <div>
                <FieldLabel htmlFor="apellidoPaterno">
                  Apellido paterno
                </FieldLabel>
                <Input
                  id="apellidoPaterno"
                  value={form.apellidoPaterno}
                  onChange={(e) => handleNombreChange('apellidoPaterno', e.target.value)}
                  onBlur={() =>
                    marcarTocado('apellidoPaterno', validarNombreCampo(form.apellidoPaterno, 'El apellido paterno', false))
                  }
                  placeholder="Apellido paterno"
                  disabled={submitting}
                />
                <FieldError mensaje={errores.apellidoPaterno} />
              </div>

              {/* Apellido materno */}
              <div>
                <FieldLabel htmlFor="apellidoMaterno">
                  Apellido materno
                </FieldLabel>
                <Input
                  id="apellidoMaterno"
                  value={form.apellidoMaterno}
                  onChange={(e) => handleNombreChange('apellidoMaterno', e.target.value)}
                  onBlur={() =>
                    marcarTocado('apellidoMaterno', validarNombreCampo(form.apellidoMaterno, 'El apellido materno', false))
                  }
                  placeholder="Apellido materno"
                  disabled={submitting}
                />
                <FieldError mensaje={errores.apellidoMaterno} />
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <FieldLabel htmlFor="fechaNacimiento">Fecha de nacimiento</FieldLabel>
                <Input
                  id="fechaNacimiento"
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => {
                    const v = e.target.value;
                    actualizarCampo(
                      'fechaNacimiento', v,
                      v && v > hoy ? 'La fecha de nacimiento no puede ser futura.' : undefined
                    );
                  }}
                  onBlur={() =>
                    marcarTocado(
                      'fechaNacimiento',
                      form.fechaNacimiento && form.fechaNacimiento > hoy
                        ? 'La fecha de nacimiento no puede ser futura.'
                        : undefined
                    )
                  }
                  max={hoy}
                  disabled={submitting}
                />
                <FieldError mensaje={errores.fechaNacimiento} />
              </div>

              {/* Correo electronico */}
              <div>
                <FieldLabel htmlFor="correoElectronico">Correo electronico</FieldLabel>
                <Input
                  id="correoElectronico"
                  type="email"
                  value={form.correoElectronico}
                  onChange={(e) => {
                    const v = e.target.value;
                    actualizarCampo(
                      'correoElectronico', v,
                      touched.correoElectronico ? validarCorreo(v) : undefined
                    );
                  }}
                  onBlur={() =>
                    marcarTocado('correoElectronico', validarCorreo(form.correoElectronico))
                  }
                  placeholder="persona@correo.com"
                  autoComplete="email"
                  disabled={submitting}
                />
                {!touched.correoElectronico && form.correoElectronico && (
                  <p className="mt-1 text-[11px] text-brand-400">
                    Ejemplo: persona@empresa.pe
                  </p>
                )}
                <FieldError mensaje={errores.correoElectronico} />
              </div>

              {/* Telefono — solo digitos */}
              <div>
                <FieldLabel htmlFor="telefono">Telefono</FieldLabel>
                <Input
                  id="telefono"
                  type="text"
                  inputMode="numeric"
                  value={form.telefono}
                  onChange={(e) => actualizarCampo('telefono', filtrarTelefono(e.target.value))}
                  onBlur={() => marcarTocado('telefono')}
                  placeholder="Solo digitos (ej: 999888777)"
                  autoComplete="tel"
                  disabled={submitting}
                />
                <FieldError mensaje={errores.telefono} />
              </div>

              {/* Direccion — 2 columnas */}
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="direccion">Direccion *</FieldLabel>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => actualizarCampo(
                    'direccion', e.target.value,
                    touched.direccion && !e.target.value.trim()
                      ? 'La direccion es obligatoria.' : undefined
                  )}
                  onBlur={() =>
                    marcarTocado(
                      'direccion',
                      !form.direccion.trim() ? 'La direccion es obligatoria.' : undefined
                    )
                  }
                  placeholder="Direccion de domicilio"
                  autoComplete="street-address"
                  disabled={submitting}
                />
                <FieldError mensaje={errores.direccion} />
              </div>

              {/* Referencia — 2 columnas */}
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="referencia">Referencia del domicilio</FieldLabel>
                <Input
                  id="referencia"
                  value={form.referencia}
                  onChange={(e) => actualizarCampo('referencia', e.target.value)}
                  placeholder="Referencia para ubicar el domicilio"
                  disabled={submitting}
                />
              </div>

              {/* Selector geografico oficial */}
              <div className="sm:col-span-2">
                <GeoLocationSelector
                  value={{
                    idPais: form.idPais,
                    pais: form.pais,
                    idDepartamento: form.idDepartamento,
                    codigoDepartamento: form.codigoDepartamento,
                    departamento: form.departamento,
                    idProvincia: form.idProvincia,
                    codigoProvincia: form.codigoProvincia,
                    provincia: form.provincia,
                    idDistrito: form.idDistrito,
                    codigoDistrito: form.codigoDistrito,
                    distrito: form.distrito
                  }}
                  onChange={handleGeoChange}
                  disabled={submitting}
                  errors={{
                    pais: touched.pais ? errores.pais : undefined,
                    departamento: touched.departamento ? errores.departamento : undefined,
                    provincia: touched.provincia ? errores.provincia : undefined,
                    distrito: touched.distrito ? errores.distrito : undefined
                  }}
                  onBlurField={handleGeoBlur}
                />
              </div>

            </div>
          </section>

          {/* Informacion laboral */}
          <section>
            <h3 className="mb-4 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
              Informacion laboral
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* Area */}
              <div>
                <FieldLabel htmlFor="idArea">Area *</FieldLabel>
                <Select
                  id="idArea"
                  value={form.idArea}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  onBlur={() =>
                    marcarTocado('idArea', !form.idArea ? 'Selecciona un area.' : undefined)
                  }
                  disabled={submitting}
                >
                  <option value="">Seleccionar area</option>
                  {catalogos.areas.map((area) => (
                    <option key={area.idArea} value={area.idArea}>
                      {area.nombre}
                    </option>
                  ))}
                </Select>
                <FieldError mensaje={errores.idArea} />
              </div>

              {/* Cargo */}
              <div>
                <FieldLabel htmlFor="idCargo">Cargo *</FieldLabel>
                <Select
                  id="idCargo"
                  value={form.idCargo}
                  onChange={(e) => actualizarCampo(
                    'idCargo', e.target.value,
                    touched.idCargo && !e.target.value ? 'Selecciona un cargo.' : undefined
                  )}
                  onBlur={() =>
                    marcarTocado('idCargo', !form.idCargo ? 'Selecciona un cargo.' : undefined)
                  }
                  disabled={submitting || !form.idArea}
                >
                  <option value="">
                    {form.idArea ? 'Seleccionar cargo' : 'Selecciona un area primero'}
                  </option>
                  {cargosDisponibles.map((cargo) => (
                    <option key={cargo.idCargo} value={cargo.idCargo}>
                      {cargo.nombre}
                    </option>
                  ))}
                </Select>
                <FieldError mensaje={errores.idCargo} />
              </div>

              {/* Tipo de vinculo laboral */}
              <div>
                <FieldLabel htmlFor="idTipoVinculoLaboral">
                  Tipo de vinculo laboral *
                </FieldLabel>
                <Select
                  id="idTipoVinculoLaboral"
                  value={form.idTipoVinculoLaboral}
                  onChange={(e) => actualizarCampo(
                    'idTipoVinculoLaboral', e.target.value,
                    touched.idTipoVinculoLaboral && !e.target.value
                      ? 'Selecciona el tipo de vinculo laboral.' : undefined
                  )}
                  onBlur={() =>
                    marcarTocado(
                      'idTipoVinculoLaboral',
                      !form.idTipoVinculoLaboral
                        ? 'Selecciona el tipo de vinculo laboral.' : undefined
                    )
                  }
                  disabled={submitting}
                >
                  <option value="">Seleccionar vinculo</option>
                  {catalogos.tiposVinculoLaboral.map((v) => (
                    <option key={v.idTipoVinculoLaboral} value={v.idTipoVinculoLaboral}>
                      {v.nombre}
                    </option>
                  ))}
                </Select>
                <FieldError mensaje={errores.idTipoVinculoLaboral} />
              </div>

              {/* Horario */}
              <div>
                <FieldLabel htmlFor="idHorario">Horario laboral</FieldLabel>
                <Select
                  id="idHorario"
                  value={form.idHorario}
                  onChange={(e) => actualizarCampo('idHorario', e.target.value)}
                  disabled={submitting || catalogos.horarios.length === 0}
                >
                  <option value="">
                    {catalogos.horarios.length === 0 ? 'Sin asignar' : 'Seleccionar horario'}
                  </option>
                  {catalogos.horarios.map((h) => (
                    <option key={h.idHorario} value={h.idHorario}>
                      {h.nombre}
                    </option>
                  ))}
                </Select>
                {catalogos.horarios.length === 0 && (
                  <p className="mt-1 text-[11px] text-brand-400">
                    No hay horarios configurados. Se registrara sin horario.
                  </p>
                )}
              </div>

              {/* Fecha de ingreso */}
              <div>
                <FieldLabel htmlFor="fechaIngreso">Fecha de ingreso *</FieldLabel>
                <Input
                  id="fechaIngreso"
                  type="date"
                  value={form.fechaIngreso}
                  onChange={(e) => actualizarCampo(
                    'fechaIngreso', e.target.value,
                    touched.fechaIngreso && !e.target.value
                      ? 'La fecha de ingreso es obligatoria.' : undefined
                  )}
                  onBlur={() =>
                    marcarTocado(
                      'fechaIngreso',
                      !form.fechaIngreso ? 'La fecha de ingreso es obligatoria.' : undefined
                    )
                  }
                  disabled={submitting}
                />
                <FieldError mensaje={errores.fechaIngreso} />
              </div>

              {/* Observaciones — 2 columnas */}
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="observaciones">Observaciones</FieldLabel>
                <textarea
                  id="observaciones"
                  value={form.observaciones}
                  onChange={(e) => actualizarCampo('observaciones', e.target.value)}
                  placeholder="Observaciones adicionales (opcional)"
                  disabled={submitting}
                  rows={3}
                  className="h-auto w-full resize-none rounded-md border border-brand-200 bg-white px-3 py-2 text-[13px] text-brand-800 placeholder:text-brand-300 transition-colors duration-150 ease-smooth hover:border-brand-300 focus:border-brand-500 focus:outline-none"
                />
              </div>

            </div>
          </section>

        </form>
      ) : null}
    </Modal>
  );
}
