import { PageHeader } from '../components/ui/PageHeader';
import { CarteraFinanciamientoPanel } from '../components/financing/CarteraFinanciamientoPanel';

/**
 * Financiamiento: obligaciones contractuales, cronogramas reales y alertas.
 * La recepción, aprobación y aplicación de pagos corresponde a Finanzas.
 */
export function Financing() {
  return <div>
    <PageHeader title="Financiamiento y pagos"
      description="Cartera real de ventas financiadas: capital, cuotas, vencimientos y saldos confirmados."/>
    <CarteraFinanciamientoPanel />
  </div>;
}
