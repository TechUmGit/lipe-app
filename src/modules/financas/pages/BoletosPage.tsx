import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { VencimentoBoletoModal } from '../components/VencimentoBoletoModal'
import {
  atualizarBoleto,
  criarBoleto,
  definirBoletoPago,
  garantirSeedBoletos,
  getBoletos,
  getBoletosPagos,
  removerBoleto,
} from '../lib/financasApi'
import { vencimentoVigente } from '../lib/taxas'
import { useMesAno } from '../lib/useMesAno'
import type { Boleto, VencimentoBoleto } from '../lib/types'

export function BoletosPage() {
  const { user } = useAuth()
  const { mes, ano, setMesAno } = useMesAno()
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [pagos, setPagos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [editandoVencimento, setEditandoVencimento] = useState<Boleto | null>(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      await garantirSeedBoletos(user.uid)
      setBoletos(await getBoletos(user.uid))
      setLoading(false)
    })()
  }, [user])

  useEffect(() => {
    if (!user) return
    getBoletosPagos(user.uid, ano, mes).then(setPagos)
  }, [user, ano, mes])

  async function alternarPago(boletoId: string) {
    if (!user) return
    const pago = !pagos.has(boletoId)
    const novo = new Set(pagos)
    if (pago) novo.add(boletoId)
    else novo.delete(boletoId)
    setPagos(novo)
    await definirBoletoPago(user.uid, boletoId, ano, mes, pago)
  }

  async function adicionarBoleto() {
    if (!user) return
    const nome = novoNome.trim()
    if (!nome) return
    const maiorOrdem = boletos.reduce((max, b) => Math.max(max, b.ordem), -1)
    await criarBoleto(user.uid, nome, maiorOrdem + 1)
    setNovoNome('')
    setBoletos(await getBoletos(user.uid))
  }

  async function excluirBoleto(id: string) {
    if (!user) return
    await removerBoleto(user.uid, id)
    setBoletos((prev) => prev.filter((b) => b.id !== id))
  }

  async function salvarVencimento(vencimentos: VencimentoBoleto[]) {
    if (!user || !editandoVencimento) return
    await atualizarBoleto(user.uid, editandoVencimento.id, { vencimentos })
    setBoletos((prev) => prev.map((b) => (b.id === editandoVencimento.id ? { ...b, vencimentos } : b)))
  }

  const referenciaMes = new Date(ano, mes - 1, 1).getTime()
  const total = boletos.length
  const pagosCount = boletos.filter((b) => pagos.has(b.id)).length

  return (
    <div className="stack">
      <MonthSwitcher mes={mes} ano={ano} onChange={setMesAno} />

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
        <>
          <div className="stack" style={{ gap: 6 }}>
            <p className="text-dim text-sm">
              {pagosCount} de {total} pagos
            </p>
            <div className="progress-bar">
              <div style={{ width: total ? `${(pagosCount / total) * 100}%` : '0%' }} />
            </div>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            {boletos.map((b) => {
              const pago = pagos.has(b.id)
              const dia = vencimentoVigente(b, referenciaMes)
              return (
                <div key={b.id} className="row-between card" style={{ padding: '12px 14px' }}>
                  <label
                    className="row"
                    style={{ gap: 12, flexDirection: 'row', alignItems: 'center', cursor: 'pointer', flex: 1 }}
                  >
                    <input
                      type="checkbox"
                      checked={pago}
                      onChange={() => alternarPago(b.id)}
                      style={{ width: 20, height: 20, flexShrink: 0 }}
                    />
                    <span style={{ textDecoration: pago ? 'line-through' : undefined, opacity: pago ? 0.6 : 1 }}>
                      {b.nome}
                      {dia && <span className="text-dim text-sm"> · vence dia {dia}</span>}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px' }}
                    onClick={() => setEditandoVencimento(b)}
                    aria-label={`Editar vencimento de ${b.nome}`}
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px' }}
                    onClick={() => excluirBoleto(b.id)}
                    aria-label={`Excluir ${b.nome}`}
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="row">
            <input
              placeholder="Novo boleto..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  adicionarBoleto()
                }
              }}
            />
            <button type="button" className="btn" onClick={adicionarBoleto}>
              +
            </button>
          </div>
        </>
      )}

      {editandoVencimento && (
        <VencimentoBoletoModal
          boleto={editandoVencimento}
          onClose={() => setEditandoVencimento(null)}
          onSave={salvarVencimento}
        />
      )}
    </div>
  )
}
