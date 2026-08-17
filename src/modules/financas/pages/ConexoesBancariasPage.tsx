import { AlertTriangle, CheckCircle2, ClipboardList, Link2, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../core/AuthContext'
import { Topbar } from '../../../shared/components/Topbar'
import { getContas, salvarContas } from '../lib/financasApi'
import {
  confirmarItem,
  criarConnectToken,
  getConexoes,
  mapearConta,
  sincronizar,
} from '../lib/pluggyApi'
import { abrirPluggyConnect } from '../lib/pluggyWidget'
import type { ConexaoBancaria, SyncLog } from '../lib/types'

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_LABEL: Record<ConexaoBancaria['status'], { texto: string; cor: string }> = {
  conectado: { texto: 'Conectado', cor: 'var(--success)' },
  atualizando: { texto: 'Atualizando...', cor: 'var(--text-dim)' },
  precisa_reconectar: { texto: 'Precisa reconectar', cor: 'var(--btn-text)' },
  erro: { texto: 'Erro na conexão', cor: 'var(--danger)' },
}

export function ConexoesBancariasPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [conexoes, setConexoes] = useState<ConexaoBancaria[]>([])
  const [contasApp, setContasApp] = useState<string[]>([])
  const [conectando, setConectando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sincronizandoItem, setSincronizandoItem] = useState<string | null>(null)
  const [ultimoResultado, setUltimoResultado] = useState<{ itemId: string; log: SyncLog } | null>(null)

  useEffect(() => {
    if (!user) return
    carregar()
  }, [user])

  async function carregar() {
    if (!user) return
    setLoading(true)
    const [c, ca] = await Promise.all([getConexoes(user.uid), getContas(user.uid)])
    setConexoes(c)
    setContasApp(ca)
    setLoading(false)
  }

  async function conectar(itemIdExistente?: string) {
    if (!user) return
    setErro(null)
    setConectando(true)
    try {
      const connectToken = await criarConnectToken(itemIdExistente)
      await abrirPluggyConnect({
        connectToken,
        connectorIds: [200], // MeuPluggy — único conector disponível fora de um plano pago da Pluggy
        updateItem: itemIdExistente,
        onSuccess: async (itemData) => {
          try {
            await confirmarItem(itemData.id)
            await carregar()
          } catch (e) {
            console.error(e)
            setErro('Conectou no banco, mas não consegui salvar a conexão. Tente sincronizar depois.')
          } finally {
            setConectando(false)
          }
        },
        onError: (e) => {
          console.error(e)
          setErro('A Pluggy retornou um erro ao conectar. Tente de novo.')
          setConectando(false)
        },
        onClose: () => setConectando(false),
      })
    } catch (e) {
      console.error(e)
      setErro('Não consegui iniciar a conexão. Tente novamente.')
      setConectando(false)
    }
  }

  async function confirmarMapeamento(itemId: string, pluggyAccountId: string, contaNome: string) {
    if (!user || !contaNome.trim()) return
    await mapearConta(itemId, pluggyAccountId, contaNome.trim())
    if (!contasApp.includes(contaNome.trim())) {
      const novas = [...contasApp, contaNome.trim()]
      setContasApp(novas)
      await salvarContas(user.uid, novas)
    }
    await carregar()
  }

  async function rodarSync(itemId: string) {
    setSincronizandoItem(itemId)
    setErro(null)
    try {
      const log = await sincronizar(itemId)
      setUltimoResultado({ itemId, log })
      await carregar()
    } catch (e) {
      console.error(e)
      setErro('Falha ao sincronizar essa conexão. Tente de novo em instantes.')
    } finally {
      setSincronizandoItem(null)
    }
  }

  return (
    <>
      <Topbar
        title="Contas conectadas"
        backTo="/financas"
        action={
          <Link
            to="/financas/conciliacao"
            className="btn btn-ghost"
            style={{ padding: '6px 10px' }}
            aria-label="Ver conciliação"
          >
            <ClipboardList size={18} strokeWidth={1.5} />
          </Link>
        }
      />
      <div className="page">
        {loading ? (
          <p className="text-dim">Carregando...</p>
        ) : (
          <div className="stack">
            <p className="text-dim text-sm">
              Conecte suas contas via Meu Pluggy (meu.pluggy.ai) pra trazer transações
              automaticamente. Se ainda não conectou Nubank/BTG por lá, o próprio fluxo abaixo leva
              você até essa etapa. Lançamentos que já batem com algo que você categorizou
              manualmente são conciliados sem duplicar; o resto entra como "Verificar".
            </p>

            {erro && <p className="error-text">{erro}</p>}

            <button type="button" className="btn btn-primary row" onClick={() => conectar()} disabled={conectando}>
              {conectando ? <Loader2 size={16} className="spin" /> : <Link2 size={16} strokeWidth={1.5} />}
              {conectando ? 'Conectando...' : 'Conectar nova conta'}
            </button>

            {conexoes.length === 0 && (
              <p className="text-dim text-center" style={{ marginTop: 12 }}>
                Nenhuma conta conectada ainda.
              </p>
            )}

            {conexoes.map((conexao) => {
              const status = STATUS_LABEL[conexao.status]
              const semMapeamento = conexao.contas.filter((c) => !c.contaNome)
              const resultado = ultimoResultado?.itemId === conexao.itemId ? ultimoResultado.log : null

              return (
                <div key={conexao.itemId} className="card stack">
                  <div className="row-between">
                    <div>
                      <h3>{conexao.conectorNome}</h3>
                      <span className="text-sm row" style={{ gap: 4, color: status.cor }}>
                        {conexao.status === 'conectado' && <CheckCircle2 size={14} strokeWidth={1.5} />}
                        {(conexao.status === 'erro' || conexao.status === 'precisa_reconectar') && (
                          <AlertTriangle size={14} strokeWidth={1.5} />
                        )}
                        {status.texto}
                      </span>
                    </div>
                    {(conexao.status === 'erro' || conexao.status === 'precisa_reconectar') && (
                      <button type="button" className="btn" onClick={() => conectar(conexao.itemId)}>
                        Reconectar
                      </button>
                    )}
                  </div>

                  {conexao.erroMensagem && <p className="error-text text-sm">{conexao.erroMensagem}</p>}

                  <div className="stack" style={{ gap: 6 }}>
                    {conexao.contas.map((c) => (
                      <div key={c.pluggyAccountId} className="row-between text-sm">
                        <span>{c.contaNome || '(sem nome definido)'}</span>
                        <span className="text-dim">{formatarMoeda(c.saldo)}</span>
                      </div>
                    ))}
                  </div>

                  {semMapeamento.length > 0 && (
                    <div className="stack" style={{ gap: 8 }}>
                      <span className="text-dim text-sm">
                        Confirme o nome de cada conta antes de sincronizar:
                      </span>
                      {semMapeamento.map((c) => (
                        <MapeamentoConta
                          key={c.pluggyAccountId}
                          nomeSugerido={c.contaNome}
                          contasExistentes={contasApp}
                          onConfirmar={(nome) => confirmarMapeamento(conexao.itemId, c.pluggyAccountId, nome)}
                        />
                      ))}
                    </div>
                  )}

                  {semMapeamento.length === 0 && (
                    <button
                      type="button"
                      className="btn row"
                      onClick={() => rodarSync(conexao.itemId)}
                      disabled={sincronizandoItem === conexao.itemId}
                    >
                      {sincronizandoItem === conexao.itemId ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <RefreshCw size={16} strokeWidth={1.5} />
                      )}
                      {sincronizandoItem === conexao.itemId ? 'Sincronizando...' : 'Sincronizar agora'}
                    </button>
                  )}

                  {resultado && (
                    <p className="text-dim text-sm">
                      Última sincronização: {resultado.transacoesProcessadas} transação(ões) —{' '}
                      {resultado.casadas} conciliada(s), {resultado.criadas} nova(s) pra verificar.
                    </p>
                  )}

                  {conexao.ultimoSyncEm && !resultado && (
                    <p className="text-dim text-sm">
                      Última sincronização: {new Date(conexao.ultimoSyncEm).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function MapeamentoConta({
  nomeSugerido,
  contasExistentes,
  onConfirmar,
}: {
  nomeSugerido: string
  contasExistentes: string[]
  onConfirmar: (nome: string) => void
}) {
  const [nome, setNome] = useState(nomeSugerido)
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    setSalvando(true)
    try {
      await onConfirmar(nome)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="row">
      <input
        list="contas-existentes"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da conta no app"
        style={{ flex: 1 }}
      />
      <datalist id="contas-existentes">
        {contasExistentes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <button type="button" className="btn" onClick={confirmar} disabled={salvando || !nome.trim()}>
        {salvando ? '...' : 'Confirmar'}
      </button>
    </div>
  )
}
