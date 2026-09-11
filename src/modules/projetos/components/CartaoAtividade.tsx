import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { comReferencia, compararAtividades, dataReferencia, subtarefaVencida } from '../lib/calculo'
import { deInputDate, formatarData, paraInputDate } from '../lib/datas'
import type { Projeto, Subatividade, Subtarefa } from '../lib/types'

export function PainelSubatividades({
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
  onAdicionar: (nome: string, vencimento?: number, obs?: string) => void
  onEditar: (subatividade: Subatividade) => void
  onRemover: (id: string) => void
}) {
  const [texto, setTexto] = useState('')
  const [data, setData] = useState('')
  const [obsTexto, setObsTexto] = useState('')
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
    onAdicionar(nome, vencimento, obsTexto.trim() || undefined)
    setTexto('')
    setData('')
    setObsTexto('')
    setErro('')
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      {[...subatividades].sort(compararAtividades).map((sub) => {
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
      <input
        placeholder="Observação (opcional)..."
        value={obsTexto}
        onChange={(e) => setObsTexto(e.target.value)}
        style={{ fontSize: 13 }}
      />
      {erro && <p className="error-text">{erro}</p>}
    </div>
  )
}

export function CartaoAtividade({
  projeto,
  subtarefa,
  expandido,
  mostrarProjeto = true,
  onToggleExpandir,
  onToggleConcluida,
  onEditar,
  onRemover,
  onToggleSubatividade,
  onAdicionarSubatividade,
  onEditarSubatividade,
  onRemoverSubatividade,
}: {
  projeto: Projeto
  subtarefa: Subtarefa
  expandido: boolean
  mostrarProjeto?: boolean
  onToggleExpandir: () => void
  onToggleConcluida: () => void
  onEditar: () => void
  onRemover: () => void
  onToggleSubatividade: (id: string) => void
  onAdicionarSubatividade: (nome: string, vencimento?: number, obs?: string) => void
  onEditarSubatividade: (sub: Subatividade) => void
  onRemoverSubatividade: (id: string) => void
}) {
  const referencia = dataReferencia(subtarefa)
  const vencida = subtarefaVencida(comReferencia(subtarefa))
  const subatividades = subtarefa.subatividades ?? []
  const feitas = subatividades.filter((s) => s.concluida).length

  return (
    <div className="card" style={{ padding: '10px 14px' }}>
      <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
        <button
          type="button"
          className="atividade-chevron"
          onClick={onToggleExpandir}
          aria-label={expandido ? 'Recolher subatividades' : 'Ver subatividades'}
          title={expandido ? 'Recolher subatividades' : 'Ver subatividades'}
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
          onChange={onToggleConcluida}
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
              {mostrarProjeto ? projeto.nome : ''}
              {subtarefa.responsavel ? `${mostrarProjeto ? ' · ' : ''}${subtarefa.responsavel}` : ''}
            </span>
            <span style={{ whiteSpace: 'nowrap', color: vencida ? 'var(--danger)' : undefined }}>
              {referencia ? formatarData(referencia) : '—'}
              {subatividades.length > 0 ? ` · ${feitas}/${subatividades.length}` : ''}
            </span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onEditar} aria-label="Editar atividade">
          <Pencil size={15} strokeWidth={1.5} />
        </button>
        <button type="button" className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onRemover} aria-label="Excluir atividade">
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>
      {expandido && (
        <div style={{ marginTop: 8, marginLeft: 22, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
          <PainelSubatividades
            subatividades={subatividades}
            vencimentoMaximo={subtarefa.vencimento}
            onToggle={onToggleSubatividade}
            onAdicionar={onAdicionarSubatividade}
            onEditar={onEditarSubatividade}
            onRemover={onRemoverSubatividade}
          />
        </div>
      )}
    </div>
  )
}
