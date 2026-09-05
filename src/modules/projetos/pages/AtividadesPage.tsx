import { ChevronRight, Kanban, List, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop'
import { EditarAtividadeModal, type DadosEdicaoAtividade } from '../components/EditarAtividadeModal'
import { EditarSubatividadeModal, type DadosEdicaoSubatividade } from '../components/EditarSubatividadeModal'
import {
  COLUNAS_KANBAN,
  type ColunaKanban,
  colunaKanban,
  compararAtividades,
  subtarefaVencida,
} from '../lib/calculo'
import { getProjetos, atualizarProjeto } from '../lib/projetosApi'
import type { Projeto, Subatividade, Subtarefa } from '../lib/types'

const COR_COLUNA: Record<ColunaKanban, string> = {
  vencido: 'var(--danger)',
  hoje: '#d97706',
  semana: 'var(--blue)',
  em_breve: 'var(--accent)',
  concluido: 'var(--success)',
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
  const [loading, setLoading] = useState(true)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [visao, setVisao] = useState<'lista' | 'kanban'>('lista')
  const [gruposColapsados, setGruposColapsados] = useState<Set<ColunaKanban>>(new Set())
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [novoNome, setNovoNome] = useState('')
  const [novoProjetoId, setNovoProjetoId] = useState('')
  const [novoVencimento, setNovoVencimento] = useState('')
  const [editando, setEditando] = useState<{ projeto: Projeto; subtarefa: Subtarefa } | null>(null)
  const [editandoSub, setEditandoSub] = useState<{ projeto: Projeto; subtarefa: Subtarefa; subatividade: Subatividade } | null>(null)

  useEffect(() => {
    if (!user) return
    getProjetos(user.uid).then((p) => {
      setProjetos(p)
      setLoading(false)
    })
  }, [user])

  const ativos = useMemo(() => projetos.filter((p) => p.status !== 'cancelado'), [projetos])

  const atividades = useMemo(() => {
    const itens = ativos.flatMap((p) => p.subtarefas.map((s) => ({ projeto: p, subtarefa: s })))
    return itens.sort((a, b) => compararAtividades(a.subtarefa, b.subtarefa))
  }, [ativos])

  const kanban = useMemo(
    () =>
      COLUNAS_KANBAN.map((coluna) => ({
        ...coluna,
        itens: atividades.filter(({ subtarefa }) => colunaKanban(subtarefa) === coluna.id),
      })),
    [atividades],
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
      return { ...s, subatividades: subs }
    })
    salvarSubtarefas(projeto, novas)
  }

  function adicionarSubatividade(projeto: Projeto, subtarefaId: string, nome: string, vencimento?: number) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const nova: Subatividade = { id: crypto.randomUUID(), nome, concluida: false }
      if (vencimento) nova.vencimento = vencimento
      return { ...s, subatividades: [...(s.subatividades ?? []), nova] }
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
      return { ...s, subatividades: (s.subatividades ?? []).filter((sub) => sub.id !== subId) }
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
      return atualizado
    })
    salvarSubtarefas(editando.projeto, novas)
  }

  async function adicionarAtividade() {
    const nome = novoNome.trim()
    const projeto = ativos.find((p) => p.id === novoProjetoId)
    if (!nome || !projeto) return
    const nova: Subtarefa = { id: crypto.randomUUID(), nome, concluida: false }
    if (novoVencimento) nova.vencimento = deInputDate(novoVencimento)
    await salvarSubtarefas(projeto, [...projeto.subtarefas, nova])
    setNovoNome('')
    setNovoVencimento('')
  }

  function renderCartao(projeto: Projeto, subtarefa: Subtarefa) {
    const vencida = subtarefaVencida(subtarefa)
    const expandido = expandidos.has(subtarefa.id)
    const subatividades = subtarefa.subatividades ?? []

    return (
      <div key={subtarefa.id} className="card" style={{ padding: '10px 14px' }}>
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <button
            type="button"
            className="atividade-chevron"
            onClick={() => alternarExpandido(subtarefa.id)}
            aria-label={expandido ? 'Recolher subatividades' : 'Expandir subatividades'}
          >
            <ChevronRight size={14} strokeWidth={1.5} style={{ transform: expandido ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} />
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
              <span>{projeto.nome}</span>
              <span style={{ whiteSpace: 'nowrap', color: vencida ? 'var(--danger)' : undefined }}>
                {subtarefa.vencimento ? formatarData(subtarefa.vencimento) : '—'}
                {subatividades.length > 0
                  ? ` · ${subatividades.filter((s) => s.concluida).length}/${subatividades.length}`
                  : ''}
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
          <div style={{ marginTop: 8, paddingLeft: 26, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <PainelSubatividades
              subatividades={subatividades}
              vencimentoMaximo={subtarefa.vencimento}
              onToggle={(id) => alternarSubatividade(projeto, subtarefa.id, id)}
              onAdicionar={(nome, vencimento) => adicionarSubatividade(projeto, subtarefa.id, nome, vencimento)}
              onEditar={(subatividade) => setEditandoSub({ projeto, subtarefa, subatividade })}
              onRemover={(id) => removerSubatividade(projeto, subtarefa.id, id)}
            />
          </div>
        )}
      </div>
    )
  }

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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              adicionarAtividade()
            }
          }}
        />
        <div className="row">
          <select value={novoProjetoId} onChange={(e) => setNovoProjetoId(e.target.value)} style={{ flex: 2 }}>
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
          <button type="button" className="btn" onClick={adicionarAtividade} aria-label="Adicionar atividade">
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : atividades.length === 0 ? (
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
                coluna.itens.map(({ projeto, subtarefa }) => {
                  const vencida = subtarefaVencida(subtarefa)
                  const subatividades = subtarefa.subatividades ?? []
                  return (
                    <label key={subtarefa.id} className="card kanban-cartao">
                      <input
                        type="checkbox"
                        checked={subtarefa.concluida}
                        onChange={() => alternarConcluida(projeto, subtarefa.id)}
                        style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }}
                      />
                      <div style={{ minWidth: 0 }}>
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
                        <p className="text-dim text-sm" style={{ color: vencida ? 'var(--danger)' : undefined }}>
                          {projeto.nome}
                          {subtarefa.vencimento ? ` · ${formatarData(subtarefa.vencimento)}` : ''}
                          {subatividades.length > 0
                            ? ` · ${subatividades.filter((s) => s.concluida).length}/${subatividades.length}`
                            : ''}
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
                {!colapsado && (
                  <div className="stack" style={{ gap: 8 }}>
                    {coluna.itens.map(({ projeto, subtarefa }) => renderCartao(projeto, subtarefa))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {editando && (
        <EditarAtividadeModal
          subtarefa={editando.subtarefa}
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
