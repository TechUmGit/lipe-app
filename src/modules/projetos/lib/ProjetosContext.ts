import { createContext, useContext, type Dispatch, type SetStateAction } from 'react'
import type { FiltroReceita } from './calculo'
import type { Projeto } from './types'

export interface ProjetosContextValue {
  projetos: Projeto[]
  setProjetos: Dispatch<SetStateAction<Projeto[]>>
  loading: boolean
  recarregar: () => Promise<void>
  busca: string
  setBusca: (valor: string) => void
  filtroReceita: FiltroReceita
  setFiltroReceita: (valor: FiltroReceita) => void
}

export const ProjetosContext = createContext<ProjetosContextValue | null>(null)

export function useProjetosContexto(): ProjetosContextValue {
  const ctx = useContext(ProjetosContext)
  if (!ctx) throw new Error('useProjetosContexto precisa ser usado dentro de ProjetosLayout')
  return ctx
}
