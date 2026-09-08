import { useSyncExternalStore } from 'react'

const CHAVE_LOCALSTORAGE = 'financas_ocultar_valores'
const listeners = new Set<() => void>()

function lerValorInicial(): boolean {
  try {
    return localStorage.getItem(CHAVE_LOCALSTORAGE) === '1'
  } catch {
    return false
  }
}

let ocultoAtual = lerValorInicial()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return ocultoAtual
}

function definirOculto(valor: boolean) {
  ocultoAtual = valor
  try {
    localStorage.setItem(CHAVE_LOCALSTORAGE, valor ? '1' : '0')
  } catch {
    // localStorage indisponível — mantém só em memória pra essa sessão
  }
  listeners.forEach((l) => l())
}

/**
 * Estado global (fora da árvore de componentes) pra funcionar em telas que não
 * compartilham um ancestral comum, como CategoriasPage/ConexoesBancariasPage
 * (rotas irmãs de /financas, fora do FinancasLayout).
 */
export function useFinancasPrivacidade() {
  const oculto = useSyncExternalStore(subscribe, getSnapshot)
  return {
    oculto,
    alternar: () => definirOculto(!ocultoAtual),
  }
}
