import { useState } from 'react'
import { useMesAnoCompartilhado } from './MesAnoContext'

/**
 * Mês/ano da tela. Quando renderizado dentro do FinancasLayout (mobile), usa o
 * estado compartilhado entre Resumo e DRE — trocar o mês num reflete no outro.
 * Fora desse contexto (ex: painel desktop), cai para um estado local próprio.
 */
export function useMesAno() {
  const hoje = new Date()
  const [localMes, setLocalMes] = useState(hoje.getMonth() + 1)
  const [localAno, setLocalAno] = useState(hoje.getFullYear())
  const compartilhado = useMesAnoCompartilhado()

  if (compartilhado) return compartilhado

  return {
    mes: localMes,
    ano: localAno,
    setMesAno: (mes: number, ano: number) => {
      setLocalMes(mes)
      setLocalAno(ano)
    },
  }
}
