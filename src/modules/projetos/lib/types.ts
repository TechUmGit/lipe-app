export type StatusProjeto = 'negociacao' | 'em_espera' | 'fechado' | 'cancelado'

export interface MesAnoRef {
  mes: number
  ano: number
}

export interface Subtarefa {
  id: string
  nome: string
  concluida: boolean
  vencimento?: number
}

export interface ValorPontual {
  id: string
  mes: number
  ano: number
  valor: number
}

export interface Projeto {
  id: string
  nome: string
  status: StatusProjeto
  recorrente: boolean
  dataInicio: MesAnoRef
  /** null = perpétuo (só permitido quando recorrente) */
  dataFim: MesAnoRef | null
  /** valor esperado por mês, índice 0 = Janeiro ... 11 = Dezembro */
  valoresPorMes: number[]
  /** valores extras pontuais (prêmios, bônus) que não repetem todo ano */
  valoresPontuais?: ValorPontual[]
  subtarefas: Subtarefa[]
  obs?: string
  criadoEm: number
}

export type NovoProjeto = Omit<Projeto, 'id' | 'criadoEm'>
