/** Região padrão do Firebase (mesma usada pelo projeto lipe-13d18). Ajuste se você usa outra. */
export const REGION = 'us-central1'

/**
 * URL pública da função de webhook, no formato clássico que o Firebase
 * mantém pra funções onRequest (v2) por compatibilidade. Confirme essa URL
 * no output do `firebase deploy` na primeira vez — se vier diferente, ajuste
 * aqui.
 */
export function urlWebhook(projectId: string): string {
  return `https://${REGION}-${projectId}.cloudfunctions.net/pluggyWebhook`
}
