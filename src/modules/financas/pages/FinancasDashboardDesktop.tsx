import { useState } from 'react'
import { DreTabelaAnual } from '../components/DreTabelaAnual'
import { FinancasRefreshContext } from '../lib/FinancasRefreshContext'
import { BoletosPage } from './BoletosPage'
import { ExtratoListPage } from './ExtratoListPage'
import { ResumoPage } from './ResumoPage'

export function FinancasDashboardDesktop() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <FinancasRefreshContext.Provider
      value={{ refreshKey, notificarMudanca: () => setRefreshKey((k) => k + 1) }}
    >
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
        <div className="dashboard-pane">
          <BoletosPage />
        </div>
      </div>
    </FinancasRefreshContext.Provider>
  )
}
