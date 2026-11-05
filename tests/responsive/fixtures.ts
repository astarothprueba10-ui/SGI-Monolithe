import type { BrowserContext } from '@playwright/test';

/** Rutas públicas y privadas incluidas en la revisión de presentación. */
export const routes = {
  backoffice: ['/', '/login', '/recuperar-contrasena', '/restablecer-contrasena', '/cambiar-contrasena', '/confirmar-correo',
    '/proyectos', '/proyectos/1', '/plano', '/crm', '/marketing', '/ventas', '/financiamiento', '/finanzas', '/asesores',
    '/trabajadores', '/usuarios', '/auditoria', '/no-autorizado', '/pagina-inexistente'],
  'pagina-web': ['/', '/nosotros', '/proyectos', '/proyectos/condominio-campestre-los-cocos', '/beneficios', '/contacto',
    '/mi-cuenta', '/mi-cuenta/recuperar', '/mi-cuenta/nueva-contrasena', '/mi-cuenta/bienvenida', '/cms',
    '/cms/contenido/inicio', '/cms/contenido/beneficios', '/cms/contenido/institucional', '/cms/contenido/contacto',
    '/cms/proyectos', '/cms/imagenes', '/cms/publicaciones', '/pagina-inexistente'],
  'portal-cliente': ['/login', '/recuperar-contrasena', '/restablecer-contrasena', '/portal', '/portal/lote', '/portal/cronograma',
    '/portal/pagos', '/portal/documentos', '/portal/asesor', '/portal/soporte', '/portal/perfil', '/pagina-inexistente']
};
const catalog = {
  tiposDocumento: [{ idTipoDocumento: 1, codigo: 'DNI', nombre: 'DNI', longitudMinima: 8, longitudMaxima: 8, soloNumerico: true },
    { idTipoDocumento: 2, codigo: 'CE', nombre: 'Carné de extranjería', longitudMinima: 9, longitudMaxima: 12, soloNumerico: true }],
  areas: [{ idArea: 1, codigo: 'ADMIN', nombre: 'Administración y recursos humanos' }],
  cargos: [{ idCargo: 1, idArea: 1, codigo: 'ASISTENTE', nombre: 'Asistente administrativo' }],
  horarios: [{ idHorario: 1, codigo: 'COMPLETO', nombre: 'Tiempo completo', minutosTolerancia: 10 }],
  tiposVinculoLaboral: [{ idTipoVinculoLaboral: 1, codigo: 'PLANILLA', nombre: 'Planilla' }],
  estadosTrabajador: [{ idEstadoTrabajador: 1, codigo: 'ACTIVO', nombre: 'Activo' }, { idEstadoTrabajador: 2, codigo: 'INACTIVO', nombre: 'Inactivo' }]
};
const worker = {
  idTrabajador: 1, codigo: 'TRAB-PRUEBA-001', fechaCreacion: '2026-11-01T15:00:00Z',
  informacionPersonal: { idPersona: 1, idTipoDocumento: 1, numeroDocumento: '12345678', nombres: 'Persona de prueba', apellidoPaterno: 'Apellido',
    apellidoMaterno: 'Ejemplo', fechaNacimiento: '1990-01-01', correoElectronico: 'persona.de.prueba@dominio-institucional.example', telefono: '987654321',
    direccion: 'Una dirección extensa para comprobar la presentación en un teléfono móvil', departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Ciudad Eten', pais: 'PERÚ' },
  informacionLaboral: { idArea: 1, area: 'Administración y recursos humanos', idCargo: 1, cargo: 'Asistente administrativo', idHorario: 1,
    horario: 'Tiempo completo', idTipoVinculoLaboral: 1, tipoVinculoLaboral: 'Planilla', idEstadoTrabajador: 1, codigoEstadoTrabajador: 'ACTIVO',
    estadoTrabajador: 'Activo', fechaIngreso: '2026-11-04', fechaCese: null, observaciones: null }
};
const project = { idProyecto: 1, codigo: 'PROY-001', nombre: 'Proyecto de prueba con un nombre largo', descripcion: 'Proyecto de prueba para revisión visual',
  distrito: 'Ciudad Eten', provincia: 'Chiclayo', departamento: 'Lambayeque', pais: 'PERÚ', direccion: 'Dirección de prueba',
  codigoEstadoProyecto: 'ACTIVO', nombreEstadoProyecto: 'Activo', idEstadoProyecto: 1, activo: true, areaTotalM2: 10000,
  fechaInicio: '2026-11-04', fechaFinEstimada: '2027-12-31' };
const user = { idUsuario: 1, usuario: '12345678', nombreMostrar: 'Usuario de prueba con nombre largo', iniciales: 'UP',
  autoridades: ['ROLE_ADMINISTRADOR', ...['dashboard','projects','lots','crm','marketing','sales','financing','finance','advisors','hr','users','roles','permissions','audit']
    .flatMap(module => ['view','create','edit','delete','approve','reject','export','configure','activate','deactivate','assign_role','assign_permissions'].map(action => `${module}.${action}`))],
  requiereCambioPassword: false };
function jsonFor(url: URL) {
  const p = url.pathname;
  if (p.endsWith('/trabajadores/catalogos')) return catalog;
  if (p.endsWith('/trabajadores/metricas')) return { nuevosTrabajadores: 12, reincorporacionesAprobadas: 2, suspendidosActuales: 1, cesesRegistrados: 3 };
  if (p.endsWith('/trabajadores/historial')) return { movimientos: [] };
  if (p.endsWith('/reincorporaciones')) return { solicitudes: [] };
  if (p.endsWith('/trabajadores')) return [worker];
  if (p.endsWith('/trabajadores/1')) return worker;
  if (p.endsWith('/proyectos') || p.endsWith('/proyectos/activos')) return [project];
  if (p.endsWith('/proyectos/1')) return project;
  if (/\/catalogos\//.test(p)) return [{ id: 1, codigo: 'ACTIVO', nombre: 'Activo', activo: true, idMoneda: 1, simbolo: 'S/' }];
  if (/\/security\/(users|roles|audit|people\/available)$/.test(p)) return [];
  if (/\/ubicaciones|\/ubigeos|\/etapas\/|\/zonas\/|\/manzanas\/|\/lotes\/buscar/.test(p)) return [];
  if (/\/correcciones-documento$/.test(p)) return [];
  if (/\/supabase\//.test(p)) return [];
  return undefined;
}

async function mockRequests(context: BrowserContext) {
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return route.abort();
    if (!/\/(?:api|cms-api|core-api|auth-api)\/|\/supabase\//.test(url.pathname)) return route.continue();
    const value = jsonFor(url);
    if (value !== undefined) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Servicio simulado no disponible para esta vista.' }) });
  });
}

async function seed(context: BrowserContext, app: string) {
  await context.addInitScript(({ user, app }) => {
    localStorage.setItem('monolithe_access_token', 'mobile-qa-access');
    localStorage.setItem('monolithe_refresh_token', 'mobile-qa-refresh');
    localStorage.setItem('monolithe_user', JSON.stringify({ ...user, requiereCambioPassword: window.location.pathname === '/cambiar-contrasena', autoridades: app === 'portal-cliente' ? ['ROLE_CLIENTE'] : user.autoridades }));
  }, { user, app });
}

/** Servidores de prueba aislados para las tres aplicaciones. */
export const origins = {
  backoffice: 'http://127.0.0.1:6181',
  'pagina-web': 'http://127.0.0.1:6182',
  'portal-cliente': 'http://127.0.0.1:6183'
};

/** Usa identidades y respuestas de prueba sin contactar servicios externos. */
export async function prepareContext(context: BrowserContext, app: keyof typeof routes) {
  await mockRequests(context);
  await seed(context, app);
}
