import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './admin.js'
import { buscarItem, listarContas } from './pluggyClient.js'
import { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET } from './secrets.js'
import { REGION } from './config.js'
import type { ConexaoBancaria, ContaConectada, StatusConexao } from './types.js'

function mapearStatus(status: string): StatusConexao {
  if (status === 'UPDATED') return 'conectado'
  if (status === 'UPDATING') return 'atualizando'
  if (status === 'WAITING_USER_INPUT') return 'precisa_reconectar'
  return 'erro'
}

interface Dados {
  itemId: string
}

/**
 * Chamada pelo frontend logo após o widget da Pluggy retornar `onSuccess`
 * com um `item_id`. Busca o item + contas na API da Pluggy (server-to-server,
 * com as chaves seguras) e grava/atualiza a conexão no Firestore do usuário.
 */
export const pluggyItemCallback = onCall(
  { region: REGION, secrets: [PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login primeiro.')
    const uid = request.auth.uid

    const { itemId } = (request.data ?? {}) as Dados
    if (!itemId) throw new HttpsError('invalid-argument', 'itemId é obrigatório.')

    const clientId = PLUGGY_CLIENT_ID.value()
    const clientSecret = PLUGGY_CLIENT_SECRET.value()

    const item = await buscarItem(clientId, clientSecret, itemId)
    if (item.clientUserId && item.clientUserId !== uid) {
      throw new HttpsError('permission-denied', 'Esse item pertence a outro usuário.')
    }

    const contasPluggy = await listarContas(clientId, clientSecret, itemId)

    const ref = db.doc(`users/${uid}/financas_conexoes_bancarias/${itemId}`)
    const existente = await ref.get()
    const contasExistentes: ContaConectada[] = existente.exists
      ? ((existente.data() as ConexaoBancaria).contas ?? [])
      : []

    const contas: ContaConectada[] = contasPluggy.map((c) => {
      const jaMapeada = contasExistentes.find((e) => e.pluggyAccountId === c.id)
      return {
        pluggyAccountId: c.id,
        contaNome: jaMapeada?.contaNome ?? c.marketingName ?? c.name,
        saldo: c.balance,
        saldoAtualizadoEm: Date.now(),
        tipo: c.type,
      }
    })

    const agora = Date.now()
    const conexao: ConexaoBancaria = {
      itemId,
      conectorNome: item.connector.name,
      conectorImagemUrl: item.connector.imageUrl,
      status: mapearStatus(item.status),
      erroMensagem: item.error?.message,
      contas,
      criadoEm: existente.exists ? (existente.data() as ConexaoBancaria).criadoEm : agora,
      atualizadoEm: agora,
    }

    await ref.set(conexao, { merge: true })

    return conexao
  },
)
