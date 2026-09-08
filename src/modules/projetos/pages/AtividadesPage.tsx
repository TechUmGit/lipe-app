import { ChevronRight, Kanban, List, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop'
import { EditarAtividadeModal, type DadosEdicaoAtividade } from '../components/EditarAtividadeModal'
import { EditarSubatividadeModal, type DadosEdicaoSubatividade } from '../components/EditarSubatividadeModal'
import {
  COLUNAS_KANBAN,
  type ColunaKanban,
  colunaKanban,
  comConclusaoAutomatica,
  compararAtividades,
  geraReceitaNoAno,
  normalizar,
  subtarefaVencida,
} from '../lib/calculo'
import { useProjetosContexto } from '../lib/ProjetosContext'
import { atualizarProjeto } from '../lib/projetosApi'
import type { Projeto, Subatividade, Subtarefa } from '../lib/types'

const ANO_ATUAL = new Date().getFullYear()

const COR_COLUNA: Record<ColunaKanban, string> = {
  vencido: 'var(--danger)',
  hoje: '#d97706',
  semana: 'var(--blue)',
  em_breve: 'var(--accent)',
  concluido: 'var(--success)',
}

interface ItemAtividade {
  projeto: Projeto
  subtarefa: Subtarefa
  /** presente quando este item representa uma subatividade, não a atividade em si */
  subatividade?: Subatividade
}

function registroDoItem(item: ItemAtividade): Subtarefa | Subatividade {
  return item.subatividade ?? item.subtarefa
}

function formatarData(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR')
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function PainelSubatividades({
  subatividades,
  vencimentoMaximo,
  onToggle,
  onAdicionar,
  onEditar,
  onRemover,
}: {
  subatividades: Subatividade[]
  vencimentoMaximo?: number
  onToggle: (id: string) => void
  onAdicionar: (nome: string, vencimento?: number) => void
  onEditar: (subatividade: Subatividade) => void
  onRemover: (id: string) => void
}) {
  const [texto, setTexto] = useState('')
  const [data, setData] = useState('')
  const [erro, setErro] = useState('')

  const maxInput = vencimentoMaximo !== undefined ? paraInputDate(vencimentoMaximo - 24 * 60 * 60 * 1000) : undefined

  function adicionar() {
    const nome = texto.trim()
    if (!nome) return
    let vencimento: number | undefined
    if (data) {
      const ms = deInputDate(data)
      if (vencimentoMaximo !== undefined && ms >= vencimentoMaximo) {
        setErro('A validade precisa ser antes do vencimento da atividade.')
        return
      }
      vencimento = ms
    }
    onAdicionar(nome, vencimento)
    setTexto('')
    setData('')
    setErro('')
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      {subatividades.map((sub) => {
        const vencida = !sub.concluida && !!sub.vencimento && sub.vencimento < Date.now()
        return (
          <div key={sub.id} className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={sub.concluida}
              onChange={() => onToggle(sub.id)}
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
            <span
              className="text-sm"
              style={{
                flex: 1,
                textDecoration: sub.concluida ? 'line-through' : undefined,
                opacity: sub.concluida ? 0.6 : 1,
                color: vencida ? 'var(--danger)' : undefined,
              }}
            >
              {sub.nome}
            </span>
            {sub.vencimento && (
              <span className="text-dim text-sm" style={{ whiteSpace: 'nowrap', color: vencida ? 'var(--danger)' : undefined }}>
                {formatarData(sub.vencimento)}
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '2px 6px' }}
              onClick={() => onEditar(sub)}
              aria-label="Editar subatividade"
            >
              <Pencil size={13} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '2px 6px' }}
              onClick={() => onRemover(sub.id)}
              aria-label="Remover subatividade"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        )
      })}
      <div className="row">
        <input
          placeholder="Nova subatividade..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionar()
            }
          }}
          style={{ fontSize: 13, flex: 2 }}
        />
        <input
          type="date"
          value={data}
          onChange={(e) => {
            setData(e.target.value)
            setErro('')
          }}
          max={maxInput}
          style={{ flex: 1, minWidth: 130 }}
          aria-label="Validade da nova subatividade"
        />
        <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={adicionar} aria-label="Adicionar subatividade">
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>
      {erro && <p className="error-text">{erro}</p>}
    </div>
  )
}

