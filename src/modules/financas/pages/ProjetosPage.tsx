import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { ProjetoModal } from '../components/ProjetoModal'
import { atualizarProjeto, criarProjeto, getProjetos, removerProjeto } from '../lib/financasApi'
import { STATUS_PROJETO_LABEL, STATUS_PROJETO_ORDEM, valorNoMes, valoresDoAno } from '../lib/projetos'
import type { NovoProjeto, Projeto } from '../lib/types'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProjetosPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [editando, setEditando] = useState<Projeto | 'novo' | null>(null)
  const [ano, setAno] = useState(new Date().getFullYear())

  useEffect(() => {
    carregar()
  }, [user])

  async function carregar() {
    if (!user) return
    const p = await getProjetos(user.uid)
    setProjetos(p)
    setLoading(false)
  }

  async function salvar(dados: NovoProjeto) {
    if (!user) return
    if (editando && editando !== 'novo') {
      await atualizarProjeto(user.uid, editando.id, dados)
    } else {
      await criarProjeto(user.uid, dados)
    }
    await carregar()
  }

  async function excluir(id: string) {
    if (!user) return
    setProjetos((prev) => prev.filter((p) => p.id !== id))
    await removerProjeto(user.uid, id)
  }

  const ativos = useMemo(() => projetos.filter((p) => p.status !== 'cancelado'), [projetos])

  const tabela = useMemo(() => {
    const linhas = ativos.map((p) => ({ projeto: p, meses: valoresDoAno(p, ano) }))
    const grupos = STATUS_PROJETO_ORDEM.filter((s) => s !== 'cancelado').map((status) => {
      const linhasDoGrupo = linhas.filter((l) => l.projeto.status === status)
      const mesesSubtotal = new Array(12).fill(0)
      for (const l of linhasDoGrupo) l.meses.forEach((v, i) => (mesesSubtotal[i] += v))
      return { status, linhas: linhasDoGrupo, mesesSubtotal }
    })
    const totalPorMes = new Array(12).fill(0).map((_, i) => grupos.reduce((s, g) => s + g.mesesSubtotal[i], 0))
    return { grupos, totalPorMes }
  }, [ativos, ano])

  const resumo = useMemo(() => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()

    const esteMesTodos = ativos.reduce((s, p) => s + valorNoMes(p, mesAtual, anoAtual), 0)
    const esteMesFechados = ativos
      .filter((p) => p.status === 'fechado')
      .reduce((s, p) => s + valorNoMes(p, mesAtual, anoAtual), 0)
    const totalAno = tabela.totalPorMes.reduce((s, v) => s + v, 0)
    const mediaMensalAno = totalAno / 12

    return { esteMesTodos, esteMesFechados, mediaMensalAno, mesAtual, anoAtual }
  }, [ativos, tabela])

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Projetos</h2>
        <button type="button" className="btn btn-primary" onClick={() => setEditando('novo')}>
          <Plus size={16} strokeWidth={1.5} /> Novo
        </button>
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
        <>
          {STATUS_PROJETO_ORDEM.map((status) => {
            const doGrupo = projetos.filter((p) => p.status === status)
            if (doGrupo.length === 0) return null
            return (
              <section key={status} className="stack" style={{ gap: 6 }}>
                <h3>{STATUS_PROJETO_LABEL[status]}</h3>
                <div className="stack" style={{ gap: 6 }}>
                  {doGrupo.map((p) => {
                    const concluidas = p.subtarefas.filter((s) => s.concluida).length
                    return (
                      <div
                        key={p.id}
                        className="row-between card"
                        style={{ padding: '10px 14px', cursor: 'pointer', opacity: status === 'cancelado' ? 0.6 : 1 }}
                        onClick={() => setEditando(p)}
                      >
                        <div>
                          <p style={{ fontWeight: 600 }}>{p.nome}</p>
                          <p className="text-dim text-sm">
                            {p.recorrente ? 'Recorrente' : 'Pagamento único'}
                            {p.subtarefas.length > 0 ? ` · ${concluidas}/${p.subtarefas.length} subtarefas` : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {projetos.length === 0 && <p className="text-dim text-center">Nenhum projeto lançado ainda.</p>}

          <div className="row-between">
            <h2 style={{ margin: 0 }}>Projeção {ano}</h2>
            <div className="row" style={{ gap: 4 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior">
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAno((a) => a + 1)} aria-label="Próximo ano">
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="dre-table-wrap">
            <table className="dre-table">
              <thead>
                <tr>
                  <th>Projeto</th>
                  {MESES_CURTO.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.grupos.map(
                  (g) =>
                    g.linhas.length > 0 && (
                      <tr key={g.status} className="dre-table-grupo">
                        <td>{STATUS_PROJETO_LABEL[g.status]}</td>
                        {g.mesesSubtotal.map((v, i) => (
                          <td key={i}>{v !== 0 ? formatarMoeda(v) : '—'}</td>
                        ))}
                      </tr>
                    ),
                )}
                {tabela.grupos.flatMap((g) =>
                  g.linhas.map((l) => (
                    <tr key={l.projeto.id}>
                      <td>{l.projeto.nome}</td>
                      {l.meses.map((v, i) => (
                        <td key={i}>{v !== 0 ? formatarMoeda(v) : '—'}</td>
                      ))}
                    </tr>
                  )),
                )}
                <tr className="dre-table-resultado">
                  <td>Total</td>
                  {tabela.totalPorMes.map((v, i) => (
                    <td key={i}>{formatarMoeda(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <h3>Resumo mensal</h3>
            <div className="card stack" style={{ gap: 8 }}>
              <div className="row-between text-sm">
                <span className="text-dim">A receber em {MESES_CURTO[resumo.mesAtual - 1]}/{resumo.anoAtual} (todos)</span>
                <span style={{ fontWeight: 600 }}>{formatarMoeda(resumo.esteMesTodos)}</span>
              </div>
              <div className="row-between text-sm">
                <span className="text-dim">A receber em {MESES_CURTO[resumo.mesAtual - 1]}/{resumo.anoAtual} (apenas fechados)</span>
                <span style={{ fontWeight: 600 }}>{formatarMoeda(resumo.esteMesFechados)}</span>
              </div>
              <div className="row-between text-sm">
                <span className="text-dim">Média mensal em {ano}</span>
                <span style={{ fontWeight: 600 }}>{formatarMoeda(resumo.mediaMensalAno)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {editando && (
        <ProjetoModal
          projeto={editando === 'novo' ? null : editando}
          onClose={() => setEditando(null)}
          onSave={salvar}
          onDelete={editando !== 'novo' ? () => excluir(editando.id) : undefined}
        />
      )}
    </div>
  )
}
