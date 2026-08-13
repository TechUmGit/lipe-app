export type GrupoCategoria =
  | 'receita'
  | 'despesa_fixa'
  | 'despesa_variavel'
  | 'investimento'
  | 'bens'

export const GRUPOS_CATEGORIA: { id: GrupoCategoria; label: string }[] = [
  { id: 'receita', label: 'Receita' },
  { id: 'despesa_fixa', label: 'Despesas Fixas' },
  { id: 'despesa_variavel', label: 'Despesas Variáveis' },
  { id: 'investimento', label: 'Investimentos' },
  { id: 'bens', label: 'Bens (patrimônio)' },
]

export interface TaxaResponsabilidade {
  percentual: number
  vigenciaDesde: number
}

export interface Categoria {
  id: string
  nome: string
  grupo: GrupoCategoria
  ordem: number
  transferencia?: boolean
  taxas?: TaxaResponsabilidade[]
  orcamentoMensal?: number
}

export interface Lancamento {
  id: string
  conta: string
  data: number
  valor: number
  descricao: string
  categoriaId: string | null
  obs?: string
  mes: number
  ano: number
  criadoEm: number
}

export type NovoLancamento = Omit<Lancamento, 'id' | 'criadoEm'>

export type DreCor = 'azul' | 'vermelho'

export interface DreAnotacao {
  id: string
  categoriaId: string
  ano: number
  mes: number
  comentario?: string
  cor?: DreCor
  destaque?: boolean
}
