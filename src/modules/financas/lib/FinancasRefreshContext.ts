import { createContext, useContext } from 'react'

export interface FinancasRefreshContextValue {
  refreshKey: number
  notificarMudanca: () => void
}

export const FinancasRefreshContext = createContext<FinancasRefreshContextValue | null>(null)

/**
 * No dashboard desktop, Resumo/Extrato/DRE ficam montados ao mesmo tempo, cada
 * um buscando seus próprios dados. Sem isso, uma mudança (split, categoria,
 * exclusão) num painel não aparece nos outros até recarregar a página. Fora
 * do desktop (rotas separadas no mobile), não tem Provider — cada tela já
 * remonta sozinha ao navegar, então isso vira um no-op inofensivo.
 */
export function useFinancasRefresh(): FinancasRefreshContextValue {
  const ctx = useContext(FinancasRefreshContext)
  return ctx ?? { refreshKey: 0, notificarMudanca: () => {} }
}
