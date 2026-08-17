import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './admin.js'
import { REGION } from './config.js'
import type { ConexaoBancaria } from './types.js'

interface Dados {
  itemId: string
  pluggyAccountId: string
  contaNome: string
}

/** Define com qual "conta" do app (ex: "Fillipe Nubank") uma conta da Pluggy corresponde. */
export const pluggyMapearConta = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login primeiro.')
  const uid = request.auth.uid

  const { itemId, pluggyAccountId, contaNome } = (request.data ?? {}) as Dados
  if (!itemId || !pluggyAccountId || !contaNome?.trim()) {
    throw new HttpsError('invalid-argument', 'itemId, pluggyAccountId e contaNome são obrigatórios.')
  }

  const ref = db.doc(`users/${uid}/financas_conexoes_bancarias/${itemId}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Conexão não encontrada.')

  const conexao = snap.data() as ConexaoBancaria
  const contas = conexao.contas.map((c) =>
    c.pluggyAccountId === pluggyAccountId ? { ...c, contaNome: contaNome.trim() } : c,
  )

  await ref.update({ contas, atualizadoEm: Date.now() })
  return { ok: true }
})
