import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { getCategorias, getLancamentosPorAno } from '../lib/financasApi'
import { valorResponsavel } from '../lib/taxas'
import { GRUPOS_CATEGORIA, type Categoria, type Lancamento } from '../lib/types'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function DreTabelaAnual() {
  const { user } = useAuth()
  const [ano, setAno] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([getCategorias(user.uid), getLancamentosPorAno(user.uid, ano)]).then(([c, l]) => {
      setCategorias(c)
      setLancamentos(l)
      setLoading(false)
    })
  }, [user, ano])

  const { grupos, mesesAtivos } = useMemo(() => {
    const totaisPorCategoria = new Map<string, number[]>()
    const mesesComLancamento = new Set<number>()

    for (const l of lancamentos) {
      if (!l.categoriaId) continue
      mesesComLancamento.add(l.mes)
      const cat = categorias.find((c) => c.id === l.categoriaId)
      const ajustado = valorResponsavel(l, cat)
      const totais = totaisPorCategoria.get(l.categoriaId) ?? new Array(12).fill(0)
      totais[l.mes - 1] += ajustado
      totaisPorCategoria.set(l.categoriaId, totais)
    }

    const divisor = Math.max(1, mesesComLancamento.size)

    const grupos = GRUPOS_CATEGORIA.filter((g) => g.id !== 'bens').map((g) => {
      const linhas = categorias
        .filter((c) => c.grupo === g.id && !c.transferencia)
        .map((c) => {
          const meses = totaisPorCategoria.get(c.id) ?? new Array(12).fill(0)
          const totalAno = meses.reduce((s, v) => s + v, 0)
          return {
            categoria: c,
            meses,
            totalAno,
            mediaMensal: totalAno / divisor,
            orcamentoMensal: c.orcamentoMensal ?? 0,
          }
        })
        .filter((l) => l.totalAno !== 0 || l.orcamentoMensal !== 0)

      const mesesSubtotal = new Array(12).fill(0)
      for (const l of linhas) l.meses.forEach((v, i) => (mesesSubtotal[i] += v))
      const orcamentoSubtotal = linhas.reduce((s, l) => s + l.orcamentoMensal, 0)
      const totalAnoSubtotal = mesesSubtotal.reduce((s, v) => s + v, 0)

      return {
        ...g,
        linhas,
        mesesSubtotal,
        orcamentoSubtotal,
        mediaMensalSubtotal: totalAnoSubtotal / divisor,
        totalAnoSubtotal,
      }
    })

    return { grupos, mesesAtivos: mesesComLancamento.size }
  }, [categorias, lancamentos])

  const resultadoPorMes = new Array(12)
    .fill(0)
    .map((_, i) => grupos.reduce((s, g) => s + g.mesesSubtotal[i], 0))

  function mudarAno(delta: number) {
    setAno((a) => a + delta)
  }

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>DRE {ano}</h2>
        <div className="row" style={{ gap: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={() => mudarAno(-1)} aria-label="Ano anterior">
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => mudarAno(1)} aria-label="Próximo ano">
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
        <div className="dre-table-wrap">
          <table className="dre-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Orçamento</th>
                <th>Média mensal</th>
                {MESES_CURTO.map((m) => (
                  <th key={m}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map(
                (g) =>
                  g.linhas.length > 0 && (
                    <Fragment key={g.id}>
                      <tr className="dre-table-grupo">
                        <td colSpan={15}>{g.label}</td>
                      </tr>
                      {g.linhas.map((l) => (
                        <tr key={l.categoria.id}>
                          <td>{l.categoria.nome}</td>
                          <td>{formatarMoeda(l.orcamentoMensal)}</td>
                          <td>{formatarMoeda(l.mediaMensal)}</td>
                          {l.meses.map((v, i) => (
                            <td key={i}>{v !== 0 ? formatarMoeda(v) : '—'}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="dre-table-subtotal">
                        <td>Subtotal {g.label}</td>
                        <td>{formatarMoeda(g.orcamentoSubtotal)}</td>
                        <td>{formatarMoeda(g.mediaMensalSubtotal)}</td>
                        {g.mesesSubtotal.map((v, i) => (
                          <td key={i}>{formatarMoeda(v)}</td>
                        ))}
                      </tr>
                    </Fragment>
                  ),
              )}
              <tr className="dre-table-resultado">
                <td>Resultado</td>
                <td />
                <td />
                {resultadoPorMes.map((v, i) => (
                  <td key={i}>{formatarMoeda(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-dim text-sm">
        Média mensal calculada sobre {mesesAtivos || 0} mês(es) com lançamento em {ano}.
      </p>
    </div>
  )
}
