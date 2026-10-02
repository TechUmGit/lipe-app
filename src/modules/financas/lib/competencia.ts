import type { Lancamento } from './types'

export function paraInputMonth(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

export function deInputMonth(valor: string): { mes: number; ano: number } {
  const [ano, mes] = valor.split('-').map(Number)
  return { mes, ano }
}

/** Mês/ano que o lançamento teria por padrão, a partir da data real. */
export function competenciaDaData(dataMs: number): { mes: number; ano: number } {
  const d = new Date(dataMs)
  return { mes: d.getMonth() + 1, ano: d.getFullYear() }
}

/** true quando a competência (mes/ano) foi ajustada e não bate mais com o mês da data real. */
export function competenciaAjustada(l: Pick<Lancamento, 'mes' | 'ano' | 'data'>): boolean {
  const base = competenciaDaData(l.data)
  return l.mes !== base.mes || l.ano !== base.ano
}
