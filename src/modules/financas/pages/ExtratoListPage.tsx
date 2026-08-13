import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { LancamentoModal } from '../components/LancamentoModal'
import { agruparPorDia } from '../lib/dateGroups'
import { atualizarLancamento, getCategorias, getLancamentos, removerLancamento } from '../lib/financasApi'
import type { Categoria, Lancamento } from '../lib/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ExtratoListPage() {
  const { user } = useAuth()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [loading, setLoading] = useState(true)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [selecionado, setSelecionado] = useState<Lancamento | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([getLancamentos(user.uid, mes, ano), getCategorias(user.uid)]).then(([l, c]) => {
      setLancamentos(l)
      setCategorias(c)
      setLoading(false)
    })
  }, [user, mes, ano])

  const categoriasPorId = useMemo(() => {
    const map = new Map<string, Categoria>()
    for (const c of categorias) map.set(c.id, c)
    return map
  }, [categorias])

  const totais = useMemo(() => {
    let receita = 0
    let despesa = 0
    for (const l of lancamentos) {
      const cat = l.categoriaId ? categoriasPorId.get(l.categoriaId) : undefined
      if (cat?.transferencia || cat?.grupo === 'bens') continue
      if (!cat) {
        if (l.valor >= 0) receita += l.valor
        else despesa += l.valor
        continue
      }
      if (cat.grupo === 'receita') receita += l.valor
      else despesa += l.valor
    }
    return { receita, despesa, saldo: receita + despesa }
  }, [lancamentos, categoriasPorId])

  const grupos = useMemo(() => agruparPorDia(lancamentos), [lancamentos])

  async function salvarDetalhe(id: string, categoriaId: string, obs: string) {
    if (!user) return
    setLancamentos((prev) =>
      prev.map((l) => (l.id === id ? { ...l, categoriaId: categoriaId || null, obs } : l)),
    )
    await atualizarLancamento(user.uid, id, { categoriaId: categoriaId || null, obs })
  }

  async function excluir(id: string) {
    if (!user) return
    setLancamentos((prev) => prev.filter((l) => l.id !== id))
    await removerLancamento(user.uid, id)
  }

  return (
    <div className="stack">
      <div className="row">
        <label style={{ flex: 1 }}>
          Mês
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Ano
          <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
        </label>
      </div>

      <div className="card stat-row">
        <div>
          <p className="text-dim text-sm">Receita</p>
          <p style={{ color: 'var(--success)', fontWeight: 600 }}>{formatarMoeda(totais.receita)}</p>
        </div>
        <div>
          <p className="text-dim text-sm">Despesa</p>
          <p style={{ fontWeight: 600 }}>{formatarMoeda(totais.despesa)}</p>
        </div>
        <div>
          <p className="text-dim text-sm">Saldo</p>
          <p style={{ fontWeight: 600 }}>{formatarMoeda(totais.saldo)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : lancamentos.length === 0 ? (
        <p className="text-dim text-center">Nenhum lançamento nesse mês.</p>
      ) : (
        <div>
          {grupos.map((grupo) => (
            <div key={grupo.label}>
              <p className="day-group-label">{grupo.label}</p>
              <div>
                {grupo.itens.map((l) => {
                  const cat = l.categoriaId ? categoriasPorId.get(l.categoriaId) : undefined
                  return (
                    <div
                      key={l.id}
                      className="row lancamento-row"
                      onClick={() => setSelecionado(l)}
                    >
                      <div className="lancamento-icon">{l.valor >= 0 ? '↓' : '↑'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="lancamento-title">{l.descricao}</p>
                        <p className="text-dim text-sm">
                          {l.conta} · {cat ? cat.nome : 'Sem categoria'}
                        </p>
                      </div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: l.valor < 0 ? 'var(--text)' : 'var(--success)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatarMoeda(l.valor)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selecionado && (
        <LancamentoModal
          lancamento={selecionado}
          categorias={categorias}
          onClose={() => setSelecionado(null)}
          onSave={(categoriaId, obs) => salvarDetalhe(selecionado.id, categoriaId, obs)}
          onDelete={() => excluir(selecionado.id)}
        />
      )}
    </div>
  )
}
