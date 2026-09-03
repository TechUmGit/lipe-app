import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../../core/firebase'

function estadoRef(uid: string) {
  return doc(db, 'users', uid, 'livros', 'estado')
}

export async function getLidos(uid: string): Promise<string[]> {
  const snap = await getDoc(estadoRef(uid))
  return snap.exists() ? ((snap.data().lidos as string[]) ?? []) : []
}

export async function salvarLidos(uid: string, lidos: string[]) {
  await setDoc(estadoRef(uid), { lidos, updatedAt: Date.now() })
}