export function AtividadesPage() {
  const { user } = useAuth()
  const isDesktop = useIsDesktop()
  const { projetos, setProjetos, loading, busca, filtroReceita } = useProjetosContexto()
  const [visao, setVisao] = useState<'lista' | 'kanban'>('lista')
  const [gruposColapsados, setGruposColapsados] = useState<Set<ColunaKanban>>(new Set())
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [novoNome, setNovoNome] = useState('')
  const [novaPrimeiraSubatividade, setNovaPrimeiraSubatividade] = useState('')
  const [novoProjetoId, setNovoProjetoId] = useState('')
  const [novoVencimento, setNovoVencimento] = useState('')
  const [novoResponsavel, setNovoResponsavel] = useState('')
  const [editando, setEditando] = useState<{ projeto: Projeto; subtarefa: Subtarefa } | null>(null)
  const [editandoSub, setEditandoSub] = useState<{ projeto: Projeto; subtarefa: Subtarefa; subatividade: Subatividade } | null>(null)

  const ativos = useMemo(() => projetos.filter((p) => p.status !== 'cancelado'), [projetos])

  const ativosFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    return ativos.filter((p) => {
      if (termo && !normalizar(p.nome).includes(termo)) return false
      if (filtroReceita !== 'todos') {
        const geraReceita = geraReceitaNoAno(p, ANO_ATUAL)
        if (filtroReceita === 'com_receita' && !geraReceita) return false
        if (filtroReceita === 'sem_receita' && geraReceita) return false
      }
      return true
    })
  }, [ativos, busca, filtroReceita])

  const itens = useMemo(() => {
    const lista: ItemAtividade[] = []
    for (const projeto of ativosFiltrados) {
      for (const subtarefa of projeto.subtarefas) {
        const subatividades = subtarefa.subatividades ?? []
        if (subatividades.length === 0) {
          lista.push({ projeto, subtarefa })
        } else {
          for (const subatividade of subatividades) {
            lista.push({ projeto, subtarefa, subatividade })
          }
        }
      }
    }
    return lista.sort((a, b) => compararAtividades(registroDoItem(a), registroDoItem(b)))
  }, [ativosFiltrados])

  const kanban = useMemo(
    () =>
      COLUNAS_KANBAN.map((coluna) => ({
        ...coluna,
        itens: itens.filter((item) => colunaKanban(registroDoItem(item)) === coluna.id),
      })),
    [itens],
  )

  function alternarGrupoColapsado(id: ColunaKanban) {
    setGruposColapsados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function alternarExpandido(id: string) {
    setExpandidos((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  async function salvarSubtarefas(projeto: Projeto, novasSubtarefas: Subtarefa[]) {
    if (!user) return
    setProjetos((prev) => prev.map((p) => (p.id === projeto.id ? { ...p, subtarefas: novasSubtarefas } : p)))
    await atualizarProjeto(user.uid, projeto.id, { subtarefas: novasSubtarefas })
  }

  function alternarConcluida(projeto: Projeto, subtarefaId: string) {
    const novas = projeto.subtarefas.map((s) => (s.id === subtarefaId ? { ...s, concluida: !s.concluida } : s))
    salvarSubtarefas(projeto, novas)
  }

  function removerAtividade(projeto: Projeto, subtarefaId: string) {
    const novas = projeto.subtarefas.filter((s) => s.id !== subtarefaId)
    salvarSubtarefas(projeto, novas)
  }

  function alternarSubatividade(projeto: Projeto, subtarefaId: string, subId: string) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const subs = (s.subatividades ?? []).map((sub) => (sub.id === subId ? { ...sub, concluida: !sub.concluida } : sub))
      return comConclusaoAutomatica({ ...s, subatividades: subs })
    })
    salvarSubtarefas(projeto, novas)
  }

  function adicionarSubatividade(projeto: Projeto, subtarefaId: string, nome: string, vencimento?: number) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const nova: Subatividade = { id: crypto.randomUUID(), nome, concluida: false }
      if (vencimento) nova.vencimento = vencimento
      return comConclusaoAutomatica({ ...s, subatividades: [...(s.subatividades ?? []), nova] })
    })
    salvarSubtarefas(projeto, novas)
  }

  function atualizarSubatividade(
    projeto: Projeto,
    subtarefaId: string,
    subId: string,
    dados: DadosEdicaoSubatividade,
  ) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const subs = (s.subatividades ?? []).map((sub) => {
        if (sub.id !== subId) return sub
        const atualizado: Subatividade = { ...sub, nome: dados.nome }
        if (dados.vencimento) atualizado.vencimento = dados.vencimento
        else delete atualizado.vencimento
        return atualizado
      })
      return { ...s, subatividades: subs }
    })
    salvarSubtarefas(projeto, novas)
  }

  function removerSubatividade(projeto: Projeto, subtarefaId: string, subId: string) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      return comConclusaoAutomatica({ ...s, subatividades: (s.subatividades ?? []).filter((sub) => sub.id !== subId) })
    })
    salvarSubtarefas(projeto, novas)
  }

  function salvarEdicaoAtividade(dados: DadosEdicaoAtividade) {
    if (!editando) return
    const novas = editando.projeto.subtarefas.map((s) => {
      if (s.id !== editando.subtarefa.id) return s
      const atualizado: Subtarefa = { ...s, nome: dados.nome }
      if (dados.vencimento) atualizado.vencimento = dados.vencimento
      else delete atualizado.vencimento
      if (dados.obs) atualizado.obs = dados.obs
      else delete atualizado.obs
      if (dados.responsavel) atualizado.responsavel = dados.responsavel
      else delete atualizado.responsavel
      if (dados.novasSubatividades && dados.novasSubatividades.length > 0) {
        atualizado.subatividades = [...(atualizado.subatividades ?? []), ...dados.novasSubatividades]
      }
      return comConclusaoAutomatica(atualizado)
    })
    salvarSubtarefas(editando.projeto, novas)
  }

  async function adicionarAtividade() {
    const nome = novoNome.trim()
    const primeiraSubatividade = novaPrimeiraSubatividade.trim()
    const projeto = ativos.find((p) => p.id === novoProjetoId)
    if (!nome || !primeiraSubatividade || !projeto) return
    const nova: Subtarefa = {
      id: crypto.randomUUID(),
      nome,
      concluida: false,
      subatividades: [{ id: crypto.randomUUID(), nome: primeiraSubatividade, concluida: false }],
    }
    if (novoVencimento) nova.vencimento = deInputDate(novoVencimento)
    if (novoResponsavel) nova.responsavel = novoResponsavel
    await salvarSubtarefas(projeto, [...projeto.subtarefas, nova])
    setNovoNome('')
    setNovaPrimeiraSubatividade('')
    setNovoVencimento('')
    setNovoResponsavel('')
  }

  function renderCartao(item: ItemAtividade) {
    const { projeto, subtarefa, subatividade } = item

    if (!subatividade) {
      // Atividade legada sem subatividades ainda — precisa ganhar a primeira pra virar o novo modelo.
      const vencida = subtarefaVencida(subtarefa)
      const expandido = expandidos.has(subtarefa.id)
      return (
        <div key={subtarefa.id} className="card" style={{ padding: '10px 14px' }}>
          <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <button
              type="button"
              className="atividade-chevron"
              onClick={() => alternarExpandido(subtarefa.id)}
              aria-label={expandido ? 'Recolher subatividades' : 'Expandir subatividades'}
            >
              <ChevronRight
                size={14}
                strokeWidth={1.5}
                style={{ transform: expandido ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
              />
            </button>
            <input
              type="checkbox"
              checked={subtarefa.concluida}
              onChange={() => alternarConcluida(projeto, subtarefa.id)}
              style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="text-sm"
                style={{
                  textDecoration: subtarefa.concluida ? 'line-through' : undefined,
                  opacity: subtarefa.concluida ? 0.6 : 1,
                  color: vencida ? 'var(--danger)' : undefined,
                }}
              >
                {subtarefa.nome}
              </p>
              <div className="row-between text-dim text-sm">
                <span>
                  {projeto.nome}
                  {subtarefa.responsavel ? ` · ${subtarefa.responsavel}` : ''}
                </span>
                <span style={{ whiteSpace: 'nowrap', color: vencida ? 'var(--danger)' : undefined }}>
                  {subtarefa.vencimento ? formatarData(subtarefa.vencimento) : '—'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '4px 8px' }}
              onClick={() => setEditando({ projeto, subtarefa })}
              aria-label="Editar atividade"
            >
              <Pencil size={15} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '4px 8px' }}
              onClick={() => removerAtividade(projeto, subtarefa.id)}
              aria-label="Excluir atividade"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </div>
          {expandido && (
            <div style={{ marginTop: 8, marginLeft: 22, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
              <PainelSubatividades
                subatividades={[]}
                vencimentoMaximo={subtarefa.vencimento}
                onToggle={(id) => alternarSubatividade(projeto, subtarefa.id, id)}
                onAdicionar={(nome, vencimento) => adicionarSubatividade(projeto, subtarefa.id, nome, vencimento)}
                onEditar={(sub) => setEditandoSub({ projeto, subtarefa, subatividade: sub })}
                onRemover={(id) => removerSubatividade(projeto, subtarefa.id, id)}
              />
            </div>
          )}
        </div>
      )
    }

    // Subatividade — a unidade de trabalho de verdade, cada uma com sua própria data.
    const vencida = subtarefaVencida(subatividade)
    return (
      <div key={subatividade.id} className="card" style={{ padding: '10px 14px' }}>
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={subatividade.concluida}
            onChange={() => alternarSubatividade(projeto, subtarefa.id, subatividade.id)}
            style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              className="text-sm"
              style={{
                textDecoration: subatividade.concluida ? 'line-through' : undefined,
                opacity: subatividade.concluida ? 0.6 : 1,
                color: vencida ? 'var(--danger)' : undefined,
              }}
            >
              {subatividade.nome}
            </p>
            <div className="row-between text-dim text-sm">
              <span>
                <span
                  onClick={() => setEditando({ projeto, subtarefa })}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {subtarefa.nome}
                </span>
                {' · '}
                {projeto.nome}
                {subtarefa.responsavel ? ` · ${subtarefa.responsavel}` : ''}
              </span>
              <span style={{ whiteSpace: 'nowrap', color: vencida ? 'var(--danger)' : undefined }}>
                {subatividade.vencimento ? formatarData(subatividade.vencimento) : '—'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '4px 8px' }}
            onClick={() => setEditandoSub({ projeto, subtarefa, subatividade })}
            aria-label="Editar subatividade"
          >
            <Pencil size={15} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '4px 8px' }}
            onClick={() => removerSubatividade(projeto, subtarefa.id, subatividade.id)}
            aria-label="Excluir subatividade"
          >
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    )
  }

  const pessoasDoNovoProjeto = ativos.find((p) => p.id === novoProjetoId)?.pessoasEnvolvidas ?? []

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Atividades</h2>
        {isDesktop && (
          <div className="row" style={{ gap: 4 }}>
            <button
              type="button"
              className={`btn ${visao === 'lista' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 10px' }}
              onClick={() => setVisao('lista')}
              aria-label="Ver em lista"
            >
              <List size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className={`btn ${visao === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 10px' }}
              onClick={() => setVisao('kanban')}
              aria-label="Ver em kanban"
            >
              <Kanban size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <input
          placeholder="Nova atividade..."
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
        />
        <input
          placeholder="Primeira subatividade (obrigatória)..."
          value={novaPrimeiraSubatividade}
          onChange={(e) => setNovaPrimeiraSubatividade(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionarAtividade()
            }
          }}
        />
        <div className="row">
          <select
            value={novoProjetoId}
            onChange={(e) => {
              setNovoProjetoId(e.target.value)
              setNovoResponsavel('')
            }}
            style={{ flex: 2 }}
          >
            <option value="">Projeto...</option>
            {ativos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={novoVencimento}
            onChange={(e) => setNovoVencimento(e.target.value)}
            style={{ flex: 1, minWidth: 130 }}
            aria-label="Vencimento da nova atividade"
          />
          <button
            type="button"
            className="btn"
            onClick={adicionarAtividade}
            disabled={!novoNome.trim() || !novaPrimeiraSubatividade.trim() || !novoProjetoId}
            aria-label="Adicionar atividade"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
        {pessoasDoNovoProjeto.length > 0 && (
          <select value={novoResponsavel} onChange={(e) => setNovoResponsavel(e.target.value)} aria-label="Responsável pela nova atividade">
            <option value="">Responsável...</option>
            {pessoasDoNovoProjeto.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : itens.length === 0 ? (
        <p className="text-dim text-sm">Nenhuma atividade lançada ainda.</p>
      ) : visao === 'kanban' && isDesktop ? (
        <div className="kanban-board">
          {kanban.map((coluna) => (
            <div key={coluna.id} className="kanban-coluna">
              <div className="row-between">
                <span className="text-sm" style={{ fontWeight: 600 }}>
                  {coluna.label}
                </span>
                <span className="text-dim text-sm">{coluna.itens.length}</span>
              </div>
              {coluna.itens.length === 0 ? (
                <p className="text-dim text-sm">—</p>
              ) : (
                coluna.itens.map((item) => {
                  const registro = registroDoItem(item)
                  const vencida = subtarefaVencida(registro)
                  return (
                    <label
                      key={item.subatividade ? item.subatividade.id : item.subtarefa.id}
                      className="card kanban-cartao"
                    >
                      <input
                        type="checkbox"
                        checked={registro.concluida}
                        onChange={() =>
                          item.subatividade
                            ? alternarSubatividade(item.projeto, item.subtarefa.id, item.subatividade.id)
                            : alternarConcluida(item.projeto, item.subtarefa.id)
                        }
                        style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <p
                          className="text-sm"
                          style={{
                            textDecoration: registro.concluida ? 'line-through' : undefined,
                            opacity: registro.concluida ? 0.6 : 1,
                            color: vencida ? 'var(--danger)' : undefined,
                          }}
                        >
                          {item.subatividade ? item.subatividade.nome : item.subtarefa.nome}
                        </p>
                        <p className="text-dim text-sm" style={{ color: vencida ? 'var(--danger)' : undefined }}>
                          {item.subatividade ? `${item.subtarefa.nome} · ${item.projeto.nome}` : item.projeto.nome}
                          {registro.vencimento ? ` · ${formatarData(registro.vencimento)}` : ''}
                        </p>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="stack" style={{ gap: 16 }}>
          {kanban.map((coluna) => {
            if (coluna.itens.length === 0) return null
            const colapsado = gruposColapsados.has(coluna.id)
            return (
              <div key={coluna.id} className="stack" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="status-pill"
                  style={{ background: COR_COLUNA[coluna.id] }}
                  onClick={() => alternarGrupoColapsado(coluna.id)}
                >
                  <ChevronRight size={14} strokeWidth={2} style={{ transform: colapsado ? undefined : 'rotate(90deg)', transition: 'transform 0.15s' }} />
                  {coluna.label.toUpperCase()}
                  <span className="status-pill-count">{coluna.itens.length}</span>
                </button>
                {!colapsado && <div className="stack" style={{ gap: 8 }}>{coluna.itens.map((item) => renderCartao(item))}</div>}
              </div>
            )
          })}
        </div>
      )}

      {editando && (
        <EditarAtividadeModal
          subtarefa={editando.subtarefa}
          pessoasDisponiveis={editando.projeto.pessoasEnvolvidas ?? []}
          onClose={() => setEditando(null)}
          onSave={salvarEdicaoAtividade}
        />
      )}

      {editandoSub && (
        <EditarSubatividadeModal
          subatividade={editandoSub.subatividade}
          vencimentoMaximo={editandoSub.subtarefa.vencimento}
          onClose={() => setEditandoSub(null)}
          onSave={(dados) => atualizarSubatividade(editandoSub.projeto, editandoSub.subtarefa.id, editandoSub.subatividade.id, dados)}
        />
      )}
    </div>
  )
}
