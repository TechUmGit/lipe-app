import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import {
  atualizarLancamento,
  getCategorias,
  getLancamentos,
  removerLancamento,
} from '../lib/financasApi'
import { GRUPOS_CATEGORIA, type Categoria, type Lancamento } from '../lib/types'

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

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([getLancamentos(user.uid, mes, ano), getCategorias(user.uid)]).then(
      ([l, c]) => {
        setLancamentos(l)
        setCategorias(c)
        setLoading(false)
      },
    )
  }, [user, mes, ano])

  const categoriasPorId = useMemo(() => {
    const map = new Map<string, Categoria>()
    for (const c of categorias) map.set(c.id, c)
    return map
  }, [categorias])

  const categoriasOrdenadas = useMemo(
    () => GRUPOS_CATEGORIA.map((g) => ({ ...g, itens: categorias.filter((c) => c.grupo === g.id) })),
    [categorias],
  )

  const totais = useMemo(() => {
    let receita = 0
    let despesa = 0
    for (const l of lancamentos) {
      const cat = l.categoriaId ? categoriasPorId.get(l.categoriaId) : undefined
      if (cat?.transferencia) continue
      if (l.valor >= 0) receita += l.valor
      else despesa += l.valor
    }
    return { receita, despesa, saldo: receita + despesa }
  }, [lancamentos, categoriasPorId])

  async function mudarCategoria(id: string, categoriaId: string) {
    if (!user) return
    setLancamentos((prev) => prev.map((l) => (l.id === id ? { ...l, categoriaId } : l)))
    await atualizarLancamento(user.uid, id, { categoriaId: categoriaId || null })
  }

  async function mudarObs(id: string, obs: string) {
    if (!user) return
    setLancamentos((prev) => prev.map((l) => (l.id === id ? { ...l, obs } : l)))
    await atualizarLancamento(user.uid, id, { obs })
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

      <div className="card stack">
        <div className="row-between text-sm">
          <span className="text-dim">Receita</span>
          <span style={{ color: 'var(--success)' }}>{formatarMoeda(totais.receita)}</span>
        </div>
        <div className="row-between text-sm">
          <span className="text-dim">Despesa</span>
          <span style={{ color: 'var(--danger)' }}>{formatarMoeda(totais.despesa)}</span>
        </div>
        <div className="row-between">
          <span>Saldo</span>
          <span style={{ fontWeight: 600 }}>{formatarMoeda(totais.saldo)}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : lancamentos.length === 0 ? (
        <p className="text-dim text-center">Nenhum lançamento nesse mês.</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {lancamentos.map((l) => (
            <div key={l.id} className="card stack" style={{ gap: 6 }}>
              <div className="row-between">
                <span className="text-sm text-dim">
                  {new Date(l.data).toLocaleDateString('pt-BR')} · {l.conta}
                </span>
                <span
                  className="text-sm"
                  style={{ fontWeight: 600, color: l.valor < 0 ? 'var(--danger)' : 'var(--success)' }}
                >
                  {formatarMoeda(l.valor)}
                </span>
              </div>
              <p className="text-sm" style={{ overflowWrap: 'break-word' }}>
                {l.descricao}
              </p>
              <select
                value={l.categoriaId ?? ''}
                onChange={(e) => mudarCategoria(l.id, e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categoriasOrdenadas.map((g) =>
                  g.itens.length ? (
                    <optgroup key={g.id} label={g.label}>
                      {g.itens.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.transferencia ? '↔ ' : ''}
                          {c.nome}
                        </option>
                      ))}
                    </optgroup>
                  ) : null,
                )}
              </select>
              <input
                placeholder="Comentário..."
                defaultValue={l.obs ?? ''}
                onBlur={(e) => mudarObs(l.id, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost"
                style={{ alignSelf: 'flex-end', padding: '4px 8px' }}
                onClick={() => excluir(l.id)}
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
