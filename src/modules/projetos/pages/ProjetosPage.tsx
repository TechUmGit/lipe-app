import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { Topbar } from '../../../shared/components/Topbar'
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop'
import { ProjetoModal } from '../components/ProjetoModal'
import { atualizarProjeto, criarProjeto, getProjetos, removerProjeto } from '../lib/projetosApi'
import {
  STATUS_PROJETO_LABEL,
  STATUS_PROJETO_ORDEM,
  compararAtividades,
  subtarefaVencida,
  valorNoMes,
  valoresDoAno,
} from '../lib/calculo'
import type { NovoProjeto, Projeto } from '../lib/types'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR')
}

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function ProjetosPage() {
  const { user } = useAuth()
  const isDesktop = useIsDesktop()
  const [loading, setLoading] = useState(true)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [editando, setEditando] = useState<Projeto | 'novo' | null>(null)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [gruposColapsados, setGruposColapsados] = useState<Set<Projeto['status']>>(new Set())
  const [busca, setBusca] = useState('')

  useEffect(() => {
    document.body.classList.toggle('wide', isDesktop)
    return () => document.body.classList.remove('wide')
  }, [isDesktop])

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

  function alternarExpandido(id: string) {
    setExpandidos((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function alternarGrupoColapsado(status: Projeto['status']) {
    setGruposColapsados((prev) => {
      const novo = new Set(prev)
      if (novo.has(status)) novo.delete(status)
      else novo.add(status)
      return novo
    })
  }

  async function alternarSubtarefaInline(p: Projeto, subtarefaId: string) {
    if (!user) return
    const novasSubtarefas = p.subtarefas.map((s) =>
      s.id === subtarefaId ? { ...s, concluida: !s.concluida } : s,
    )
    setProjetos((prev) => prev.map((pr) => (pr.id === p.id ? { ...pr, subtarefas: novasSubtarefas } : pr)))
    await atualizarProjeto(user.uid, p.id, { subtarefas: novasSubtarefas })
  }

  const projetosFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return projetos
    return projetos.filter((p) => normalizar(p.nome).includes(termo))
  }, [projetos, busca])

  const ativos = useMemo(
    () => projetosFiltrados.filter((p) => p.status !== 'cancelado'),
    [projetosFiltrados],
  )

  const atividades = useMemo(() => {
    const itens = ativos.flatMap((p) => p.subtarefas.map((s) => ({ projeto: p, subtarefa: s })))
    return itens.sort((a, b) => compararAtividades(a.subtarefa, b.subtarefa))
  }, [ativos])

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
    <>
      <Topbar title="Projetos" backTo="/" />
      <div className="page">
        <div className="stack">
          <div className="row-between">
            <h2 style={{ margin: 0 }}>Meus projetos</h2>
            <button type="button" className="btn btn-primary" onClick={() => setEditando('novo')}>
              <Plus size={16} strokeWidth={1.5} /> Novo
            </button>
          </div>

          <input
            placeholder="Buscar projeto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {loading ? (
            <p className="text-dim">Carregando...</p>
          ) : (
            <>
              {STATUS_PROJETO_ORDEM.map((status) => {
                const doGrupo = projetosFiltrados.filter((p) => p.status === status)
                if (doGrupo.length === 0) return null
                return (
                  <section key={status} className="stack" style={{ gap: 6 }}>
                    <h3>{STATUS_PROJETO_LABEL[status]}</h3>
                    <div className="projetos-grid">
                      {doGrupo.map((p) => {
                        const concluidas = p.subtarefas.filter((s) => s.concluida).length
                        const temSubtarefas = p.subtarefas.length > 0
                        const expandido = expandidos.has(p.id)
                        return (
                          <div key={p.id} className="card" style={{ padding: 0, opacity: status === 'cancelado' ? 0.6 : 1 }}>
                            <div
                              className="row-between"
                              style={{ padding: '10px 14px', cursor: 'pointer' }}
                              onClick={() => setEditando(p)}
                            >
                              <div>
                                <p style={{ fontWeight: 600 }}>{p.nome}</p>
                                <p className="text-dim text-sm">
                                  {p.recorrente ? 'Recorrente' : 'Pagamento único'}
                                  {temSubtarefas ? ` · ${concluidas}/${p.subtarefas.length} subtarefas` : ''}
                                </p>
                              </div>
                              {temSubtarefas && (
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 8px' }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    alternarExpandido(p.id)
                                  }}
                                  aria-label={expandido ? 'Recolher subtarefas' : 'Expandir subtarefas'}
                                >
                                  <ChevronDown
                                    size={18}
                                    strokeWidth={1.5}
                                    style={{ transform: expandido ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
                                  />
                                </button>
                              )}
                            </div>
                            {temSubtarefas && expandido && (
                              <div
                                className="stack"
                                style={{ gap: 6, padding: '0 14px 12px', borderTop: '1px solid var(--border)', marginTop: -1, paddingTop: 8 }}
                              >
                                {[...p.subtarefas].sort(compararAtividades).map((s) => {
                                  const vencida = subtarefaVencida(s)
                                  return (
                                    <label
                                      key={s.id}
                                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={s.concluida}
                                        onChange={() => alternarSubtarefaInline(p, s.id)}
                                        style={{ width: 18, height: 18, flexShrink: 0 }}
                                      />
                                      <span
                                        className="text-sm"
                                        style={{
                                          flex: 1,
                                          minWidth: 0,
                                          textDecoration: s.concluida ? 'line-through' : undefined,
                                          opacity: s.concluida ? 0.6 : 1,
                                          color: vencida ? 'var(--danger)' : undefined,
                                        }}
                                      >
                                        {s.nome}
                                      </span>
                                      {s.vencimento && (
                                        <span
                                          className="text-sm"
                                          style={{
                                            whiteSpace: 'nowrap',
                                            color: vencida ? 'var(--danger)' : 'var(--text-dim)',
                                          }}
                                        >
                                          {formatarData(s.vencimento)}
                                        </span>
                                      )}
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}

              {projetos.length === 0 && <p className="text-dim text-center">Nenhum projeto lançado ainda.</p>}
              {projetos.length > 0 && projetosFiltrados.length === 0 && (
                <p className="text-dim text-center">Nenhum projeto encontrado para "{busca.trim()}".</p>
              )}

              <div className="stack" style={{ gap: 6 }}>
                <h3>Lista de atividades</h3>
                {atividades.length === 0 ? (
                  <p className="text-dim text-sm">Nenhuma subtarefa lançada ainda.</p>
                ) : (
                  <div className="card atividades-grid">
                    {atividades.map(({ projeto, subtarefa }) => {
                      const vencida = subtarefaVencida(subtarefa)
                      return (
                        <label key={subtarefa.id} className="atividade-row">
                          <input
                            type="checkbox"
                            checked={subtarefa.concluida}
                            onChange={() => alternarSubtarefaInline(projeto, subtarefa.id)}
                            style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}
                          />
                          <div className="atividade-content">
                            <span
                              className="text-sm"
                              style={{
                                minWidth: 0,
                                textDecoration: subtarefa.concluida ? 'line-through' : undefined,
                                opacity: subtarefa.concluida ? 0.6 : 1,
                                color: vencida ? 'var(--danger)' : undefined,
                              }}
                            >
                              {subtarefa.nome}
                            </span>
                            <div className="atividade-meta">
                              <span
                                style={{
                                  whiteSpace: 'nowrap',
                                  textAlign: 'right',
                                  color: vencida ? 'var(--danger)' : 'var(--text-dim)',
                                }}
                              >
                                {subtarefa.vencimento ? formatarData(subtarefa.vencimento) : '—'}
                              </span>
                              <span style={{ whiteSpace: 'nowrap' }}>{projeto.nome}</span>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

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
                    {tabela.grupos.map((g) => {
                      if (g.linhas.length === 0) return null
                      const colapsado = gruposColapsados.has(g.status)
                      return (
                        <Fragment key={g.status}>
                          <tr
                            className="dre-table-grupo"
                            style={{ cursor: 'pointer' }}
                            onClick={() => alternarGrupoColapsado(g.status)}
                          >
                            <td>
                              <span className="row" style={{ gap: 6, alignItems: 'center' }}>
                                <ChevronDown
                                  size={16}
                                  strokeWidth={1.5}
                                  style={{
                                    transform: colapsado ? 'rotate(-90deg)' : undefined,
                                    transition: 'transform 0.15s',
                                    flexShrink: 0,
                                  }}
                                />
                                {STATUS_PROJETO_LABEL[g.status]}
                              </span>
                            </td>
                            {g.mesesSubtotal.map((v, i) => (
                              <td key={i}>{v !== 0 ? formatarMoeda(v) : '—'}</td>
                            ))}
                          </tr>
                          {!colapsado &&
                            g.linhas.map((l) => (
                              <tr key={l.projeto.id}>
                                <td>{l.projeto.nome}</td>
                                {l.meses.map((v, i) => (
                                  <td key={i}>{v !== 0 ? formatarMoeda(v) : '—'}</td>
                                ))}
                              </tr>
                            ))}
                        </Fragment>
                      )
                    })}
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
      </div>
    </>
  )
}
