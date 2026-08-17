import { createContext, useContext } from 'react'

export interface MesAnoContextValue {
  mes: number
  ano: number
  setMesAno: (mes: number, ano: number) => void
}

export const MesAnoContext = createContext<MesAnoContextValue | null>(null)

export function useMesAnoCompartilhado() {
  return useContext(MesAnoContext)
}
