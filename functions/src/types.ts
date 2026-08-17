/** Espelha os tipos do frontend (src/modules/financas/lib/types.ts) na parte que o backend toca. */

export interface Lancamento {
  conta: string
  data: number
  valor: number
  descricao: string
  categoriaId: string | null
  obs?: string
  mes: number
  ano: number
  criadoEm: number
  origem?: 'manual' | 'pluggy'
  conciliado?: boolean
  pluggyTransactionId?: string
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
}

export interface SyncLog {
  itemId: string
  ano: number
  inicioEm: number
  fimEm: number
  contasProcessadas: number
  transacoesProcessadas: number
  casadas: number
  criadas: number
  erro?: string
}
