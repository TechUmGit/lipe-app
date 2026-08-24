import type { Projeto } from './types'

export const STATUS_PROJETO_LABEL: Record<Projeto['status'], string> = {
  negociacao: 'Em negociação',
  fechado: 'Fechado',
  cancelado: 'Cancelado',
}

export const STATUS_PROJETO_ORDEM: Projeto['status'][] = ['negociacao', 'fechado', 'cancelado']

function chaveAbsoluta(mes: number, ano: number) {
  return ano * 12 + mes
}

export function dentroDaVigencia(p: Pick<Projeto, 'dataInicio' | 'dataFim'>, mes: number, ano: number): boolean {
  const alvo = chaveAbsoluta(mes, ano)
  const inicio = chaveAbsoluta(p.dataInicio.mes, p.dataInicio.ano)
  if (alvo < inicio) return false
  if (p.dataFim) {
    const fim = chaveAbsoluta(p.dataFim.mes, p.dataFim.ano)
    if (alvo > fim) return false
  }
  return true
}

export function valorNoMes(p: Pick<Projeto, 'dataInicio' | 'dataFim' | 'valoresPorMes'>, mes: number, ano: number): number {
  if (!dentroDaVigencia(p, mes, ano)) return 0
  return p.valoresPorMes[mes - 1] ?? 0
}

export function valoresDoAno(p: Projeto, ano: number): number[] {
  return new Array(12).fill(0).map((_, i) => valorNoMes(p, i + 1, ano))
}
