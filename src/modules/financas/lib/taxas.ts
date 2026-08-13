import type { Categoria, TaxaResponsabilidade } from './types'

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
