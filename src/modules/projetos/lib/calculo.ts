import type { Projeto, Subtarefa } from './types'

export const STATUS_PROJETO_LABEL: Record<Projeto['status'], string> = {
  negociacao: 'Em negociação',
  em_espera: 'Em espera',
  fechado: 'Fechado',
  cancelado: 'Cancelado',
}

export const STATUS_PROJETO_ORDEM: Projeto['status'][] = ['negociacao', 'em_espera', 'fechado', 'cancelado']

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

export function valorNoMes(
  p: Pick<Projeto, 'dataInicio' | 'dataFim' | 'valoresPorMes' | 'valoresPontuais'>,
  mes: number,
  ano: number,
): number {
  const recorrente = dentroDaVigencia(p, mes, ano) ? (p.valoresPorMes[mes - 1] ?? 0) : 0
  const pontual = (p.valoresPontuais ?? [])
    .filter((v) => v.mes === mes && v.ano === ano)
    .reduce((s, v) => s + v.valor, 0)
  return recorrente + pontual
}

export function valoresDoAno(p: Projeto, ano: number): number[] {
  return new Array(12).fill(0).map((_, i) => valorNoMes(p, i + 1, ano))
}

export function subtarefaVencida(s: Pick<Subtarefa, 'concluida' | 'vencimento'>): boolean {
  if (s.concluida || !s.vencimento) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return s.vencimento < hoje.getTime()
}

/** Pendentes antes de concluídas; dentro de cada grupo, vencimento mais próximo primeiro (sem data, por último). */
export function compararAtividades(a: Subtarefa, b: Subtarefa): number {
  const porStatus = Number(a.concluida) - Number(b.concluida)
  if (porStatus !== 0) return porStatus
  const va = a.vencimento ?? Infinity
  const vb = b.vencimento ?? Infinity
  return va - vb
}

export type ColunaKanban = 'vencido' | 'hoje' | 'semana' | 'em_breve' | 'concluido'

export const COLUNAS_KANBAN: { id: ColunaKanban; label: string }[] = [
  { id: 'vencido', label: 'Vencidos' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'em_breve', label: 'Em breve' },
  { id: 'concluido', label: 'Concluídos' },
]

/** Sem data e ainda pendente cai em "Em breve" (sem urgência definida). */
export function colunaKanban(s: Pick<Subtarefa, 'concluida' | 'vencimento'>): ColunaKanban {
  if (s.concluida) return 'concluido'
  if (!s.vencimento) return 'em_breve'

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicioHoje = hoje.getTime()
  const fimHoje = inicioHoje + 24 * 60 * 60 * 1000 - 1
  if (s.vencimento < inicioHoje) return 'vencido'
  if (s.vencimento <= fimHoje) return 'hoje'

  const fimDaSemana = new Date(hoje)
  fimDaSemana.setDate(fimDaSemana.getDate() + (6 - fimDaSemana.getDay()))
  fimDaSemana.setHours(23, 59, 59, 999)
  if (s.vencimento <= fimDaSemana.getTime()) return 'semana'

  return 'em_breve'
}
