import type { Lancamento } from './types.js'

/** Tolerância de valor (R$) — decidido com o usuário. */
export const TOLERANCIA_VALOR = 1.0
/** Tolerância de data (dias, pra qualquer lado) — decidido com o usuário. */
export const TOLERANCIA_DIAS = 3
/** Score mínimo (0-1) pra considerar um match válido, mesmo sendo o único candidato. */
const LIMIAR_CONFIANCA_MINIMA = 0.2
/** Se o 2º colocado fica a menos disso do 1º, tratamos como ambíguo (não casa, vai pra revisão). */
const MARGEM_DESAMBIGUACAO = 0.08

function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (marcas de combinação após NFD)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Similaridade de Jaccard entre os tokens (palavras) das duas descrições, 0-1. */
function similaridadeDescricao(a: string, b: string): number {
  const tokensA = new Set(normalizarTexto(a).split(' ').filter(Boolean))
  const tokensB = new Set(normalizarTexto(b).split(' ').filter(Boolean))
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersecao = 0
  for (const t of tokensA) if (tokensB.has(t)) intersecao += 1
  const uniao = tokensA.size + tokensB.size - intersecao
  return uniao === 0 ? 0 : intersecao / uniao
}

export interface TransacaoNormalizada {
  data: number
  valor: number
  descricao: string
}

export interface CandidatoComId {
  id: string
  lancamento: Pick<Lancamento, 'data' | 'valor' | 'descricao' | 'pluggyTransactionId'>
}

export interface ResultadoMatch {
  candidatoId: string | null
  ambiguo: boolean
  score: number
}

/**
 * Tenta casar uma transação da Pluggy com um lançamento manual já
 * categorizado. `candidatos` já deve vir filtrado por mesma conta,
 * categoriaId preenchido e ainda não conciliado.
 */
export function encontrarMatch(transacao: TransacaoNormalizada, candidatos: CandidatoComId[]): ResultadoMatch {
  const pontuados = candidatos
    .map((c) => {
      const diffValor = Math.abs(transacao.valor - c.lancamento.valor)
      const diffDias = Math.abs(transacao.data - c.lancamento.data) / 86_400_000
      if (diffValor > TOLERANCIA_VALOR || diffDias > TOLERANCIA_DIAS) return null

      const sim = similaridadeDescricao(transacao.descricao, c.lancamento.descricao)
      const scoreValor = 1 - diffValor / TOLERANCIA_VALOR
      const scoreData = 1 - diffDias / TOLERANCIA_DIAS
      const score = scoreValor * 0.4 + scoreData * 0.2 + sim * 0.4

      return { id: c.id, score }
    })
    .filter((x): x is { id: string; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)

  if (pontuados.length === 0) return { candidatoId: null, ambiguo: false, score: 0 }

  const [melhor, segundo] = pontuados
  if (melhor.score < LIMIAR_CONFIANCA_MINIMA) return { candidatoId: null, ambiguo: false, score: melhor.score }
  if (segundo && melhor.score - segundo.score < MARGEM_DESAMBIGUACAO) {
    return { candidatoId: null, ambiguo: true, score: melhor.score }
  }

  return { candidatoId: melhor.id, ambiguo: false, score: melhor.score }
}
