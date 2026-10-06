import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import {
  securityApi,
  type AvailablePerson,
  type SecurityRole,
  type SecurityUser
} from '../../services/securityApi';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  roles: SecurityRole[];
  onSuccess: () => Promise<void>;
  user?: SecurityUser | null;
}

type TipoPersona = 'TRABAJADOR' | 'CLIENTE';

const CODIGO_ROL_CLIENTE = 'CLIENTE';

function validarFormatoCorreo(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function buscarPersona(persona: AvailablePerson, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    persona.nombres.toLowerCase().includes(lower) ||
    persona.apellidoPaterno.toLowerCase().includes(lower) ||
    persona.apellidoMaterno.toLowerCase().includes(lower) ||
    persona.nombreCompleto.toLowerCase().includes(lower) ||
    (persona.correo ?? '').toLowerCase().includes(lower)
  );
}

function derivarTipoPersona(user: SecurityUser): TipoPersona {
  return user.roles.some((r) => r.codigo === CODIGO_ROL_CLIENTE)
    ? 'CLIENTE'
    : 'TRABAJADOR';
}

function extraerPrefijo(usuarioLogin: string): string {
  return usuarioLogin.replace(/@.*$/, '');
}

async function ejecutarFlujoCreacion(
  idPersona: number,
  usuarioLogin: string,
  codigoRol: string,
  correo: string
): Promise<void> {
  const resultadoCorreo = await securityApi.asociarCorreoPersona(idPersona, correo);
  if (resultadoCorreo.estado !== 'OK') {
    throw new Error(`CORREO_FAIL:${resultadoCorreo.mensaje}`);
  }

  const creado = await securityApi.crearUsuario({ idPersona, usuarioLogin });
  const idUsuario = creado.idUsuario;

  try {
    await securityApi.asignarRol(idUsuario, codigoRol);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al asignar rol.';
    throw new Error(`CREAR_OK_ROL_FAIL:${msg}`);
  }

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
  nuevoCorroo: string,
  nuevoRol: string
): Promise<void> {
  const loginActual = user.usuarioLogin.toLowerCase().trim();
  const loginNuevo = nuevoLogin.toLowerCase().trim();
  const correoActual = (user.correo ?? '').toLowerCase().trim();
  const correoNuevo = nuevoCorroo.toLowerCase().trim();
  const rolActual = user.roles[0]?.codigo ?? '';

  if (loginNuevo !== loginActual) {
    const r = await securityApi.actualizarUsuario(user.idUsuario, loginNuevo);
    if (r.estado !== 'ACTUALIZADO') {
      throw new Error(`LOGIN_FAIL:${r.mensaje}`);
    }
  }

  if (correoNuevo && correoNuevo !== correoActual) {
    const r = await securityApi.asociarCorreoPersona(user.idPersona, correoNuevo);
    if (r.estado !== 'OK') {
      throw new Error(`CORREO_FAIL:${r.mensaje}`);
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

  const [personas, setPersonas] = useState<AvailablePerson[]>([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>('TRABAJADOR');
  const [busqueda, setBusqueda] = useState('');
  const [selectorPersonaAbierto, setSelectorPersonaAbierto] = useState(false);
  const [idPersona, setIdPersona] = useState<number | ''>('');
  const [usuarioLocal, setUsuarioLocal] = useState('');
  const [codigoRol, setCodigoRol] = useState('');
  const [correo, setCorreo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (modoEdicion && user) {
      const tipo = derivarTipoPersona(user);
      setTipoPersona(tipo);
      setIdPersona(user.idPersona);
      setBusqueda(user.nombreCompleto);
      setUsuarioLocal(extraerPrefijo(user.usuarioLogin));
      setCodigoRol(user.roles[0]?.codigo ?? '');
      setCorreo(user.correo ?? '');
      return;
    }

    setLoadingPersonas(true);
    securityApi.listarPersonasDisponibles()
      .then(setPersonas)
      .catch(() => toast.error('No se pudieron cargar las personas disponibles'))
      .finally(() => setLoadingPersonas(false));
  }, [open]);

  const limpiarFormulario = () => {
    setTipoPersona('TRABAJADOR');
    setBusqueda('');
    setSelectorPersonaAbierto(false);
    setIdPersona('');
    setUsuarioLocal('');
    setCodigoRol('');
    setCorreo('');
  };

  const handleTipoPersonaChange = (tipo: TipoPersona) => {
    setTipoPersona(tipo);
    setIdPersona('');
    setBusqueda('');
    setCodigoRol('');
  };

  const handleUsuarioLocalChange = (val: string) => {
    const clean = val.toLowerCase().replace(/\s+/g, '').replace(/@.*$/, '');
    setUsuarioLocal(clean);
  };

  const handleCorreoChange = (val: string) => {
    setCorreo(val.trim().toLowerCase());
  };

  const personasFiltradas = useMemo(
    () =>
      personas
        .filter((p) => p.tipoPersona === tipoPersona)
        .filter((p) => buscarPersona(p, busqueda)),
    [personas, tipoPersona, busqueda]
  );

  const personaSeleccionada = modoEdicion
    ? null
    : personas.find((p) => p.idPersona === Number(idPersona));

  const esElegible = modoEdicion
    ? true
    : Boolean(personaSeleccionada?.elegible);

  const correoValido = correo.length > 0 && validarFormatoCorreo(correo);

  const codigoRolEfectivo =
    tipoPersona === 'CLIENTE' ? CODIGO_ROL_CLIENTE : codigoRol;

  const rolSeleccionadoValido =
    tipoPersona === 'CLIENTE' || Boolean(codigoRol);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modoEdicion && (!idPersona || !esElegible)) {
      toast.error('Selecciona una persona elegible.');
      return;
    }
    if (!usuarioLocal || !rolSeleccionadoValido || !correoValido) {
      toast.error('Por favor completa todos los campos requeridos con valores validos.');
      return;
    }

    setSubmitting(true);
    const usuarioLogin = `${usuarioLocal.trim()}@monolithe.pe`;

    try {
      if (modoEdicion && user) {
        await ejecutarFlujoEdicion(user, usuarioLogin, correo, codigoRolEfectivo);
        toast.success('Usuario actualizado', {
          description: 'Los cambios se guardaron correctamente.'
        });
      } else {
        await ejecutarFlujoCreacion(
          Number(idPersona),
          usuarioLogin,
          codigoRolEfectivo,
          correo
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

      if (rawMsg.startsWith('CORREO_FAIL:')) {
        toast.error('No se pudo actualizar el correo', {
          description: rawMsg.replace('CORREO_FAIL:', '')
        });
      } else if (rawMsg.startsWith('LOGIN_FAIL:')) {
        toast.error('No se pudo actualizar el usuario', {
          description: rawMsg.replace('LOGIN_FAIL:', '')
        });
      } else if (rawMsg.startsWith('ROL_FAIL:')) {
        toast.error('No se pudo actualizar el rol', {
          description: rawMsg.replace('ROL_FAIL:', '')
        });
      } else if (rawMsg.startsWith('CREAR_OK_ROL_FAIL:')) {
        toast.error('Usuario creado pero no se pudo asignar el rol', {
          description: rawMsg.replace('CREAR_OK_ROL_FAIL:', '')
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

  const puedeEnviar =
    !submitting &&
    (modoEdicion || Boolean(idPersona)) &&
    esElegible &&
    Boolean(usuarioLocal.trim()) &&
    rolSeleccionadoValido &&
    correoValido;

  return (
    <Modal
      open={open}
      onClose={submitting ? () => { } : onClose}
      title={modoEdicion ? 'Editar usuario' : 'Nuevo usuario'}
      description={
        modoEdicion
          ? 'Actualiza la informacion de la cuenta seleccionada.'
          : 'Registra una nueva cuenta de usuario y asigna su rol inicial.'
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

        {/* Selector tipo persona */}
        <div>
          <FieldLabel>Tipo de persona *</FieldLabel>
          <div className="flex gap-2">
            {(['TRABAJADOR', 'CLIENTE'] as TipoPersona[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                disabled={submitting || modoEdicion}
                onClick={() => handleTipoPersonaChange(tipo)}
                className={[
                  'flex-1 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors duration-150',
                  tipoPersona === tipo
                    ? 'border-brand-700 bg-brand-900 text-white'
                    : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
                  modoEdicion ? 'cursor-default opacity-70' : ''
                ].join(' ')}
              >
                {tipo === 'TRABAJADOR' ? 'Trabajador' : 'Cliente'}
              </button>
            ))}
          </div>
        </div>

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
                    personasFiltradas.map((p) => (
                      <button
                        key={p.idPersona}
                        type="button"
                        disabled={!p.elegible}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (!p.elegible) return;
                          setIdPersona(p.idPersona);
                          setBusqueda(p.nombreCompleto);
                          setSelectorPersonaAbierto(false);
                        }}
                        className={[
                          'flex w-full flex-col px-3 py-2 text-left transition-colors',
                          p.elegible
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

                        {!p.elegible && (
                          <span className="text-[11px] text-rose-500">
                            No elegible
                          </span>
                        )}
                      </button>
                    ))
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
        </div>

        {/* Usuario corporativo */}
        <div>
          <FieldLabel htmlFor="usuarioLocalInput">Usuario corporativo *</FieldLabel>
          <div className="flex items-center">
            <Input
              id="usuarioLocalInput"
              value={usuarioLocal}
              onChange={(e) => handleUsuarioLocalChange(e.target.value)}
              placeholder="nombre.apellido"
              disabled={submitting}
              className="rounded-r-none border-r-0"
            />
            <span className="inline-flex h-9 items-center rounded-r-md border border-brand-200 bg-brand-50 px-3 text-[13px] text-brand-600 font-medium">
              @monolithe.pe
            </span>
          </div>
          <p className="mt-1 text-[11px] text-brand-400">
            Ingresa unicamente el prefijo. El dominio se asigna automaticamente.
          </p>
        </div>

        {/* Rol inicial */}
        <div>
          <FieldLabel htmlFor="rolInicialSelect">Rol inicial *</FieldLabel>
          {tipoPersona === 'CLIENTE' ? (
            <div className="flex h-9 items-center rounded-md border border-brand-200 bg-brand-50 px-3 text-[13px] text-brand-600 font-medium">
              Cliente
            </div>
          ) : (
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
          )}
        </div>

        {/* Correo electronico */}
        <div>
          <FieldLabel htmlFor="correoInput">Correo electronico *</FieldLabel>
          <Input
            id="correoInput"
            type="email"
            value={correo}
            onChange={(e) => handleCorreoChange(e.target.value)}
            placeholder="usuario@gmail.com"
            disabled={submitting}
          />
          {correo.length > 0 && !correoValido && (
            <p className="mt-1 text-xs text-rose-600">
              Ingresa un correo electronico valido.
            </p>
          )}
          <p className="mt-1 text-[11px] text-brand-400">
            {modoEdicion
              ? 'Este correo recibirá notificaciones del sistema.'
              : 'Este correo recibira las credenciales temporales de acceso.'}
          </p>
        </div>

      </form>
    </Modal>
  );
}
