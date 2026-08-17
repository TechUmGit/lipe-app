import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../../core/firebase'
import type { ConexaoBancaria, SyncLog } from './types'

function conexoesCol(uid: string) {
  return collection(db, 'users', uid, 'financas_conexoes_bancarias')
}

function syncLogsCol(uid: string) {
  return collection(db, 'users', uid, 'financas_sync_logs')
}

export async function getConexoes(uid: string): Promise<ConexaoBancaria[]> {
  const snap = await getDocs(conexoesCol(uid))
  return snap.docs.map((d) => d.data() as ConexaoBancaria).sort((a, b) => b.atualizadoEm - a.atualizadoEm)
}

export async function getConexao(uid: string, itemId: string): Promise<ConexaoBancaria | null> {
  const snap = await getDoc(doc(conexoesCol(uid), itemId))
  return snap.exists() ? (snap.data() as ConexaoBancaria) : null
}

export async function getSyncLogs(uid: string, tamanho = 20): Promise<SyncLog[]> {
  const q = query(syncLogsCol(uid), orderBy('fimEm', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.slice(0, tamanho).map((d) => ({ id: d.id, ...d.data() }) as SyncLog)
}

interface ConnectTokenResposta {
  accessToken: string
}

export async function criarConnectToken(itemId?: string): Promise<string> {
  const fn = httpsCallable<{ itemId?: string }, ConnectTokenResposta>(functions, 'pluggyConnectToken')
  const { data } = await fn({ itemId })
  return data.accessToken
}

export async function confirmarItem(itemId: string): Promise<ConexaoBancaria> {
  const fn = httpsCallable<{ itemId: string }, ConexaoBancaria>(functions, 'pluggyItemCallback')
  const { data } = await fn({ itemId })
  return data
}

export async function mapearConta(itemId: string, pluggyAccountId: string, contaNome: string): Promise<void> {
  const fn = httpsCallable(functions, 'pluggyMapearConta')
  await fn({ itemId, pluggyAccountId, contaNome })
}

export async function sincronizar(itemId: string): Promise<SyncLog> {
  const fn = httpsCallable<{ itemId: string }, Omit<SyncLog, 'id'>>(functions, 'pluggySync')
  const { data } = await fn({ itemId })
  return { id: '', ...data }
}
