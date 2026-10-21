
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import { coreService } from '../services/coreService';
import type { TrabajadorResponse } from '../types/workers';
import { PlusIcon } from 'lucide-react';
import { Gate } from '../components/auth/PermissionRoute';
import { NewWorkerModal } from '../components/Workers/NewWorkerModal';

function nombreCompleto(trabajador: TrabajadorResponse): string {
  const persona = trabajador.informacionPersonal;

  return [
    persona.nombres,
    persona.apellidoPaterno,
    persona.apellidoMaterno
  ].filter(Boolean).join(' ');
}

function obtenerIniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

export function Workers() {
  const [trabajadores, setTrabajadores] =
    useState<TrabajadorResponse[]>([]);

  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [newWorkerOpen, setNewWorkerOpen] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarTrabajadores() {
      setLoading(true);
      setError(null);

      try {
        const resultado = await coreService.getWorkers();

        if (activo) {
          setTrabajadores(resultado);
        }
      } catch (err) {
        if (activo) {
          setTrabajadores([]);

          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron consultar los trabajadores.'
          );
        }
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    }

    void cargarTrabajadores();

    return () => {
      activo = false;
    };
  }, [reloadKey]);

  // =========================================
  // 2. INDICADORES REALES
  // =========================================

  const trabajadoresActivos = trabajadores.filter(
    (t) =>
      t.informacionLaboral.codigoEstadoTrabajador === 'ACTIVO'
  ).length;

  const trabajadoresNoActivos =
    trabajadores.length - trabajadoresActivos;

  const indicadores = [
    {
      label: 'Trabajadores registrados',
      value: trabajadores.length
    },
    {
      label: 'Trabajadores activos',
      value: trabajadoresActivos
    },
    {
      label: 'Otros estados',
      value: trabajadoresNoActivos
    }
  ];

  // =========================================
  // 3. FILTROS
  // =========================================

  const areas = useMemo(() => {
    return Array.from(
      new Set(
        trabajadores.map(
          (t) => t.informacionLaboral.area
        )
      )
    ).sort();
  }, [trabajadores]);

  const rows = useMemo(() => {
    const texto = query.trim().toLowerCase();

    return trabajadores.filter((trabajador) => {
      const personal = trabajador.informacionPersonal;
      const laboral = trabajador.informacionLaboral;

      const coincideArea =
        areaFilter === 'all' ||
        laboral.area === areaFilter;

      const coincideBusqueda =
        texto.length === 0 ||
        nombreCompleto(trabajador)
          .toLowerCase()
          .includes(texto) ||
        laboral.cargo.toLowerCase().includes(texto) ||
        trabajador.codigo.toLowerCase().includes(texto) ||
        (personal.numeroDocumento ?? '').includes(texto);

      return coincideArea && coincideBusqueda;
    });
  }, [trabajadores, query, areaFilter]);

  // --- INTERFAZ ---

  return (
    <div>
      <PageHeader
        title="Trabajadores"
        description="Gestión de trabajadores, información laboral, áreas, cargos y estados."
        actions={
          <Gate permission="hr.create">
            <Button
              icon={PlusIcon}
              variant="primary"
              onClick={() => setNewWorkerOpen(true)}
            >
              Nuevo trabajador
            </Button>
          </Gate>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {indicadores.map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-[12px] text-brand-400">
              {item.label}
            </p>

            <p className="mt-1.5 text-[22px] font-semibold tabular text-brand-900">
              {loading ? '—' : item.value}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar nombre, DNI, código o cargo..."
            className="w-full sm:w-72"
          />

          <Select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            aria-label="Filtrar por área"
            className="w-[180px]"
          >
            <option value="all">Todas las áreas</option>

            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-brand-500">
            Cargando trabajadores...
          </div>
        ) : error ? (
          <div className="space-y-4 p-8 text-center">
            <p className="text-rose-700">
              No se pudieron cargar los trabajadores: {error}
            </p>

            <Button
              size="sm"
              onClick={() => setReloadKey((valor) => valor + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Sin trabajadores"
            description={
              trabajadores.length === 0
                ? 'Todavía no existen trabajadores registrados.'
                : 'No hay trabajadores que coincidan con los filtros.'
            }
          />
        ) : (
          <Table
            head={
              <>
                <TH>Trabajador</TH>
                <TH>Área</TH>
                <TH>Cargo</TH>
                <TH>Contrato</TH>
                <TH>Horario</TH>
                <TH>Fecha de ingreso</TH>
                <TH>Estado</TH>
              </>
            }
          >
            {rows.map((trabajador) => {
              const personal = trabajador.informacionPersonal;
              const laboral = trabajador.informacionLaboral;
              const nombre = nombreCompleto(trabajador);

              return (
                <TR key={trabajador.idTrabajador}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                        {obtenerIniciales(nombre)}
                      </span>

                      <span>
                        <span className="block font-medium text-brand-900">
                          {nombre}
                        </span>

                        <span className="block text-[11px] text-brand-300">
                          {trabajador.codigo}
                          {' · '}
                          {personal.numeroDocumento ?? 'Sin documento'}
                        </span>
                      </span>
                    </div>
                  </TD>

                  <TD className="text-brand-500">
                    {laboral.area}
                  </TD>

                  <TD>{laboral.cargo}</TD>

                  <TD>
                    <Badge tone="neutral">
                      {laboral.tipoVinculoLaboral}
                    </Badge>
                  </TD>

                  <TD className="text-brand-500">
                    {laboral.horario ?? 'Sin asignar'}
                  </TD>

                  <TD>
                    {laboral.fechaIngreso ?? '—'}
                  </TD>

                  <TD>
                    <Badge tone="neutral">
                      {laboral.estadoTrabajador}
                    </Badge>
                  </TD>
                </TR>
              );
            })}
          </Table>
        )}
      </Card>

      <NewWorkerModal
        open={newWorkerOpen}
        onClose={() => setNewWorkerOpen(false)}
        onSuccess={() => {
          setNewWorkerOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
