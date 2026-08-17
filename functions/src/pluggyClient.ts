/**
 * Cliente HTTP fino pra API da Pluggy (https://docs.pluggy.ai).
 *
 * ATENÇÃO: os formatos abaixo (nomes de campo, convenção de sinal do valor da
 * transação, payload do webhook) foram implementados a partir da documentação
 * pública da Pluggy, sem um teste real contra o sandbox deles — ninguém aqui
 * tem as chaves CLIENT_ID/CLIENT_SECRET nem pode passar pelo MFA do banco.
 * Antes de confiar 100% na conciliação, faça uma primeira sincronização e
 * confira se `valor`/`data`/`descricao` bateram com o extrato real,
 * especialmente para contas de cartão de crédito (ver `normalizarValor`).
 */

const PLUGGY_BASE_URL = 'https://api.pluggy.ai'

let apiKeyCache: { apiKey: string; expiraEm: number } | null = null

async function obterApiKey(clientId: string, clientSecret: string): Promise<string> {
  const agora = Date.now()
  if (apiKeyCache && apiKeyCache.expiraEm > agora) return apiKeyCache.apiKey

  const resp = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  })
  if (!resp.ok) {
    throw new Error(`Pluggy /auth falhou (${resp.status}): ${await resp.text()}`)
  }
  const data = (await resp.json()) as { apiKey: string }
  // A apiKey da Pluggy dura ~2h; renovamos com folga de 5min.
  apiKeyCache = { apiKey: data.apiKey, expiraEm: agora + 110 * 60 * 1000 }
  return data.apiKey
}

async function pluggyFetch(
  clientId: string,
  clientSecret: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const apiKey = await obterApiKey(clientId, clientSecret)
  const resp = await fetch(`${PLUGGY_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...init.headers,
    },
  })
  if (!resp.ok) {
    throw new Error(`Pluggy ${init.method ?? 'GET'} ${path} falhou (${resp.status}): ${await resp.text()}`)
  }
  return resp
}

export interface PluggyConnectTokenOptions {
  itemId?: string
  clientUserId: string
  webhookUrl?: string
}

export async function criarConnectToken(
  clientId: string,
  clientSecret: string,
  options: PluggyConnectTokenOptions,
): Promise<string> {
  const resp = await pluggyFetch(clientId, clientSecret, '/connect_token', {
    method: 'POST',
    body: JSON.stringify({
      itemId: options.itemId,
      clientUserId: options.clientUserId,
      webhookUrl: options.webhookUrl,
    }),
  })
  const data = (await resp.json()) as { accessToken: string }
  return data.accessToken
}

export interface PluggyItem {
  id: string
  clientUserId?: string
  connector: { id: number; name: string; imageUrl?: string }
  status: 'UPDATED' | 'UPDATING' | 'LOGIN_ERROR' | 'OUTDATED' | 'WAITING_USER_INPUT' | 'ERROR'
  executionStatus?: string
  error?: { code: string; message: string } | null
  createdAt: string
  updatedAt: string
}

export async function buscarItem(clientId: string, clientSecret: string, itemId: string): Promise<PluggyItem> {
  const resp = await pluggyFetch(clientId, clientSecret, `/items/${itemId}`)
  return (await resp.json()) as PluggyItem
}

export interface PluggyAccount {
  id: string
  itemId: string
  type: 'BANK' | 'CREDIT'
  subtype?: string
  name: string
  marketingName?: string | null
  balance: number
  currencyCode: string
  number?: string
}

export async function listarContas(clientId: string, clientSecret: string, itemId: string): Promise<PluggyAccount[]> {
  const resp = await pluggyFetch(clientId, clientSecret, `/accounts?itemId=${encodeURIComponent(itemId)}`)
  const data = (await resp.json()) as { results: PluggyAccount[] }
  return data.results
}

export interface PluggyTransaction {
  id: string
  accountId: string
  date: string
  description: string
  descriptionRaw?: string | null
  amount: number
  type: 'DEBIT' | 'CREDIT'
  category?: string | null
  merchant?: { name?: string | null } | null
}

/**
 * Busca todas as transações de uma conta desde `from`, paginando até o fim.
 * A Pluggy pagina por `page`/`pageSize` (máx. 500 por página).
 */
export async function listarTransacoes(
  clientId: string,
  clientSecret: string,
  accountId: string,
  from: string,
): Promise<PluggyTransaction[]> {
  const todas: PluggyTransaction[] = []
  let page = 1
  const pageSize = 500

  while (true) {
    const params = new URLSearchParams({
      accountId,
      from,
      page: String(page),
      pageSize: String(pageSize),
    })
    const resp = await pluggyFetch(clientId, clientSecret, `/transactions?${params.toString()}`)
    const data = (await resp.json()) as { results: PluggyTransaction[]; totalPages: number }
    todas.push(...data.results)
    if (page >= data.totalPages) break
    page += 1
  }

  return todas
}

/**
 * Converte o valor da Pluggy pra convenção do app (positivo = receita,
 * negativo = despesa). Contas tipo BANK já vêm nessa convenção; contas tipo
 * CREDIT (cartão de crédito) reportam gasto como valor positivo, então
 * invertemos o sinal. NÃO TESTADO contra dados reais — confira no primeiro
 * sync com um cartão de crédito.
 */
export function normalizarValor(amount: number, tipoConta: PluggyAccount['type']): number {
  return tipoConta === 'CREDIT' ? -amount : amount
}
