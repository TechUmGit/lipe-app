import { GRUPOS, type Execucao, type GrupoTreino, type Serie } from './types'

const ORDEM: GrupoTreino[] = GRUPOS.map((g) => g.id)

export function proximoGrupo(execucoes: Execucao[]): GrupoTreino {
  if (execucoes.length === 0) return ORDEM[0]
  const ultimo = execucoes[0].grupo // execucoes já vem ordenado do mais recente para o mais antigo
  const idx = ORDEM.indexOf(ultimo)
  return ORDEM[(idx + 1) % ORDEM.length]
}

export function diasDesde(timestampMs: number): number {
  return Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24))
}

export interface StatusRenovacao {
  precisaRenovar: boolean
  motivo: 'execucoes' | 'dias' | null
  execucoesFeitas: number
  diasPassados: number
}

export function calcularStatusRenovacao(serie: Serie, execucoes: Execucao[]): StatusRenovacao {
  const execucoesFeitas = execucoes.length
  const diasPassados = diasDesde(serie.criadaEm)

  if (execucoesFeitas >= serie.metaExecucoes) {
    return { precisaRenovar: true, motivo: 'execucoes', execucoesFeitas, diasPassados }
  }
  if (diasPassados >= serie.metaDias) {
    return { precisaRenovar: true, motivo: 'dias', execucoesFeitas, diasPassados }
  }
  return { precisaRenovar: false, motivo: null, execucoesFeitas, diasPassados }
}
