import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { NovoProjeto, Projeto } from './types'

function projetosCol(uid: string) {
  return collection(db, 'users', uid, 'projetos')
}

export async function getProjetos(uid: string): Promise<Projeto[]> {
  const snap = await getDocs(projetosCol(uid))
  const projetos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Projeto)
  return projetos.sort((a, b) => b.criadoEm - a.criadoEm)
}

export async function criarProjeto(uid: string, dados: NovoProjeto) {
  await addDoc(projetosCol(uid), { ...dados, criadoEm: Date.now() })
}

export async function atualizarProjeto(uid: string, id: string, dados: Partial<Projeto>) {
  await updateDoc(doc(projetosCol(uid), id), dados)
}

export async function removerProjeto(uid: string, id: string) {
  await deleteDoc(doc(projetosCol(uid), id))
}
