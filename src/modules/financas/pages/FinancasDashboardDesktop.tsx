import { DreTabelaAnual } from '../components/DreTabelaAnual'
import { ExtratoListPage } from './ExtratoListPage'
import { ResumoPage } from './ResumoPage'

export function FinancasDashboardDesktop() {
  return (
    <div className="stack">
      <div className="dashboard-grid">
        <div className="dashboard-pane">
          <ResumoPage />
        </div>
        <div className="dashboard-pane">
          <ExtratoListPage />
        </div>
      </div>
      <div className="card">
        <DreTabelaAnual />
      </div>
    </div>
  )
}
