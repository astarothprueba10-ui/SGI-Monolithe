import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { useAuth } from '../../contexts/AuthContext';
import {
  securityApi,
  type AvailablePerson,
  type SecurityRole,
  type SecurityUser
} from '../../services/securityApi';
import {
  CODIGO_ROL_CLIENTE,
  alternarRolSeleccionado,
  correoPrincipalValido,
  debeMostrarAdvertenciaCorreoFaltante,
  evaluarRolesIniciales,
  personaElegibleParaSeleccion,
  personasUnicasPorId,
  puedeAsignarRolesInternosProtegidos
} from './createUserPolicy';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  roles: SecurityRole[];
  onSuccess: () => Promise<void>;
  user?: SecurityUser | null;
}

function buscarPersona(persona: AvailablePerson, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    persona.nombres.toLowerCase().includes(lower) ||
    (persona.apellidoPaterno ?? '').toLowerCase().includes(lower) ||
    (persona.apellidoMaterno ?? '').toLowerCase().includes(lower) ||
    persona.nombreCompleto.toLowerCase().includes(lower) ||
    (persona.correo ?? '').toLowerCase().includes(lower)
  );
}

function tieneRolCliente(user: SecurityUser): boolean {
  return user.roles.some((r) => r.codigo === CODIGO_ROL_CLIENTE);
}

function extraerPrefijo(usuarioLogin: string): string {
  return usuarioLogin;
}

async function ejecutarFlujoCreacion(
  idPersona: number,
  usuarioLogin: string,
  codigosRol: string[]
): Promise<void> {
  const creado = await securityApi.crearUsuario({
    idPersona,
    usuarioLogin,
    codigosRol
  });

  if (creado.estado !== 'CREADO' || !creado.idUsuario) {
    throw new Error(creado.mensaje || 'No se pudo crear la cuenta y asignar sus roles.');
  }

  const idUsuario = creado.idUsuario;

  try {
    await securityApi.activarUsuario(idUsuario);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al activar usuario.';
    throw new Error(`CREAR_ROL_OK_ACT_FAIL:${msg}`);
  }
}

async function ejecutarFlujoEdicion(
  user: SecurityUser,
  nuevoLogin: string,
  nuevoRol: string
): Promise<void> {
  const loginActual = user.usuarioLogin.toLowerCase().trim();
  const loginNuevo = nuevoLogin.toLowerCase().trim();
  const rolActual = user.roles[0]?.codigo ?? '';

  if (loginNuevo !== loginActual) {
    const r = await securityApi.actualizarUsuario(user.idUsuario, loginNuevo);
    if (r.estado !== 'ACTUALIZADO') {
      throw new Error(`LOGIN_FAIL:${r.mensaje}`);
    }
  }

  if (nuevoRol && nuevoRol !== rolActual) {
    if (!rolActual) {
      throw new Error(
        'ROL_FAIL:El usuario no posee un rol actual que pueda ser reemplazado.'
      );
    }

    const r = await securityApi.reemplazarRol(
      user.idUsuario,
      rolActual,
      nuevoRol
    );

    if (r.estado !== 'ACTUALIZADO') {
      throw new Error(`ROL_FAIL:${r.mensaje}`);
    }
  }
}

