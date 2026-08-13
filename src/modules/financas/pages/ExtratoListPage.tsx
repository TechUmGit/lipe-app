import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { LancamentoModal } from '../components/LancamentoModal'
import { MESES } from '../components/MonthSwitcher'
import { agruparPorDia } from '../lib/dateGroups'
import {
  atualizarLancamento,
  getCategorias,
  getLancamentos,
  getLancamentosPagina,
  removerLancamento,
  type PaginaLancamentos,
} from '../lib/financasApi'
import { valorResponsavel } from '../lib/taxas'
import type { Categoria, Lancamento } from '../lib/types'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const ANO_ATUAL = new Date().getFullYear()

export function ExtratoListPage() {
  const { user } = useAuth()
  const [mesFiltro, setMesFiltro] = useState<number | null>(null)
  const [anoFiltro, setAnoFiltro] = useState(ANO_ATUAL)
  const [anoFiltroTexto, setAnoFiltroTexto] = useState(String(ANO_ATUAL))

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [temMais, setTemMais] = useState(true)
  const [selecionado, setSelecionado] = useState<Lancamento | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setLancamentos([])
    setCursor(null)
    setTemMais(true)

    getCategorias(user.uid).then(setCategorias)

    if (mesFiltro) {
      getLancamentos(user.uid, mesFiltro, anoFiltro).then((l) => {
        setLancamentos([...l].sort((a, b) => b.data - a.data))
        setTemMais(false)
        setLoading(false)
      })
    } else {
      getLancamentosPagina(user.uid, null).then((pagina: PaginaLancamentos) => {
        setLancamentos(pagina.itens)
        setCursor(pagina.cursor)
        setTemMais(pagina.cursor !== null)
        setLoading(false)
      })
    }
  }, [user, mesFiltro, anoFiltro])

  const carregarMais = useCallback(async () => {
    if (!user || mesFiltro || carregandoMais || !temMais) return
    setCarregandoMais(true)
    const pagina = await getLancamentosPagina(user.uid, cursor)
    setLancamentos((prev) => [...prev, ...pagina.itens])
    setCursor(pagina.cursor)
    setTemMais(pagina.cursor !== null)
    setCarregandoMais(false)
  }, [user, mesFiltro, cursor, carregandoMais, temMais])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) carregarMais()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [carregarMais])

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
      const ajustado = valorResponsavel(l, cat)
      if (cat.grupo === 'receita') receita += ajustado
      else despesa += ajustado
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
          Período
          <select
            value={mesFiltro ?? ''}
            onChange={(e) => setMesFiltro(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todos os lançamentos</option>
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {mesFiltro && (
          <label style={{ flex: 1 }}>
            Ano
            <input
              type="number"
              value={anoFiltroTexto}
              onChange={(e) => setAnoFiltroTexto(e.target.value)}
              onBlur={() => {
                const n = Number(anoFiltroTexto)
                if (n) setAnoFiltro(n)
                else setAnoFiltroTexto(String(anoFiltro))
              }}
            />
          </label>
        )}
      </div>

      {mesFiltro && (
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
      )}

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : lancamentos.length === 0 ? (
        <p className="text-dim text-center">Nenhum lançamento encontrado.</p>
      ) : (
        <div>
          {grupos.map((grupo) => (
            <div key={grupo.label}>
              <p className="day-group-label">{grupo.label}</p>
              <div>
                {grupo.itens.map((l) => {
                  const cat = l.categoriaId ? categoriasPorId.get(l.categoriaId) : undefined
                  const Icone = l.valor >= 0 ? ArrowDownLeft : ArrowUpRight
                  return (
                    <div key={l.id} className="row lancamento-row" onClick={() => setSelecionado(l)}>
                      <div className="lancamento-icon">
                        <Icone size={18} strokeWidth={1.5} />
                      </div>
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

          {!mesFiltro && temMais && (
            <div ref={sentinelRef} style={{ padding: '8px 0' }}>
              <button
                type="button"
                className="btn btn-block"
                onClick={carregarMais}
                disabled={carregandoMais}
              >
                {carregandoMais ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
          {!mesFiltro && !temMais && (
            <p className="text-center text-dim text-sm" style={{ padding: 16 }}>
              Fim do extrato.
            </p>
          )}
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
