import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { getCategorias, getDreAnotacoesPorAno, getLancamentosPorAno, salvarDreAnotacao } from '../lib/financasApi'
import { useFinancasRefresh } from '../lib/FinancasRefreshContext'
import { orcamentoVigente, valorResponsavel } from '../lib/taxas'
import { GRUPOS_CATEGORIA, type Categoria, type DreAnotacao, type DreCor, type Lancamento } from '../lib/types'
import { DreCelulaModal } from './DreCelulaModal'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CATEGORIAS_VIAGEM = new Set(['24. Viagens Fillipe', '25. Viagens Família'])

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function chaveAnotacao(categoriaId: string, mes: number) {
  return `${categoriaId}_${mes}`
}

export function DreTabelaAnual() {
  const { user } = useAuth()
  const { refreshKey } = useFinancasRefresh()
  const [ano, setAno] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [anotacoes, setAnotacoes] = useState<DreAnotacao[]>([])
  const [celulaSelecionada, setCelulaSelecionada] = useState<{
    categoria: Categoria
    mes: number
    valor: number
    lancamentos: Lancamento[]
  } | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getCategorias(user.uid),
      getLancamentosPorAno(user.uid, ano),
      getDreAnotacoesPorAno(user.uid, ano),
    ]).then(([c, l, a]) => {
      setCategorias(c)
      setLancamentos(l)
      setAnotacoes(a)
      setLoading(false)
    })
  }, [user, ano, refreshKey])

  const anotacoesPorChave = useMemo(() => {
    const map = new Map<string, DreAnotacao>()
    for (const a of anotacoes) map.set(chaveAnotacao(a.categoriaId, a.mes), a)
    return map
  }, [anotacoes])

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
            orcamentoMensal: orcamentoVigente(c),
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

  const gruposDespesa = grupos.filter((g) => g.id !== 'receita')
  const orcamentoCompleto = gruposDespesa.reduce((s, g) => s + g.orcamentoSubtotal, 0)
  const mediaAtual = gruposDespesa.reduce((s, g) => s + Math.abs(g.mediaMensalSubtotal), 0)
  const mediaAtualSemViagens = gruposDespesa.reduce(
    (s, g) =>
      s +
      g.linhas
        .filter((l) => !CATEGORIAS_VIAGEM.has(l.categoria.nome))
        .reduce((s2, l) => s2 + Math.abs(l.mediaMensal), 0),
    0,
  )

  function mudarAno(delta: number) {
    setAno((a) => a + delta)
  }

  async function salvarAnotacao(dados: { comentario: string; cor: DreCor | null; destaque: boolean }) {
    if (!user || !celulaSelecionada) return
    const { categoria, mes } = celulaSelecionada
    await salvarDreAnotacao(user.uid, { categoriaId: categoria.id, ano, mes, ...dados })
    const chave = chaveAnotacao(categoria.id, mes)
    setAnotacoes((prev) => {
      const semEsta = prev.filter((a) => chaveAnotacao(a.categoriaId, a.mes) !== chave)
      const vazio = !dados.comentario && !dados.cor && !dados.destaque
      if (vazio) return semEsta
      return [...semEsta, { id: chave, categoriaId: categoria.id, ano, mes, ...dados, cor: dados.cor ?? undefined }]
    })
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
                        <td>{g.label}</td>
                        <td>{formatarMoeda(g.orcamentoSubtotal)}</td>
                        <td>{formatarMoeda(g.mediaMensalSubtotal)}</td>
                        {g.mesesSubtotal.map((v, i) => (
                          <td key={i}>{formatarMoeda(v)}</td>
                        ))}
                      </tr>
                      {g.linhas.map((l) => (
                        <tr key={l.categoria.id}>
                          <td>{l.categoria.nome}</td>
                          <td>{formatarMoeda(l.orcamentoMensal)}</td>
                          <td>{formatarMoeda(l.mediaMensal)}</td>
                          {l.meses.map((v, i) => {
                            const mes = i + 1
                            const anot = anotacoesPorChave.get(chaveAnotacao(l.categoria.id, mes))
                            const cor =
                              anot?.cor === 'azul' ? 'var(--blue)' : anot?.cor === 'vermelho' ? 'var(--danger)' : undefined
                            const bg = anot?.destaque ? 'var(--btn-bg)' : undefined
                            return (
                              <td
                                key={i}
                                className="dre-table-cell-click"
                                style={{ color: cor, background: bg }}
                                title={anot?.comentario || undefined}
                                onClick={() =>
                                  setCelulaSelecionada({
                                    categoria: l.categoria,
                                    mes,
                                    valor: v,
                                    lancamentos: lancamentos
                                      .filter((lc) => lc.categoriaId === l.categoria.id && lc.mes === mes)
                                      .sort((a, b) => a.data - b.data),
                                  })
                                }
                              >
                                {v !== 0 ? formatarMoeda(v) : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
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
        Média mensal calculada sobre {mesesAtivos || 0} mês(es) com lançamento em {ano}. Clique numa célula de
        mês para comentar ou destacar.
      </p>

      <div className="stack" style={{ gap: 8 }}>
        <h3>Resumo geral de despesas</h3>
        <div className="card stack" style={{ gap: 8 }}>
          <div className="row-between text-sm">
            <span className="text-dim">Orçamento completo de despesas</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(orcamentoCompleto)}</span>
          </div>
          <div className="row-between text-sm">
            <span className="text-dim">Despesas médias atuais</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(mediaAtual)}</span>
          </div>
          <div className="row-between text-sm">
            <span className="text-dim">Despesas médias atuais (sem Viagens Fillipe/Família)</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(mediaAtualSemViagens)}</span>
          </div>
        </div>
      </div>

      {celulaSelecionada && (
        <DreCelulaModal
          categoria={celulaSelecionada.categoria}
          mes={celulaSelecionada.mes}
          ano={ano}
          valor={celulaSelecionada.valor}
          lancamentos={celulaSelecionada.lancamentos}
          anotacao={anotacoesPorChave.get(chaveAnotacao(celulaSelecionada.categoria.id, celulaSelecionada.mes))}
          onClose={() => setCelulaSelecionada(null)}
          onSave={salvarAnotacao}
        />
      )}
    </div>
  )
}
