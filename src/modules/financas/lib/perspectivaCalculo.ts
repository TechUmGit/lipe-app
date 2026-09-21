import type { ParametrosPerspectiva, PlanoPerspectiva } from './types'

const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const LIMITE_MESES = 1200

export function chaveMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

export function deChave(chave: string): { ano: number; mes: number } {
  const [ano, mes] = chave.split('-').map(Number)
  return { ano, mes }
}

export function somarMeses(chave: string, n: number): string {
  const { ano, mes } = deChave(chave)
  const indice = ano * 12 + (mes - 1) + n
  return chaveMes(Math.floor(indice / 12), (indice % 12) + 1)
}

/** Quantos meses de `de` até `ate` (negativo se `ate` vier antes). */
export function diferencaMeses(de: string, ate: string): number {
  const a = deChave(de)
  const b = deChave(ate)
  return (b.ano - a.ano) * 12 + (b.mes - a.mes)
}

export function rotuloMes(chave: string): string {
  const { ano, mes } = deChave(chave)
  return `${MESES_CURTO[mes - 1]}/${String(ano).slice(-2)}`
}

export function parametrosPadrao(hoje = new Date()): ParametrosPerspectiva {
  return {
    inflacaoAnual: 0.045,
    rendimentoDesejadoAnual: 0.11,
    impostoRenda: 0.15,
    retiradaAnualPct: 0.05,
    rendaMensalDesejada: 20000,
    jurosRealMetaAnual: 0.05,
    salarioDesejadoMensal: 25000,
    salarioReferencia: chaveMes(hoje.getFullYear(), hoje.getMonth() + 1),
    mesBase: chaveMes(hoje.getFullYear() - 1, 12),
    idadeBase: 30,
    idadeMeta: 55,
    idadeFinal: 100,
  }
}

export interface Taxas {
  inflacaoMensal: number
  rendimentoMensal: number
  /** Rendimento mensal descontada a inflação mensal. */
  rendimentoRealMensal: number
}

export function calcularTaxas(p: ParametrosPerspectiva): Taxas {
  const inflacaoMensal = (1 + p.inflacaoAnual) ** (1 / 12) - 1
  const rendimentoMensal = (1 + p.rendimentoDesejadoAnual) ** (1 / 12) - 1
  return { inflacaoMensal, rendimentoMensal, rendimentoRealMensal: rendimentoMensal - inflacaoMensal }
}

/** PL necessário pra sustentar a renda mensal líquida desejada, ao juro real da meta. */
export function metaDePL(p: ParametrosPerspectiva): number {
  if (p.impostoRenda >= 1 || p.jurosRealMetaAnual <= 0) return 0
  return ((p.rendaMensalDesejada / (1 - p.impostoRenda)) * 12) / p.jurosRealMetaAnual
}

export interface LinhaPerspectiva {
  chave: string
  ano: number
  mes: number
  preenchido: boolean

  investimentos: number
  consorcios: number
  retiradas: number
  xCapital: number
  /** Retiradas/consórcios vieram da regra padrão (não foram digitados). */
  retiradasAutomatico: boolean
  consorciosAutomatico: boolean

  totalEntradas: number
  plProjetado: number
  custodiaFillipe: number
  custodiaOutros: number
  /** Custódia veio da projeção (mês ainda não preenchido). */
  custodiaProjetada: boolean
  plReal: number
  deltaReal: number
  remuneracaoPossivel: number
  remuneracaoFillipe: number
  salarioDesejado: number
  idade?: number
  pwa?: number
  plCongelado?: number
  deltaProjetado?: number
  plProjetadoLiquido: number
  salarioSemInflacao: number
}

export interface ResultadoPerspectiva {
  linhas: LinhaPerspectiva[]
  taxas: Taxas
  metaPL: number
  /** Mês (aniversário) em que o plano atinge a idade-meta. */
  chaveMeta: string
}

/**
 * Replica a planilha "Perspectiva PL": cada mês compõe (rendimento real + inflação) sobre o saldo
 * anterior mais as novas entradas. Meses "preenchidos" usam a custódia real digitada; os demais,
 * a projeção a partir do último saldo conhecido.
 */
