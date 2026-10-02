import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import {
  atualizarLancamento,
  dividirLancamento,
  getCategorias,
  getDreAnotacoesPorAno,
  getLancamentosPorAno,
  removerLancamento,
  salvarDreAnotacao,
  type ParteDivisao,
} from '../lib/financasApi'
import { useFinancasRefresh } from '../lib/FinancasRefreshContext'
import { orcamentoVigente, valorResponsavel } from '../lib/taxas'
import { GRUPOS_CATEGORIA, type Categoria, type DreAnotacao, type DreCor, type Lancamento } from '../lib/types'
import { DreCelulaModal } from './DreCelulaModal'
import { LancamentoModal } from './LancamentoModal'
import { Moeda } from './Moeda'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CATEGORIAS_VIAGEM = new Set(['24. Viagens Fillipe', '25. Viagens Família'])
const OPCOES_SEM_CENTAVOS = { maximumFractionDigits: 0 }

function chaveAnotacao(categoriaId: string, mes: number) {
  return `${categoriaId}_${mes}`
}

export function DreTabelaAnual() {
  const { user } = useAuth()
  const { refreshKey, notificarMudanca } = useFinancasRefresh()
  const [ano, setAno] = useState(new Date().getFullYear())
  const [anoCarregado, setAnoCarregado] = useState<number | null>(null)
  const [recarregarLocal, setRecarregarLocal] = useState(0)
  // Só mostra "Carregando..." ao trocar de ano; recargas por edição acontecem em silêncio.
  const loading = anoCarregado !== ano
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [anotacoes, setAnotacoes] = useState<DreAnotacao[]>([])
  const [celulaSelecionada, setCelulaSelecionada] = useState<{ categoriaId: string; mes: number } | null>(null)
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<Lancamento | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelado = false
    Promise.all([
      getCategorias(user.uid),
      getLancamentosPorAno(user.uid, ano),
      getDreAnotacoesPorAno(user.uid, ano),
    ]).then(([c, l, a]) => {
      if (cancelado) return
      setCategorias(c)
      setLancamentos(l)
      setAnotacoes(a)
      setAnoCarregado(ano)
    })
    return () => {
      cancelado = true
    }
  }, [user, ano, refreshKey, recarregarLocal])

  // A célula aberta é derivada do estado atual: editar um lançamento atualiza a lista, o total e a tabela juntos.
  const celulaAberta = useMemo(() => {
    if (!celulaSelecionada) return null
    const categoria = categorias.find((c) => c.id === celulaSelecionada.categoriaId)
    if (!categoria) return null
    const doMes = lancamentos
      .filter((l) => l.categoriaId === categoria.id && l.mes === celulaSelecionada.mes)
      .sort((a, b) => a.data - b.data)
    const valor = doMes.reduce((s, l) => s + valorResponsavel(l, categoria), 0)
    return { categoria, mes: celulaSelecionada.mes, valor, lancamentos: doMes }
  }, [celulaSelecionada, categorias, lancamentos])

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

  async function salvarLancamento(
    id: string,
    dados: { categoriaId: string; obs: string; descricao: string; mes: number; ano: number },
  ) {
    if (!user) return
    const categoriaFinal = dados.categoriaId || null
    const saiuDoAno = dados.ano !== ano
    setLancamentos((prev) =>
      saiuDoAno
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) =>
            l.id === id
              ? { ...l, categoriaId: categoriaFinal, obs: dados.obs, descricao: dados.descricao, mes: dados.mes, ano: dados.ano }
              : l,
          ),
    )
    await atualizarLancamento(user.uid, id, {
      categoriaId: categoriaFinal,
      obs: dados.obs,
      descricao: dados.descricao,
      mes: dados.mes,
      ano: dados.ano,
    })
    notificarMudanca()
  }

  async function excluirLancamento(id: string) {
    if (!user) return
    setLancamentos((prev) => prev.filter((l) => l.id !== id))
    await removerLancamento(user.uid, id)
    notificarMudanca()
  }

  async function dividirLancamentoSelecionado(lancamento: Lancamento, partes: ParteDivisao[]) {
    if (!user) return
    await dividirLancamento(user.uid, lancamento, partes)
    setRecarregarLocal((k) => k + 1)
    notificarMudanca()
  }

  async function salvarAnotacao(dados: { comentario: string; cor: DreCor | null; destaque: boolean }) {
    if (!user || !celulaAberta) return
    const { categoria, mes } = celulaAberta
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
                        <td>
                          <Moeda valor={g.orcamentoSubtotal} opcoes={OPCOES_SEM_CENTAVOS} />
                        </td>
                        <td>
                          <Moeda valor={g.mediaMensalSubtotal} opcoes={OPCOES_SEM_CENTAVOS} />
                        </td>
                        {g.mesesSubtotal.map((v, i) => (
                          <td key={i}>
                            <Moeda valor={v} opcoes={OPCOES_SEM_CENTAVOS} />
                          </td>
                        ))}
                      </tr>
                      {g.linhas.map((l) => (
                        <tr key={l.categoria.id}>
                          <td>{l.categoria.nome}</td>
                          <td>
                            <Moeda valor={l.orcamentoMensal} opcoes={OPCOES_SEM_CENTAVOS} />
                          </td>
                          <td>
                            <Moeda valor={l.mediaMensal} opcoes={OPCOES_SEM_CENTAVOS} />
                          </td>
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
                                onClick={() => setCelulaSelecionada({ categoriaId: l.categoria.id, mes })}
                              >
                                {v !== 0 ? <Moeda valor={v} opcoes={OPCOES_SEM_CENTAVOS} /> : '—'}
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
                  <td key={i}>
                    <Moeda valor={v} opcoes={OPCOES_SEM_CENTAVOS} />
                  </td>
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
            <span style={{ fontWeight: 600 }}>
              <Moeda valor={orcamentoCompleto} opcoes={OPCOES_SEM_CENTAVOS} />
            </span>
          </div>
          <div className="row-between text-sm">
            <span className="text-dim">Despesas médias atuais</span>
            <span style={{ fontWeight: 600 }}>
              <Moeda valor={mediaAtual} opcoes={OPCOES_SEM_CENTAVOS} />
            </span>
          </div>
          <div className="row-between text-sm">
            <span className="text-dim">Despesas médias atuais (sem Viagens Fillipe/Família)</span>
            <span style={{ fontWeight: 600 }}>
              <Moeda valor={mediaAtualSemViagens} opcoes={OPCOES_SEM_CENTAVOS} />
            </span>
          </div>
        </div>
      </div>

      {celulaAberta && (
        <DreCelulaModal
          categoria={celulaAberta.categoria}
          mes={celulaAberta.mes}
          ano={ano}
          valor={celulaAberta.valor}
          lancamentos={celulaAberta.lancamentos}
          anotacao={anotacoesPorChave.get(chaveAnotacao(celulaAberta.categoria.id, celulaAberta.mes))}
          onClose={() => setCelulaSelecionada(null)}
          onSave={salvarAnotacao}
          onAbrirLancamento={setLancamentoSelecionado}
        />
      )}

      {lancamentoSelecionado && (
        <LancamentoModal
          lancamento={lancamentoSelecionado}
          categorias={categorias}
          onClose={() => setLancamentoSelecionado(null)}
          onSave={(dados) => salvarLancamento(lancamentoSelecionado.id, dados)}
          onDelete={() => excluirLancamento(lancamentoSelecionado.id)}
          onSplit={(partes) => dividirLancamentoSelecionado(lancamentoSelecionado, partes)}
        />
      )}
    </div>
  )
}