export function CreateUserModal({
  open,
  onClose,
  roles,
  onSuccess,
  user = null
}: CreateUserModalProps) {
  const modoEdicion = Boolean(user);
  const { user: usuarioActual, permissions } = useAuth();
  const puedeAsignarRolesProtegidos = puedeAsignarRolesInternosProtegidos(
    usuarioActual.roles,
    permissions
  );

  const [personas, setPersonas] = useState<AvailablePerson[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [selectorPersonaAbierto, setSelectorPersonaAbierto] = useState(false);
  const [idPersona, setIdPersona] = useState<number | ''>('');
  const [usuarioLocal, setUsuarioLocal] = useState('');
  const [codigoRol, setCodigoRol] = useState('');
  const [codigosRoles, setCodigosRoles] = useState<string[]>([]);
  const [rolesMenuOpen, setRolesMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setRolesMenuOpen(false);
      return;
    }

    if (modoEdicion && user) {
      setIdPersona(user.idPersona);
      setBusqueda(user.nombreCompleto);
      setUsuarioLocal(extraerPrefijo(user.usuarioLogin));
      setCodigoRol(user.roles[0]?.codigo ?? '');
      setCodigosRoles(user.roles.map((r) => r.codigo));
      return;
    }

    setLoadingPersonas(true);
    securityApi.listarPersonasDisponibles()
      .then(setPersonas)
      .catch(() => toast.error('No se pudieron cargar las personas disponibles'))
      .finally(() => setLoadingPersonas(false));
  }, [open, modoEdicion, user]);

  const limpiarFormulario = () => {
    setBusqueda('');
    setSelectorPersonaAbierto(false);
    setIdPersona('');
    setUsuarioLocal('');
    setCodigoRol('');
    setCodigosRoles([]);
    setRolesMenuOpen(false);
  };

  const personasUnicas = useMemo(
    () => personasUnicasPorId(personas),
    [personas]
  );

  const personasFiltradas = useMemo(
    () => personasUnicas.filter((p) => buscarPersona(p, busqueda)),
    [personasUnicas, busqueda]
  );

  const personaSeleccionada = modoEdicion
    ? null
    : personasUnicas.find((p) => p.idPersona === Number(idPersona));

  const esElegible = modoEdicion
    ? true
    : Boolean(personaSeleccionada?.elegible);

  const relaciones = personaSeleccionada?.relaciones ?? [];
  const politicaRoles = evaluarRolesIniciales(
    relaciones,
    codigosRoles,
    roles,
    puedeAsignarRolesProtegidos
  );
  const {
    esTrabajador,
    esCliente,
    relacionesValidas,
    rolesInternosDisponibles,
    rolesInternosSeleccionados,
    rolClienteDisponible,
    codigosRolesEfectivos
  } = politicaRoles;
  const esClienteEnEdicion = modoEdicion && user ? tieneRolCliente(user) : false;

  const loginDerivado = personaSeleccionada?.numeroDocumento ?? '';

  const correoEfectivo = modoEdicion ? user?.correo ?? '' : personaSeleccionada?.correo ?? '';
  const correoValido = correoPrincipalValido(correoEfectivo);

  const rolSeleccionadoValido =
    modoEdicion
      ? esClienteEnEdicion || Boolean(codigoRol)
      : politicaRoles.rolesValidos;

  const alternarRolInterno = (codigo: string) => {
    setCodigosRoles((seleccionados) => alternarRolSeleccionado(seleccionados, codigo));
  };

  const cambiarPersona = (persona: AvailablePerson) => {
    if (!personaElegibleParaSeleccion(persona)) return;

    setIdPersona(persona.idPersona);
    setBusqueda(persona.nombreCompleto);
    setCodigosRoles([]);
    setSelectorPersonaAbierto(false);
    setRolesMenuOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modoEdicion && (!idPersona || !esElegible)) {
      toast.error('Selecciona una persona elegible.');
      return;
    }

    if (!modoEdicion && !relacionesValidas) {
      toast.error('No se pudieron confirmar las relaciones de la persona desde el backend.');
      return;
    }

    if (!modoEdicion && !loginDerivado) {
      toast.error('No se pudo obtener el documento principal de la persona seleccionada.');
      return;
    }

    const loginEfectivo = modoEdicion
      ? usuarioLocal.trim().toLowerCase()
      : loginDerivado;

    if (modoEdicion && (!/^[a-z0-9._-]{3,120}$/.test(loginEfectivo) || !rolSeleccionadoValido)) {
      toast.error('Por favor completa todos los campos requeridos con valores validos.');
      return;
    }

    if (!modoEdicion && (!rolSeleccionadoValido || !correoValido)) {
      toast.error('Verifica que la persona tenga un correo principal activo válido y selecciona los roles requeridos.');
      return;
    }

    setSubmitting(true);

    try {
      if (modoEdicion && user) {
        await ejecutarFlujoEdicion(
          user,
          loginEfectivo,
          esClienteEnEdicion ? CODIGO_ROL_CLIENTE : codigoRol
        );
        toast.success('Usuario actualizado', {
          description: 'Los cambios se guardaron correctamente.'
        });
      } else {
        await ejecutarFlujoCreacion(
          Number(idPersona),
          loginEfectivo,
          codigosRolesEfectivos
        );
        toast.success('Usuario creado y activado', {
          description: 'Las credenciales temporales fueron enviadas al correo registrado.'
        });
      }

      limpiarFormulario();
      onClose();
      await onSuccess();
    } catch (error) {
      await onSuccess();
      const rawMsg = error instanceof Error ? error.message : 'Ocurrio un error inesperado.';

      if (rawMsg.startsWith('LOGIN_FAIL:')) {
        toast.error('No se pudo actualizar el usuario', {
          description: rawMsg.replace('LOGIN_FAIL:', '')
        });
      } else if (rawMsg.startsWith('ROL_FAIL:')) {
        toast.error('No se pudo actualizar el rol', {
          description: rawMsg.replace('ROL_FAIL:', '')
        });
      } else if (rawMsg.startsWith('CREAR_ROL_OK_ACT_FAIL:')) {
        toast.error('La cuenta fue creada, pero no pudo activarse.', {
          description: rawMsg.replace('CREAR_ROL_OK_ACT_FAIL:', '')
        });
      } else {
        toast.error(
          modoEdicion ? 'No se pudo actualizar el usuario' : 'No se pudo crear el usuario',
          { description: rawMsg }
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const puedeEnviar = !submitting &&
    (modoEdicion || Boolean(idPersona)) &&
    esElegible &&
    (modoEdicion ? /^[a-z0-9._-]{3,120}$/.test(usuarioLocal.trim()) : relacionesValidas) &&
    rolSeleccionadoValido &&
    (modoEdicion || correoValido);

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}
      description={
        modoEdicion
          ? 'Actualiza la informacion de la cuenta seleccionada.'
          : 'Registra una nueva cuenta de usuario y asigna sus roles iniciales.'
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!puedeEnviar}
          >
            {submitting
              ? modoEdicion ? 'Guardando...' : 'Creando...'
              : modoEdicion ? 'Guardar cambios' : 'Crear y activar'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Persona vinculada */}
        <div className="relative">
          <FieldLabel htmlFor="personaSearch">
            Persona vinculada *
          </FieldLabel>

          {modoEdicion ? (
            <div className="flex h-9 items-center rounded-md border border-brand-200 bg-brand-50 px-3 text-[13px] text-brand-600">
              {user?.nombreCompleto ?? ''}
            </div>
          ) : loadingPersonas ? (
            <div className="py-2 text-xs text-brand-400">
              Cargando personas disponibles...
            </div>
          ) : (
            <div className="relative">
              <Input
                id="personaSearch"
                value={
                  idPersona
                    ? personaSeleccionada?.nombreCompleto ?? ''
                    : busqueda
                }
                onFocus={() => setSelectorPersonaAbierto(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    setSelectorPersonaAbierto(false);
                  }, 150);
                }}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setIdPersona('');
                  setSelectorPersonaAbierto(true);
                }}
                placeholder="Buscar por nombre, apellido o correo..."
                disabled={submitting}
                autoComplete="off"
              />

              {selectorPersonaAbierto && (
                <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-brand-200 bg-white shadow-lg">
                  {personasFiltradas.length > 0 ? (
                    personasFiltradas.map((p) => {
                      const relacionesPersona = p.relaciones ?? [];
                      const personaSeleccionable = personaElegibleParaSeleccion(p);
                      const tieneRelacionConocida = relacionesPersona.some((relacion) =>
                        relacion === 'TRABAJADOR' || relacion === 'CLIENTE'
                      );

                      return (
                      <button
                        key={p.idPersona}
                        type="button"
                        disabled={!personaSeleccionable}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => cambiarPersona(p)}
                        className={[
                          'flex w-full flex-col px-3 py-2 text-left transition-colors',
                          personaSeleccionable
                            ? 'hover:bg-brand-50'
                            : 'cursor-not-allowed bg-slate-50 opacity-50'
                        ].join(' ')}
                      >
                        <span className="text-[13px] font-medium text-brand-800">
                          {p.nombreCompleto}
                        </span>

                        {p.correo && (
                          <span className="text-[11px] text-brand-400">
                            {p.correo}
                          </span>
                        )}

                        {p.tipoDocumento && p.numeroDocumento && (
                          <span className="text-[11px] text-brand-500">
                            {p.tipoDocumento}: {p.numeroDocumento}
                          </span>
                        )}

                        <span className="text-[11px] text-brand-500">
                          {tieneRelacionConocida
                            ? relacionesPersona.filter((relacion) =>
                              relacion === 'TRABAJADOR' || relacion === 'CLIENTE'
                            ).map((relacion) =>
                              relacion === 'TRABAJADOR' ? 'Trabajador' : 'Cliente'
                            ).join(' · ')
                            : 'Relaciones no disponibles'}
                        </span>

                        {!p.elegible && (
                          <span className="text-[11px] text-rose-500">
                            No elegible
                          </span>
                        )}
                      </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-xs text-brand-400">
                      No se encontraron personas.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {personaSeleccionada && !esElegible && (
            <p className="mt-1 text-xs text-rose-600">
              Esta persona no es elegible para crear una cuenta de usuario.
            </p>
          )}
          {personaSeleccionada && esElegible && !relacionesValidas && (
            <p className="mt-1 text-xs text-rose-600">
              El backend no devolvió una relación válida para esta persona.
            </p>
          )}
          {personaSeleccionada && relacionesValidas && (
            <p className="mt-1 text-xs text-brand-500">
              Relaciones detectadas: {[...(esTrabajador ? ['Trabajador'] : []), ...(esCliente ? ['Cliente'] : [])].join(' · ')}
            </p>
          )}
        </div>

        {/* Documento principal (solo creacion) */}
        {!modoEdicion && personaSeleccionada && (
          <div>
            <FieldLabel>Documento principal</FieldLabel>
            <div className="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-[13px] text-brand-700">
              <span className="font-medium">
                {personaSeleccionada.tipoDocumento && personaSeleccionada.numeroDocumento
                  ? `${personaSeleccionada.tipoDocumento}: ${personaSeleccionada.numeroDocumento}`
                  : 'No disponible'}
              </span>
            </div>
          </div>
        )}

        {/* Nombre de usuario: solo edicion (en creacion es el numero de documento) */}
        {modoEdicion && (
          <div>
            <FieldLabel htmlFor="usuarioLocalInput">Nombre de usuario *</FieldLabel>
            <div className="flex items-center">
              <Input
                id="usuarioLocalInput"
                value={usuarioLocal}
                onChange={(e) => setUsuarioLocal(e.target.value.toLowerCase())}
                placeholder="nombre.apellido"
                disabled={submitting}
                maxLength={120}
              />
            </div>
            <p className="mt-1 text-[11px] text-brand-400">
              Usa entre 3 y 120 letras, numeros, puntos, guiones o guiones bajos. Sin espacios ni dominio.
            </p>
          </div>
        )}

        {/* Roles iniciales */}
        <div>
          <FieldLabel>{modoEdicion ? 'Rol' : 'Roles iniciales *'}</FieldLabel>
          {modoEdicion && esClienteEnEdicion ? (
            <div className="flex h-9 items-center rounded-md border border-brand-200 bg-brand-50 px-3 text-[13px] font-medium text-brand-600">
              CLIENTE
            </div>
          ) : modoEdicion ? (
            <Select
              id="rolInicialSelect"
              value={codigoRol}
              onChange={(e) => setCodigoRol(e.target.value)}
              disabled={submitting}
            >
              <option value="">Selecciona un rol...</option>
              {roles.map((r) => (
                <option key={r.idRol} value={r.codigo}>
                  {r.nombre}
                </option>
              ))}
            </Select>
          ) : (
            <div className="space-y-2">
              {esCliente && !rolClienteDisponible && (
                <p className="text-xs text-rose-600">
                  Tu perfil no está autorizado para asignar el rol CLIENTE.
                </p>
              )}

              {esTrabajador && rolesInternosDisponibles.length > 0 && (
                <div className="space-y-2">
                  {esCliente && (
                    <p className="text-xs text-brand-500">
                      Los roles internos son opcionales para personas con ambas relaciones.
                    </p>
                  )}
                  <details
                    className="relative"
                    open={rolesMenuOpen}
                    onToggle={(event) => setRolesMenuOpen(event.currentTarget.open)}
                  >
                    <summary
                      className="flex h-9 cursor-pointer list-none items-center justify-between rounded-md border border-brand-200 bg-white px-3 text-[13px] text-brand-500 [&::-webkit-details-marker]:hidden"
                      aria-label="Seleccionar roles internos"
                    >
                      <span>Selecciona uno o más roles...</span>
                      <span aria-hidden="true">▾</span>
                    </summary>
                    <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-brand-200 bg-white p-1 shadow-lg">
                      {rolesInternosDisponibles.map((rol) => (
                        <label
                          key={rol.idRol}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-[13px] text-brand-700 hover:bg-brand-50"
                        >
                          <input
                            type="checkbox"
                            checked={rolesInternosSeleccionados.includes(rol.codigo)}
                            onChange={() => alternarRolInterno(rol.codigo)}
                            disabled={submitting}
                          />
                          <span>{rol.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                  <div className="flex flex-wrap gap-2" aria-label="Roles seleccionados">
                    {codigosRolesEfectivos.map((codigo) => {
                      const rol = roles.find((actual) => actual.codigo === codigo);
                      const esClienteObligatorio = codigo === CODIGO_ROL_CLIENTE && esCliente;
                      return (
                        <span
                          key={codigo}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-700"
                        >
                          {rol?.nombre ?? codigo}
                          {esClienteObligatorio ? (
                            <span className="text-[10px] text-brand-500">obligatorio</span>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Quitar rol ${rol?.nombre ?? codigo}`}
                              onClick={() => alternarRolInterno(codigo)}
                              disabled={submitting}
                              className="ml-1 rounded-full px-1 font-semibold hover:bg-brand-100 disabled:opacity-50"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {esCliente && !esTrabajador && rolClienteDisponible && (
                <div className="flex flex-wrap gap-2" aria-label="Roles seleccionados">
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs text-brand-700">
                    CLIENTE <span className="text-[10px] text-brand-500">obligatorio</span>
                  </span>
                </div>
              )}

              {esTrabajador && rolesInternosDisponibles.length === 0 && (
                <p className="text-xs text-rose-600">
                  No hay roles internos autorizados disponibles para asignar.
                </p>
              )}

              {esTrabajador && !esCliente && (
                <p className="text-xs text-brand-500">
                  Selecciona al menos un rol interno autorizado.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Correo electronico */}
        <div>
          <FieldLabel htmlFor="correoInput">Correo electronico *</FieldLabel>
          <Input
            id="correoInput"
            type="email"
            value={correoEfectivo}
            placeholder={
              modoEdicion
                ? 'usuario@gmail.com'
                : personaSeleccionada
                  ? 'Sin correo principal activo'
                  : 'Selecciona una persona para cargar su correo'
            }
            readOnly
            disabled={submitting || (!modoEdicion && !personaSeleccionada)}
          />
          {modoEdicion && !correoEfectivo && (
            <p className="mt-1 text-xs text-amber-700">
              El correo se modifica desde el flujo de actualización de datos personales con confirmación mediante enlace.
            </p>
          )}
          {!modoEdicion && personaSeleccionada && correoEfectivo.length > 0 && !correoValido && (
            <p className="mt-1 text-xs text-rose-600">
              El correo principal debe estar activo y tener formato válido.
            </p>
          )}
          {!modoEdicion && debeMostrarAdvertenciaCorreoFaltante(
            Boolean(personaSeleccionada),
            personaSeleccionada?.correo
          ) && (
            <p className="mt-1 text-xs text-amber-700">
              Esta persona no tiene un correo principal activo. Actualiza sus datos personales antes de crear la cuenta.
            </p>
          )}
          <p className="mt-1 text-[11px] text-brand-400">
            {modoEdicion
              ? 'Este correo recibira notificaciones del sistema. Para cambiarlo se requiere confirmación por enlace.'
              : 'Este correo recibira las credenciales temporales de acceso.'}
          </p>
        </div>

      </form>
    </Modal>
  );
}
