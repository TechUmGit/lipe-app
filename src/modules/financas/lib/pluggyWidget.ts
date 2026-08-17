/**
 * Carrega o widget oficial da Pluggy Connect via CDN deles (não expõe
 * nenhuma chave — só recebe o connectToken de curta duração gerado pelo
 * backend). URL "latest" sem versão fixa — a Pluggy descontinuou a versão
 * pinada anteriormente (v2.9.0, 404), então preferimos a que eles mantêm
 * sempre atualizada em vez de fixar um número que pode sumir de novo.
 */
const SCRIPT_URL = 'https://cdn.pluggy.ai/pluggy-connect.js'

export interface PluggyItemData {
  id: string
}

export interface PluggyConnectOptions {
  connectToken: string
  includeSandbox?: boolean
  onSuccess: (itemData: PluggyItemData) => void
  onError?: (error: unknown) => void
  onClose?: () => void
}

interface PluggyConnectInstance {
  init: () => void
}

declare global {
  interface Window {
    PluggyConnect?: new (options: PluggyConnectOptions) => PluggyConnectInstance
  }
}

let carregando: Promise<void> | null = null

function carregarScript(): Promise<void> {
  if (window.PluggyConnect) return Promise.resolve()
  if (carregando) return carregando

  carregando = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Não consegui carregar o widget da Pluggy.'))
    document.head.appendChild(script)
  })
  return carregando
}

export async function abrirPluggyConnect(options: PluggyConnectOptions) {
  await carregarScript()
  if (!window.PluggyConnect) throw new Error('Widget da Pluggy não carregou corretamente.')
  new window.PluggyConnect(options).init()
}
