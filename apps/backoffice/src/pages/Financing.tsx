import { PageHeader } from '../components/ui/PageHeader';
import { AlertasCuotasPanel } from '../components/financing/AlertasCuotasPanel';
import { RevisionClausulaPanel } from '../components/financing/RevisionClausulaPanel';
import { CarteraFinanciamientoPanel } from '../components/financing/CarteraFinanciamientoPanel';

/**
 * Financiamiento: obligaciones contractuales, cronogramas reales y alertas.
 * La recepción, aprobación y aplicación de pagos corresponde a Finanzas.
 */
export function Financing() {
  return <div>
    <PageHeader title="Financiamiento y pagos"
      description="Cartera real de ventas financiadas: capital, cuotas, vencimientos y saldos confirmados."/>
    <div className="space-y-5">
      <CarteraFinanciamientoPanel />
      <AlertasCuotasPanel />
      <RevisionClausulaPanel />
    </div>
  </div>;
}
