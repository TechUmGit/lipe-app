import { ChevronRight, Kanban, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop'
import { CartaoAtividade } from '../components/CartaoAtividade'
import { EditarAtividadeModal, type DadosEdicaoAtividade } from '../components/EditarAtividadeModal'
import { EditarSubatividadeModal } from '../components/EditarSubatividadeModal'
import {
  COLUNAS_KANBAN,
  type ColunaKanban,
  colunaKanban,
  comReferencia,
  compararAtividades,
  dataReferencia,
  geraReceitaDaquiPraFrente,
  normalizar,
  subtarefaVencida,
} from '../lib/calculo'
import { deInputDate, formatarData } from '../lib/datas'
import { useAtividadesMutations } from '../lib/useAtividadesMutations'
import { useProjetosContexto } from '../lib/ProjetosContext'
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
}

export function AtividadesPage() {
  const isDesktop = useIsDesktop()
  const { projetos, loading, busca, filtroReceita } = useProjetosContexto()
  const {
    alternarConcluida,
    removerAtividade,
    alternarSubatividade,
    adicionarSubatividade,
    atualizarSubatividade,
    removerSubatividade,
    salvarEdicaoAtividade,
    adicionarAtividade,
  } = useAtividadesMutations()
  const [visao, setVisao] = useState<'lista' | 'kanban'>('lista')
  const [gruposColapsados, setGruposColapsados] = useState<Set<ColunaKanban>>(new Set())
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [novoNome, setNovoNome] = useState('')
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
        const geraReceita = geraReceitaDaquiPraFrente(p, ANO_ATUAL)
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
        lista.push({ projeto, subtarefa })
      }
    }
    return lista.sort((a, b) => compararAtividades(comReferencia(a.subtarefa), comReferencia(b.subtarefa)))
  }, [ativosFiltrados])

  const kanban = useMemo(
    () =>
      COLUNAS_KANBAN.map((coluna) => ({
        ...coluna,
        itens: itens.filter((item) => colunaKanban(comReferencia(item.subtarefa)) === coluna.id),
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

  function salvarEdicao(dados: DadosEdicaoAtividade) {
    if (!editando) return
    salvarEdicaoAtividade(editando.projeto, editando.subtarefa.id, dados)
  }

  async function handleAdicionarAtividade() {
    const nome = novoNome.trim()
    const projeto = ativos.find((p) => p.id === novoProjetoId)
    if (!nome || !projeto) return
    await adicionarAtividade(projeto, nome, novoVencimento ? deInputDate(novoVencimento) : undefined, novoResponsavel || undefined)
    setNovoNome('')
    setNovoVencimento('')
    setNovoResponsavel('')
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

      <p className="text-dim text-sm">
        Crie a atividade abaixo e depois clique na seta (›) do card dela pra ver e adicionar subatividades.
      </p>

      <div className="stack" style={{ gap: 8 }}>
        <input
          placeholder="Nova atividade..."
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdicionarAtividade()
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
            onClick={handleAdicionarAtividade}
            disabled={!novoNome.trim() || !novoProjetoId}
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
                coluna.itens.map(({ projeto, subtarefa }) => {
                  const referencia = dataReferencia(subtarefa)
                  const vencida = subtarefaVencida(comReferencia(subtarefa))
                  const subatividades = subtarefa.subatividades ?? []
                  const feitas = subatividades.filter((s) => s.concluida).length
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
                          {referencia ? ` · ${formatarData(referencia)}` : ''}
                          {subatividades.length > 0 ? ` · ${feitas}/${subatividades.length}` : ''}
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
                    {coluna.itens.map(({ projeto, subtarefa }) => (
                      <CartaoAtividade
                        key={subtarefa.id}
                        projeto={projeto}
                        subtarefa={subtarefa}
                        expandido={expandidos.has(subtarefa.id)}
                        onToggleExpandir={() => alternarExpandido(subtarefa.id)}
                        onToggleConcluida={() => alternarConcluida(projeto, subtarefa.id)}
                        onEditar={() => setEditando({ projeto, subtarefa })}
                        onRemover={() => removerAtividade(projeto, subtarefa.id)}
                        onToggleSubatividade={(id) => alternarSubatividade(projeto, subtarefa.id, id)}
                        onAdicionarSubatividade={(nome, vencimento, obs) => {
                          adicionarSubatividade(projeto, subtarefa.id, nome, vencimento, obs)
                          setExpandidos((prev) => new Set(prev).add(subtarefa.id))
                        }}
                        onEditarSubatividade={(sub) => setEditandoSub({ projeto, subtarefa, subatividade: sub })}
                        onRemoverSubatividade={(id) => removerSubatividade(projeto, subtarefa.id, id)}
                      />
                    ))}
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
          pessoasDisponiveis={editando.projeto.pessoasEnvolvidas ?? []}
          onClose={() => setEditando(null)}
          onSave={salvarEdicao}
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
