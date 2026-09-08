import type { Boleto, Categoria, Lancamento, OrcamentoMensal, TaxaResponsabilidade, VencimentoBoleto } from './types'

export function taxaVigente(categoria: Pick<Categoria, 'taxas'>, dataMs: number = Date.now()): number {
  const taxas = categoria.taxas ?? []
  if (taxas.length === 0) return 100

  const ordenadas = [...taxas].sort((a, b) => a.vigenciaDesde - b.vigenciaDesde)
  let vigente: TaxaResponsabilidade | undefined
  for (const t of ordenadas) {
    if (t.vigenciaDesde <= dataMs) vigente = t
    else break
  }
  return vigente ? vigente.percentual : ordenadas[0].percentual
}

export function ordenarTaxas(taxas: TaxaResponsabilidade[]): TaxaResponsabilidade[] {
  return [...taxas].sort((a, b) => b.vigenciaDesde - a.vigenciaDesde)
}

export function orcamentoVigente(
  categoria: Pick<Categoria, 'orcamentos' | 'orcamentoMensal'>,
  dataMs: number = Date.now(),
): number {
  const orcamentos = categoria.orcamentos ?? []
  if (orcamentos.length === 0) return categoria.orcamentoMensal ?? 0

  const ordenadas = [...orcamentos].sort((a, b) => a.vigenciaDesde - b.vigenciaDesde)
  let vigente: OrcamentoMensal | undefined
  for (const o of ordenadas) {
    if (o.vigenciaDesde <= dataMs) vigente = o
    else break
  }
  return vigente ? vigente.valor : ordenadas[0].valor
}

export function ordenarOrcamentos(orcamentos: OrcamentoMensal[]): OrcamentoMensal[] {
  return [...orcamentos].sort((a, b) => b.vigenciaDesde - a.vigenciaDesde)
}

export function vencimentoVigente(boleto: Pick<Boleto, 'vencimentos'>, dataMs: number = Date.now()): number | undefined {
  const vencimentos = boleto.vencimentos ?? []
  if (vencimentos.length === 0) return undefined

  const ordenados = [...vencimentos].sort((a, b) => a.vigenciaDesde - b.vigenciaDesde)
  let vigente: VencimentoBoleto | undefined
  for (const v of ordenados) {
    if (v.vigenciaDesde <= dataMs) vigente = v
    else break
  }
  return vigente ? vigente.dia : ordenados[0].dia
}

export function ordenarVencimentos(vencimentos: VencimentoBoleto[]): VencimentoBoleto[] {
  return [...vencimentos].sort((a, b) => b.vigenciaDesde - a.vigenciaDesde)
}

/** Valor do lançamento já ajustado pela taxa de responsabilidade vigente na data dele. */
export function valorResponsavel(lancamento: Lancamento, categoria: Pick<Categoria, 'taxas'> | undefined): number {
  if (!categoria) return lancamento.valor
  const taxa = taxaVigente(categoria, lancamento.data)
  return (lancamento.valor * taxa) / 100
}
