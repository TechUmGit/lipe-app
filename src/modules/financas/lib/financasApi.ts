import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../../core/firebase'
import { CATEGORIAS_SEED, CATEGORIA_TRANSFERENCIA_NOME, CONTAS_SEED } from './categoriasSeed'
import type { Categoria, DreAnotacao, DreCor, Lancamento, NovoLancamento } from './types'

function mapLancamento(d: QueryDocumentSnapshot<DocumentData>): Lancamento {
  const data = d.data()
  return {
    id: d.id,
    conta: data.conta,
    data: (data.data as Timestamp)?.toMillis?.() ?? data.data,
    valor: data.valor,
    descricao: data.descricao,
    categoriaId: data.categoriaId ?? null,
    obs: data.obs,
    mes: data.mes,
    ano: data.ano,
    criadoEm: (data.criadoEm as Timestamp)?.toMillis?.() ?? data.criadoEm,
    origem: data.origem,
    conciliado: data.conciliado,
    pluggyTransactionId: data.pluggyTransactionId,
  } as Lancamento
}

function contasRef(uid: string) {
  return doc(db, 'users', uid, 'financas', 'contas')
}

function seedMetaRef(uid: string) {
  return doc(db, 'users', uid, 'financas', 'seedMeta')
}

function categoriasCol(uid: string) {
  return collection(db, 'users', uid, 'financas_categorias')
}

function lancamentosCol(uid: string) {
  return collection(db, 'users', uid, 'financas_lancamentos')
}

function dreAnotacoesCol(uid: string) {
  return collection(db, 'users', uid, 'financas_dre_anotacoes')
}

function dreAnotacaoId(categoriaId: string, ano: number, mes: number) {
  return `${categoriaId}_${ano}_${mes}`
}

export async function getContas(uid: string): Promise<string[]> {
  const snap = await getDoc(contasRef(uid))
  return snap.exists() ? ((snap.data().itens as string[]) ?? []) : []
}

export async function salvarContas(uid: string, itens: string[]) {
  await setDoc(contasRef(uid), { itens, updatedAt: Date.now() })
}

export async function getCategorias(uid: string): Promise<Categoria[]> {
  const snap = await getDocs(categoriasCol(uid))
  const categorias = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Categoria)
  return categorias.sort((a, b) => a.ordem - b.ordem)
}

export async function garantirSeedInicial(uid: string) {
  const jaSemeado = await runTransaction(db, async (tx) => {
    const snap = await tx.get(seedMetaRef(uid))
    if (snap.exists()) return true
    tx.set(seedMetaRef(uid), { seededAt: Date.now() })
    return false
  })
  if (jaSemeado) return

  const batch = writeBatch(db)
  for (const c of CATEGORIAS_SEED) {
    batch.set(doc(categoriasCol(uid)), c)
  }
  batch.set(doc(categoriasCol(uid)), {
    nome: CATEGORIA_TRANSFERENCIA_NOME,
    grupo: 'despesa_variavel',
    ordem: 999,
    transferencia: true,
  })
  batch.set(contasRef(uid), { itens: CONTAS_SEED, updatedAt: Date.now() })
  await batch.commit()
}

export async function criarCategoria(uid: string, categoria: Omit<Categoria, 'id'>) {
  await addDoc(categoriasCol(uid), categoria)
}

export async function atualizarCategoria(uid: string, id: string, dados: Partial<Categoria>) {
  await updateDoc(doc(categoriasCol(uid), id), dados)
}

export async function removerCategoria(uid: string, id: string) {
  await deleteDoc(doc(categoriasCol(uid), id))
}

export async function salvarLancamentos(uid: string, lancamentos: NovoLancamento[]) {
  const batch = writeBatch(db)
  for (const l of lancamentos) {
    const ref = doc(lancamentosCol(uid))
    batch.set(ref, { ...l, data: Timestamp.fromMillis(l.data), criadoEm: Timestamp.now() })
  }
  await batch.commit()
}

export async function getLancamentos(uid: string, mes: number, ano: number): Promise<Lancamento[]> {
  const q = query(lancamentosCol(uid), where('mes', '==', mes), where('ano', '==', ano))
  const snap = await getDocs(q)
  const lancamentos = snap.docs.map(mapLancamento)
  return lancamentos.sort((a, b) => a.data - b.data)
}

export async function getLancamentosPorAno(uid: string, ano: number): Promise<Lancamento[]> {
  const q = query(lancamentosCol(uid), where('ano', '==', ano))
  const snap = await getDocs(q)
  const lancamentos = snap.docs.map(mapLancamento)
  return lancamentos.sort((a, b) => a.data - b.data)
}

export interface PaginaLancamentos {
  itens: Lancamento[]
  cursor: QueryDocumentSnapshot<DocumentData> | null
}

export async function getLancamentosPagina(
  uid: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  tamanho = 30,
): Promise<PaginaLancamentos> {
  const restricoes = [orderBy('data', 'desc'), limit(tamanho)]
  const q = cursor
    ? query(lancamentosCol(uid), ...restricoes, startAfter(cursor))
    : query(lancamentosCol(uid), ...restricoes)
  const snap = await getDocs(q)
  return {
    itens: snap.docs.map(mapLancamento),
    cursor: snap.docs.length === tamanho ? snap.docs[snap.docs.length - 1] : null,
  }
}

export async function atualizarLancamento(uid: string, id: string, dados: Partial<Lancamento>) {
  await updateDoc(doc(lancamentosCol(uid), id), dados)
}

export async function removerLancamento(uid: string, id: string) {
  await deleteDoc(doc(lancamentosCol(uid), id))
}

export async function getDreAnotacoesPorAno(uid: string, ano: number): Promise<DreAnotacao[]> {
  const q = query(dreAnotacoesCol(uid), where('ano', '==', ano))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DreAnotacao)
}

export async function salvarDreAnotacao(
  uid: string,
  dados: { categoriaId: string; ano: number; mes: number; comentario: string; cor: DreCor | null; destaque: boolean },
) {
  const id = dreAnotacaoId(dados.categoriaId, dados.ano, dados.mes)
  const vazio = !dados.comentario && !dados.cor && !dados.destaque
  if (vazio) {
    await deleteDoc(doc(dreAnotacoesCol(uid), id))
    return
  }
  await setDoc(doc(dreAnotacoesCol(uid), id), {
    categoriaId: dados.categoriaId,
    ano: dados.ano,
    mes: dados.mes,
    comentario: dados.comentario,
    cor: dados.cor,
    destaque: dados.destaque,
  })
}
