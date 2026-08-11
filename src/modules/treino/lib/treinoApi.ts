import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { Execucao, GrupoTreino, NovaSerie, Perfil, Serie } from './types'

function perfilRef(uid: string) {
  return doc(db, 'users', uid, 'treino', 'perfil')
}

function equipamentosRef(uid: string) {
  return doc(db, 'users', uid, 'treino', 'equipamentos')
}

function seriesCol(uid: string) {
  return collection(db, 'users', uid, 'treino_series')
}

function execucoesCol(uid: string) {
  return collection(db, 'users', uid, 'treino_execucoes')
}

export async function getPerfil(uid: string): Promise<Perfil | null> {
  const snap = await getDoc(perfilRef(uid))
  return snap.exists() ? (snap.data() as Perfil) : null
}

export async function salvarPerfil(uid: string, perfil: Perfil) {
  await setDoc(perfilRef(uid), { ...perfil, updatedAt: Date.now() })
}

export async function getEquipamentos(uid: string): Promise<string[]> {
  const snap = await getDoc(equipamentosRef(uid))
  return snap.exists() ? ((snap.data().itens as string[]) ?? []) : []
}

export async function salvarEquipamentos(uid: string, itens: string[]) {
  await setDoc(equipamentosRef(uid), { itens, updatedAt: Date.now() })
}

export async function getSerieAtiva(uid: string): Promise<Serie | null> {
  const q = query(seriesCol(uid), where('ativa', '==', true))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  const data = docSnap.data()
  return {
    id: docSnap.id,
    criadaEm: (data.criadaEm as Timestamp)?.toMillis?.() ?? data.criadaEm,
    ativa: data.ativa,
    metaExecucoes: data.metaExecucoes,
    metaDias: data.metaDias,
    grupos: data.grupos,
    abdominalLombar: data.abdominalLombar ?? [],
  }
}

export async function criarSerie(uid: string, nova: NovaSerie): Promise<string> {
  const atual = await getSerieAtiva(uid)
  if (atual) {
    await updateDoc(doc(seriesCol(uid), atual.id), { ativa: false })
  }
  const docRef = await addDoc(seriesCol(uid), {
    ...nova,
    ativa: true,
    criadaEm: Timestamp.now(),
  })
  return docRef.id
}

export async function getExecucoesDaSerie(uid: string, serieId: string): Promise<Execucao[]> {
  const q = query(execucoesCol(uid), where('serieId', '==', serieId))
  const snap = await getDocs(q)
  const execucoes = snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      serieId: data.serieId,
      grupo: data.grupo,
      dataHora: (data.dataHora as Timestamp)?.toMillis?.() ?? data.dataHora,
    }
  })
  return execucoes.sort((a, b) => b.dataHora - a.dataHora)
}

export async function registrarExecucao(uid: string, serieId: string, grupo: GrupoTreino) {
  await addDoc(execucoesCol(uid), {
    serieId,
    grupo,
    dataHora: Timestamp.now(),
  })
}
