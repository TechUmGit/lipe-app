import { FieldPath, deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import { parametrosPadrao } from './perspectivaCalculo'
import type { MesPerspectiva, ParametrosPerspectiva, PlanoPerspectiva } from './types'

function planoRef(uid: string) {
  return doc(db, 'users', uid, 'financas_perspectiva', 'plano')
}

/** Firestore rejeita `undefined`; remove chaves indefinidas (recursivo só no nível dos meses). */
function semUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}

export async function getPlano(uid: string): Promise<PlanoPerspectiva | null> {
  const snap = await getDoc(planoRef(uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    parametros: { ...parametrosPadrao(), ...data.parametros },
    meses: data.meses ?? {},
    planoCongelado: data.planoCongelado,
    planoCongeladoRotulo: data.planoCongeladoRotulo,
  }
}

export async function criarPlanoVazio(uid: string): Promise<PlanoPerspectiva> {
  const plano: PlanoPerspectiva = { parametros: parametrosPadrao(), meses: {} }
  await setDoc(planoRef(uid), plano)
  return plano
}

export async function substituirPlano(uid: string, plano: PlanoPerspectiva): Promise<void> {
  const limpo: Record<string, unknown> = { parametros: plano.parametros, meses: {} }
  const meses: Record<string, MesPerspectiva> = {}
  for (const [chave, mes] of Object.entries(plano.meses)) meses[chave] = semUndefined(mes)
  limpo.meses = meses
  if (plano.planoCongelado) limpo.planoCongelado = plano.planoCongelado
  if (plano.planoCongeladoRotulo) limpo.planoCongeladoRotulo = plano.planoCongeladoRotulo
  await setDoc(planoRef(uid), limpo)
}

export async function salvarParametros(uid: string, parametros: ParametrosPerspectiva): Promise<void> {
  await updateDoc(planoRef(uid), { parametros })
}

/** `null` apaga os valores do mês (volta a seguir a regra padrão). */
export async function salvarMes(uid: string, chave: string, dados: MesPerspectiva | null): Promise<void> {
  await updateDoc(planoRef(uid), new FieldPath('meses', chave), dados ? semUndefined(dados) : deleteField())
}

export async function salvarPlanoCongelado(
  uid: string,
  planoCongelado: Record<string, number>,
  rotulo: string,
): Promise<void> {
  await updateDoc(planoRef(uid), { planoCongelado, planoCongeladoRotulo: rotulo })
}

const CAMPOS_PARAMETROS: (keyof ParametrosPerspectiva)[] = [
  'inflacaoAnual',
  'rendimentoDesejadoAnual',
  'impostoRenda',
  'retiradaAnualPct',
  'rendaMensalDesejada',
  'jurosRealMetaAnual',
  'salarioDesejadoMensal',
  'salarioReferencia',
  'mesBase',
  'idadeBase',
  'idadeMeta',
]

const REGEX_CHAVE_MES = /^\d{4}-(0[1-9]|1[0-2])$/

/** Valida um backup exportado antes de gravar. Retorna o plano limpo ou uma mensagem de erro. */
export function validarBackup(bruto: unknown): PlanoPerspectiva | string {
  if (!bruto || typeof bruto !== 'object') return 'Arquivo inválido.'
  const obj = bruto as Record<string, unknown>
  const p = obj.parametros as Record<string, unknown> | undefined
  if (!p || typeof p !== 'object') return 'O arquivo não tem as premissas do plano.'
  for (const campo of CAMPOS_PARAMETROS) {
    const esperado = campo === 'salarioReferencia' || campo === 'mesBase' ? 'string' : 'number'
    if (typeof p[campo] !== esperado) return `Premissa "${campo}" ausente ou inválida.`
  }
  // idadeFinal é opcional: backups antigos não têm e assumem o padrão.
  if (p.idadeFinal !== undefined && typeof p.idadeFinal !== 'number') return 'Premissa "idadeFinal" inválida.'
  if (!REGEX_CHAVE_MES.test(p.mesBase as string) || !REGEX_CHAVE_MES.test(p.salarioReferencia as string)) {
    return 'Datas das premissas devem estar no formato AAAA-MM.'
  }
  const meses = obj.meses
  if (!meses || typeof meses !== 'object') return 'O arquivo não tem os meses.'
  for (const [chave, valor] of Object.entries(meses as Record<string, unknown>)) {
    if (!REGEX_CHAVE_MES.test(chave) || !valor || typeof valor !== 'object') return `Mês inválido: ${chave}.`
    for (const v of Object.values(valor as Record<string, unknown>)) {
      if (typeof v !== 'number' && typeof v !== 'boolean') return `Valor inválido em ${chave}.`
    }
  }
  const congelado = obj.planoCongelado as Record<string, unknown> | undefined
  if (congelado && Object.values(congelado).some((v) => typeof v !== 'number')) return 'Plano congelado inválido.'

  return {
    parametros: { ...parametrosPadrao(), ...(p as unknown as ParametrosPerspectiva) },
    meses: meses as Record<string, MesPerspectiva>,
    planoCongelado: congelado as Record<string, number> | undefined,
    planoCongeladoRotulo: typeof obj.planoCongeladoRotulo === 'string' ? obj.planoCongeladoRotulo : undefined,
  }
}