export function calcularPerspectiva(plano: PlanoPerspectiva): ResultadoPerspectiva {
  const p = plano.parametros
  const taxas = calcularTaxas(p)
  const { inflacaoMensal, rendimentoRealMensal: rr } = taxas
  const crescimento = 1 + rr + inflacaoMensal
  const total = Math.min(Math.max(0, Math.round((p.idadeFinal - p.idadeBase) * 12)), LIMITE_MESES)

  const linhas: LinhaPerspectiva[] = []
  let anterior = { pl: 0, custodiaFillipe: 0, custodiaOutros: 0, liquido: 0, consorcios: 0, retiradas: 0 }

  for (let i = 1; i <= total; i++) {
    const chave = somarMeses(p.mesBase, i)
    const { ano, mes } = deChave(chave)
    const dado = plano.meses[chave] ?? {}
    const primeiro = i === 1
    const preenchido = dado.preenchido === true

    const investimentos = dado.investimentos ?? 0
    const xCapital = dado.xCapital ?? 0
    const consorcios = dado.consorcios ?? anterior.consorcios
    const retiradas = dado.retiradas ?? anterior.retiradas * (1 + inflacaoMensal)
    const totalEntradas = investimentos + consorcios + retiradas + xCapital

    const plProjetado = primeiro ? totalEntradas : crescimento * (anterior.pl + totalEntradas)

    const fillipeProjetada = primeiro ? totalEntradas : crescimento * (anterior.custodiaFillipe + totalEntradas)
    const outrosProjetada = primeiro ? 0 : crescimento * anterior.custodiaOutros
    const usaReal = preenchido && dado.custodiaFillipe !== undefined && dado.custodiaOutros !== undefined
    const custodiaFillipe = usaReal ? (dado.custodiaFillipe as number) : fillipeProjetada
    const custodiaOutros = usaReal ? (dado.custodiaOutros as number) : outrosProjetada
    const plReal = custodiaFillipe + custodiaOutros

    const salarioDesejado =
      p.salarioDesejadoMensal * (1 + inflacaoMensal) ** Math.max(0, diferencaMeses(p.salarioReferencia, chave))

    const mesesDesdeBase = diferencaMeses(p.mesBase, chave)
    const aniversario = mesesDesdeBase % 12 === 0
    const idade = aniversario ? p.idadeBase + mesesDesdeBase / 12 : undefined

    const plCongelado = plano.planoCongelado?.[chave]
    const plProjetadoLiquido = primeiro ? totalEntradas : (1 + rr) * (anterior.liquido + totalEntradas)

    linhas.push({
      chave,
      ano,
      mes,
      preenchido,
      investimentos,
      consorcios,
      retiradas,
      xCapital,
      retiradasAutomatico: dado.retiradas === undefined,
      consorciosAutomatico: dado.consorcios === undefined,
      totalEntradas,
      plProjetado,
      custodiaFillipe,
      custodiaOutros,
      custodiaProjetada: !usaReal,
      plReal,
      deltaReal: plReal - plProjetado,
      remuneracaoPossivel: plReal * rr * (1 - p.impostoRenda),
      remuneracaoFillipe: (plReal * p.retiradaAnualPct) / 12,
      salarioDesejado,
      idade,
      pwa: idade !== undefined ? (idade * salarioDesejado * 12) / 10 : undefined,
      plCongelado,
      deltaProjetado: plCongelado !== undefined ? plReal - plCongelado : undefined,
      plProjetadoLiquido,
      salarioSemInflacao: plProjetadoLiquido * rr,
    })

    anterior = {
      pl: plProjetado,
      custodiaFillipe,
      custodiaOutros,
      liquido: plProjetadoLiquido,
      consorcios,
      retiradas,
    }
  }

  return { linhas, taxas, metaPL: metaDePL(p), chaveMeta: somarMeses(p.mesBase, (p.idadeMeta - p.idadeBase) * 12) }
}

export interface ResumoPerspectiva {
  ultimoPreenchido?: LinhaPerspectiva
  proximoAPreencher?: LinhaPerspectiva
  /** Linha do mês em que se completa a idade-meta. */
  plNaMeta?: LinhaPerspectiva
  /** Última linha da projeção (idade final). */
  plFinal?: LinhaPerspectiva
  /** Quanto do P/L projetado líquido (sem inflação, dinheiro de hoje) na idade-meta cobre a meta (1 = 100%). */
  coberturaMeta: number
}

export function resumirPerspectiva(resultado: ResultadoPerspectiva): ResumoPerspectiva {
  const { linhas, metaPL, chaveMeta } = resultado
  let ultimoPreenchido: LinhaPerspectiva | undefined
  for (const l of linhas) if (l.preenchido) ultimoPreenchido = l
  const plNaMeta = linhas.find((l) => l.chave === chaveMeta)
  return {
    ultimoPreenchido,
    proximoAPreencher: linhas.find((l) => !l.preenchido),
    plNaMeta,
    plFinal: linhas[linhas.length - 1],
    coberturaMeta: metaPL > 0 && plNaMeta ? plNaMeta.plProjetadoLiquido / metaPL : 0,
  }
}
