import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'
import { db } from './admin.js'
import { buscarItem } from './pluggyClient.js'
import { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET } from './secrets.js'
import { REGION } from './config.js'
import type { StatusConexao } from './types.js'

function mapearStatus(status: string): StatusConexao {
  if (status === 'UPDATED') return 'conectado'
  if (status === 'UPDATING') return 'atualizando'
  if (status === 'WAITING_USER_INPUT') return 'precisa_reconectar'
  return 'erro'
}

interface WebhookPayload {
  event: string
  itemId?: string
}

/**
 * Recebe eventos da Pluggy. Não confiamos em nada do corpo além do `itemId`
 * (só um identificador, não é segredo) — pra saber o status real e a quem
 * pertence, sempre rebuscamos o item na API da Pluggy com nossas próprias
 * credenciais, em vez de confiar no payload recebido.
 *
 * Só atualiza status e marca `precisaSync` — não roda a sincronização aqui
 * dentro. A Pluggy espera resposta em até 5s e uma conta com muitas
 * transações facilmente estoura isso; quem sincroniza de fato é o app,
 * automaticamente ao abrir a tela de conexões (vendo `precisaSync`) ou
 * manualmente pelo botão "Sincronizar agora".
 */
export const pluggyWebhook = onRequest(
  { region: REGION, secrets: [PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET], timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('method not allowed')
      return
    }

    const payload = req.body as WebhookPayload
    const itemId = payload?.itemId
    if (!itemId) {
      res.status(400).send('itemId ausente')
      return
    }

    try {
      const item = await buscarItem(PLUGGY_CLIENT_ID.value(), PLUGGY_CLIENT_SECRET.value(), itemId)
      const uid = item.clientUserId
      if (!uid) {
        logger.warn(`Webhook pra item ${itemId} sem clientUserId, ignorando.`)
        res.status(200).send('ok')
        return
      }

      const ref = db.doc(`users/${uid}/financas_conexoes_bancarias/${itemId}`)
      const snap = await ref.get()
      if (!snap.exists) {
        logger.warn(`Webhook pra item ${itemId} que não temos gravado, ignorando.`)
        res.status(200).send('ok')
        return
      }

      const statusAtual = mapearStatus(item.status)
      const precisaSync = payload.event === 'item/updated' || payload.event === 'transactions/created'
      await ref.update({
        status: statusAtual,
        erroMensagem: item.error?.message ?? null,
        atualizadoEm: Date.now(),
        ...(precisaSync ? { precisaSync: true } : {}),
      })

      res.status(200).send('ok')
    } catch (err) {
      logger.error('Erro processando webhook da Pluggy', err)
      // 200 mesmo em erro interno pra evitar retry-loop infinito da Pluggy;
      // o erro fica só no log do Cloud Functions.
      res.status(200).send('ok')
    }
  },
)
