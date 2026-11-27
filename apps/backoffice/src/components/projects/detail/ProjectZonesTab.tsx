import { useCallback, useEffect, useState } from 'react';
import { MapPinIcon, PlusIcon, PencilIcon, FilterIcon } from 'lucide-react';
import { Dropdown, DropdownItem } from '../../ui/Dropdown';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Table, TD, TH, TR } from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/Feedback';
import { useAuth } from '../../../contexts/AuthContext';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import { adicionalPorZona, adicionalGeneral, origenTarifario, solesRecargo } from '../../../lib/commercialRecargos';
import { Select, FieldLabel } from '../../ui/Field';
import { contarZonaEtapa } from '../../../lib/commercialZoneUsage';
import type { ConfiguracionProyectoResponse, TarifarioComercial, TarifaComercial } from '../../../types/projectConfiguration';
import { coreService } from '../../../services/coreService';
import { ZoneFormModal } from '../ZoneFormModal';
import type { ProyectoResponse, ZonaResponse } from '../../../types/core';

interface Props {
  project: ProyectoResponse;
}

export function ProjectZonesTab({ project }: Props) {
  const { can } = useAuth();
  const canEdit = can('projects.edit');

  const [config,setConfig]=useState<ConfiguracionProyectoResponse|null>(null);
  const [tarifario,setTarifario]=useState<TarifarioComercial|null>(null);
  const [publicado,setPublicado]=useState(false);
  const [contexto,setContexto]=useState('general');
  const [estadoFiltro,setEstadoFiltro]=useState<'Todos'|'Activos'|'Inactivos'>('Activos');
  const [tarifas,setTarifas]=useState<TarifaComercial[]>([]);
  const [tarifasError,setTarifasError]=useState(false);
  const [zones, setZones] = useState<ZonaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZonaResponse | null>(null);

  const loadZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await coreService.getZonesByProject(project.idProyecto);
      setZones(data);
      setTarifasError(false);
      try { const [c,p]=await Promise.all([projectConfigurationService.obtener(project.idProyecto),projectConfigurationService.versionPublicada(project.idProyecto)]);setConfig(c);setPublicado(p.version>0);
        const g=p.version>0?await projectConfigurationService.gestion(project.idProyecto):null;
        setTarifas(g?.estado.tarifas??c.datos.tarifas??[]);setTarifario(g?.estado.tarifario??null);
        setContexto(old=>old==='general'&&p.version>0||c.datos.etapas.some(e=>e.codigo===old)?old:c.datos.etapas[0]?.codigo??'general'); }
      catch {setConfig(null);setTarifario(null);setTarifas([]);setTarifasError(true);}
    } catch (err: any) {
      setError(err.message || 'Error al cargar las zonas del proyecto');
    } finally {
      setLoading(false);
    }
  }, [project.idProyecto]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (zone: ZonaResponse) => {
    setEditingZone(zone);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingZone(null);
  };

  const handleFormSuccess = async () => {
    await loadZones();
  };

  const visibles=zones.map((zona,index)=>({zona,index})).filter(({zona})=>estadoFiltro==='Todos'||(estadoFiltro==='Activos'?zona.activo:!zona.activo));
  const etapa=config?.datos.etapas.find(e=>e.codigo===contexto);
  const uso=config&&etapa?contarZonaEtapa(config,etapa.codigo):null;
  const base=etapa?tarifas.find(t=>t.codigoEtapa===etapa.codigo&&t.codigoZona==='D'&&t.moneda==='PEN'&&t.tipoTarifa==='MONTO_FIJO')?.valor:tarifario?.general?.precioBase;
  return (
    <div className="space-y-6">
      <ZoneFormModal
        open={formOpen}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        project={project}
        zone={editingZone}
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-brand-900 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-brand-600" />
            Zonas del proyecto
          </h3>
          <p className="text-xs text-brand-500 mt-0.5">
            Organiza sectores o áreas dentro del proyecto {project.nombre}.
          </p>
        </div>

        {canEdit && (
          <Button
            icon={PlusIcon}
            onClick={handleOpenCreate}
            className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40 shadow-sm"
          >
            Nueva zona
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-brand-100 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-4"><div className="w-full max-w-sm"><FieldLabel htmlFor="zonas-contexto">Consultar tarifario</FieldLabel><Select id="zonas-contexto" value={contexto} disabled={loading||!config} onChange={e=>setContexto(e.target.value)}>{(publicado||!config?.datos.etapas.length)&&<option value="general">Matriz general del proyecto</option>}{config?.datos.etapas.map(e=><option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</Select></div>
        <Dropdown align="left" width="w-44" trigger={({open,toggle})=><button type="button" aria-expanded={open} aria-label="Filtrar estado de zonas" onClick={toggle} className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-brand-600 ${estadoFiltro==='Todos'?'border-brand-200 bg-white text-brand-700' : estadoFiltro==='Activos'?'border-emerald-300 bg-emerald-50 text-emerald-800':'border-slate-300 bg-slate-100 text-slate-600'}`}><FilterIcon className="h-4 w-4"/>{estadoFiltro}{estadoFiltro!=='Todos'&&<span className={`h-2 w-2 rounded-full ${estadoFiltro==='Activos'?'bg-emerald-600':'bg-slate-400'}`}/>}</button>}>{({close})=><>{(['Todos','Activos','Inactivos'] as const).map(v=><DropdownItem key={v} onClick={()=>{setEstadoFiltro(v);close();}}><span className={v===estadoFiltro?(v==='Activos'?'font-semibold text-emerald-800':'font-semibold text-slate-600'):''}>{v}</span></DropdownItem>)}</>}</Dropdown></div>
        <div className="grid gap-3 rounded-md bg-brand-50 p-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-brand-600">Origen del tarifario</p><strong>{contexto==='general'?(tarifario?.general?'General del proyecto':'Sin matriz general'):publicado?origenTarifario(tarifario?.general,tarifario?.personalizadas??[],contexto):'Borrador inicial'}</strong></div><div><p className="text-xs text-brand-600">Precio base por lote</p><strong>{base==null?'—':solesRecargo(base)}</strong></div><div><p className="text-xs text-brand-600">Descuento comercial</p><strong>{!etapa?'No aplica':etapa.disponibilidad!=='PROMOCION'?'Sin descuento':etapa.tipoDescuento==='PORCENTAJE'?etapa.descuento+'%':etapa.tipoDescuento==='MONTO_FIJO'?solesRecargo(etapa.descuento):'Sin descuento'}</strong></div></div>
        <p className="text-xs text-brand-600">Tarifas de solo lectura antes del descuento, los importes se administran en Configuración comercial.</p>
      </div>
      {tarifasError&&<p className="text-xs text-amber-700">No se pudieron consultar las tarifas; no se mostrarán importes estimados.</p>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">Error al cargar zonas:</p>
          <p>{error}</p>
        </div>
      )}

      <Card className="border border-brand-100 shadow-card bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm font-medium text-brand-600">Cargando zonas desde core-service...</p>
          </div>
        ) : zones.length === 0 ? (
          <EmptyState
            title="Este proyecto aún no tiene zonas."
            description={canEdit ? 'Crea la primera zona para organizar sus lotes.' : 'No se han registrado zonas todavía.'}
          />
        ) : visibles.length===0 ? (
          <EmptyState title="No hay zonas con este estado." description="Selecciona otro filtro para consultar las zonas."/>
        ) : (
          <Table
            head={
              <>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Orden</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Código</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Nombre</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Descripción</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Tarifa adicional</TH>
                <TH align="center" className="text-brand-900 font-bold bg-brand-50/80">Lotes asignados</TH>
                <TH className="text-brand-900 font-bold bg-brand-50/80">Estado</TH>
                {canEdit && <TH align="right" className="text-brand-900 font-bold bg-brand-50/80">Acciones</TH>}
              </>
            }
          >
            {visibles.map(({zona:zn,index}) => (
              <TR key={zn.idZona} className="hover:bg-brand-50/40">
                <TD className="font-semibold text-brand-900 w-16">
                  {index+1}
                </TD>
                <TD>
                  <span className="inline-flex items-center rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {zn.codigo}
                  </span>
                </TD>
                <TD className="font-semibold text-brand-900">{zn.nombre}</TD>
                <TD className="text-brand-600 max-w-xs truncate">
                  {zn.descripcion ?? '—'}
                </TD>
                <TD>{!zn.activo?'No aplica':contexto==='general'?adicionalGeneral(tarifario?.general,zn.codigo):adicionalPorZona(tarifas,zn.codigo,contexto)}</TD>
                <TD align="center">{uso?uso.get(zn.codigo)??0:zn.lotesActivos??'—'}</TD>
                <TD>
                  {zn.activo ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4cbb17]/40 bg-[#4cbb17]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2d7a0c]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4cbb17]"></span>
                      Activa
                    </span>
                  ) : (
                    <Badge tone="neutral">Inactiva</Badge>
                  )}
                </TD>
                {canEdit && (
                  <TD align="right">
                    <Button
                      size="sm"
                      icon={PencilIcon}
                      onClick={() => handleOpenEdit(zn)}
                      className="border-brand-200 text-brand-700 hover:bg-brand-50"
                    >
                      Editar
                    </Button>
                  </TD>
                )}
              </TR>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
