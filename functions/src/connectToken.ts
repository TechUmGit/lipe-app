import { getApp } from 'firebase-admin/app'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import './admin.js'
import { criarConnectToken } from './pluggyClient.js'
import { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET } from './secrets.js'
import { REGION, urlWebhook } from './config.js'

interface Dados {
  /** Presente quando o usuário está reconectando um item existente (ex: MFA expirado). */
  itemId?: string
}

export const pluggyConnectToken = onCall(
  { region: REGION, secrets: [PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login primeiro.')

    const dados = (request.data ?? {}) as Dados
    const projectId = getApp().options.projectId ?? ''

    const accessToken = await criarConnectToken(PLUGGY_CLIENT_ID.value(), PLUGGY_CLIENT_SECRET.value(), {
      clientUserId: request.auth.uid,
      itemId: dados.itemId,
      webhookUrl: urlWebhook(projectId),
    })

    return { accessToken }
  },
)
