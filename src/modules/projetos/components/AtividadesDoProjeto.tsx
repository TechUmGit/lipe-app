import { ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { COLUNAS_KANBAN, type ColunaKanban, colunaKanban, comReferencia, compararAtividades } from '../lib/calculo'
import { deInputDate } from '../lib/datas'
import { useAtividadesMutations } from '../lib/useAtividadesMutations'
import type { Projeto, Subatividade, Subtarefa } from '../lib/types'
import { CartaoAtividade } from './CartaoAtividade'
import { EditarAtividadeModal } from './EditarAtividadeModal'
import { EditarSubatividadeModal } from './EditarSubatividadeModal'

const COR_COLUNA: Record<ColunaKanban, string> = {
  vencido: 'var(--danger)',
  hoje: '#d97706',
  semana: 'var(--blue)',
  em_breve: 'var(--accent)',
  concluido: 'var(--success)',
}

export function AtividadesDoProjeto({ projeto }: { projeto: Projeto }) {
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

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [gruposColapsados, setGruposColapsados] = useState<Set<ColunaKanban>>(new Set())
  const [novoNome, setNovoNome] = useState('')
  const [novoVencimento, setNovoVencimento] = useState('')
  const [novoResponsavel, setNovoResponsavel] = useState('')
  const [editando, setEditando] = useState<Subtarefa | null>(null)
  const [editandoSub, setEditandoSub] = useState<{ subtarefa: Subtarefa; subatividade: Subatividade } | null>(null)

  const kanban = useMemo(() => {
    const ordenadas = [...projeto.subtarefas].sort((a, b) => compararAtividades(comReferencia(a), comReferencia(b)))
    return COLUNAS_KANBAN.map((coluna) => ({
      ...coluna,
      itens: ordenadas.filter((s) => colunaKanban(comReferencia(s)) === coluna.id),
    }))
  }, [projeto.subtarefas])

  function alternarExpandido(id: string) {
    setExpandidos((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function alternarGrupoColapsado(id: ColunaKanban) {
    setGruposColapsados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  function handleAdicionar() {
    const nome = novoNome.trim()
    if (!nome) return
    adicionarAtividade(projeto, nome, novoVencimento ? deInputDate(novoVencimento) : undefined, novoResponsavel || undefined)
    setNovoNome('')
    setNovoVencimento('')
    setNovoResponsavel('')
  }

  const pessoas = projeto.pessoasEnvolvidas ?? []

  return (
    <div className="stack" style={{ gap: 12 }}>
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
              handleAdicionar()
            }
          }}
        />
        <div className="row">
          <input
            type="date"
            value={novoVencimento}
            onChange={(e) => setNovoVencimento(e.target.value)}
            style={{ flex: 1, minWidth: 130 }}
            aria-label="Vencimento da nova atividade"
          />
          {pessoas.length > 0 && (
            <select
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              style={{ flex: 1 }}
              aria-label="Responsável pela nova atividade"
            >
              <option value="">Responsável...</option>
              {pessoas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn" onClick={handleAdicionar} disabled={!novoNome.trim()} aria-label="Adicionar atividade">
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {projeto.subtarefas.length === 0 ? (
        <p className="text-dim text-sm">Nenhuma atividade lançada ainda.</p>
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
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    style={{ transform: colapsado ? undefined : 'rotate(90deg)', transition: 'transform 0.15s' }}
                  />
                  {coluna.label.toUpperCase()}
                  <span className="status-pill-count">{coluna.itens.length}</span>
                </button>
                {!colapsado && (
                  <div className="stack" style={{ gap: 8 }}>
                    {coluna.itens.map((subtarefa) => (
                      <CartaoAtividade
                        key={subtarefa.id}
                        projeto={projeto}
                        subtarefa={subtarefa}
                        mostrarProjeto={false}
                        expandido={expandidos.has(subtarefa.id)}
                        onToggleExpandir={() => alternarExpandido(subtarefa.id)}
                        onToggleConcluida={() => alternarConcluida(projeto, subtarefa.id)}
                        onEditar={() => setEditando(subtarefa)}
                        onRemover={() => removerAtividade(projeto, subtarefa.id)}
                        onToggleSubatividade={(id) => alternarSubatividade(projeto, subtarefa.id, id)}
                        onAdicionarSubatividade={(nome, vencimento, obs) => {
                          adicionarSubatividade(projeto, subtarefa.id, nome, vencimento, obs)
                          setExpandidos((prev) => new Set(prev).add(subtarefa.id))
                        }}
                        onEditarSubatividade={(sub) => setEditandoSub({ subtarefa, subatividade: sub })}
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
          subtarefa={editando}
          pessoasDisponiveis={pessoas}
          onClose={() => setEditando(null)}
          onSave={(dados) => salvarEdicaoAtividade(projeto, editando.id, dados)}
        />
      )}

      {editandoSub && (
        <EditarSubatividadeModal
          subatividade={editandoSub.subatividade}
          vencimentoMaximo={editandoSub.subtarefa.vencimento}
          onClose={() => setEditandoSub(null)}
          onSave={(dados) => atualizarSubatividade(projeto, editandoSub.subtarefa.id, editandoSub.subatividade.id, dados)}
        />
      )}
    </div>
  )
}
