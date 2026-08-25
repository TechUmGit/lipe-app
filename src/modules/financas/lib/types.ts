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

export interface OrcamentoMensal {
  valor: number
  vigenciaDesde: number
}

export interface Categoria {
  id: string
  nome: string
  grupo: GrupoCategoria
  ordem: number
  transferencia?: boolean
  taxas?: TaxaResponsabilidade[]
  /** @deprecated valor único sem vigência, mantido só para migrar categorias antigas — usar `orcamentos` */
  orcamentoMensal?: number
  orcamentos?: OrcamentoMensal[]
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
  /** 'pluggy' = veio de sincronização bancária; ausente/'manual' = lançado à mão. */
  origem?: 'manual' | 'pluggy'
  /** true quando uma transação da Pluggy foi casada com este lançamento manual. */
  conciliado?: boolean
  /** id da transação na Pluggy — usado pra não duplicar em re-sync. */
  pluggyTransactionId?: string
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

export interface ContaConectada {
  pluggyAccountId: string
  contaNome: string
  saldo: number
  saldoAtualizadoEm: number
  tipo: 'BANK' | 'CREDIT'
}

export type StatusConexao = 'conectado' | 'atualizando' | 'precisa_reconectar' | 'erro'

export interface ConexaoBancaria {
  itemId: string
  conectorNome: string
  conectorImagemUrl?: string
  status: StatusConexao
  erroMensagem?: string
  contas: ContaConectada[]
  criadoEm: number
  atualizadoEm: number
  ultimoSyncEm?: number
  /** true quando o webhook avisou de uma atualização e a sincronização de fato ainda não rodou. */
  precisaSync?: boolean
}

export interface SyncLog {
  id: string
  itemId: string
  ano: number
  inicioEm: number
  fimEm: number
  contasProcessadas: number
  transacoesProcessadas: number
  casadas: number
  criadas: number
  ambiguas?: number
  erro?: string
}
