import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { MESES } from './MonthSwitcher'
import { STATUS_PROJETO_LABEL, STATUS_PROJETO_ORDEM } from '../lib/projetos'
import type { MesAnoRef, NovoProjeto, Projeto, Subtarefa } from '../lib/types'

function paraInputMonth(m: MesAnoRef) {
  return `${m.ano}-${String(m.mes).padStart(2, '0')}`
}

function deInputMonth(valor: string): MesAnoRef {
  const [ano, mes] = valor.split('-').map(Number)
  return { mes, ano }
}

function hoje(): MesAnoRef {
  const d = new Date()
  return { mes: d.getMonth() + 1, ano: d.getFullYear() }
}

function projetoInicial(): NovoProjeto {
  return {
    nome: '',
    status: 'negociacao',
    recorrente: false,
    dataInicio: hoje(),
    dataFim: hoje(),
    valoresPorMes: new Array(12).fill(0),
    subtarefas: [],
    obs: '',
  }
}

export function ProjetoModal({
  projeto,
  onClose,
  onSave,
  onDelete,
}: {
  projeto: Projeto | null
  onClose: () => void
  onSave: (dados: NovoProjeto) => void
  onDelete?: () => void
}) {
  const base = projeto ?? projetoInicial()
  const [nome, setNome] = useState(base.nome)
  const [status, setStatus] = useState<Projeto['status']>(base.status)
  const [recorrente, setRecorrente] = useState(base.recorrente)
  const [dataInicio, setDataInicio] = useState(paraInputMonth(base.dataInicio))
  const [perpetuo, setPerpetuo] = useState(base.recorrente && base.dataFim === null)
  const [dataFim, setDataFim] = useState(paraInputMonth(base.dataFim ?? base.dataInicio))
  const [valoresTexto, setValoresTexto] = useState<string[]>(
    base.valoresPorMes.map((v) => (v ? String(v) : '')),
  )
  const [subtarefas, setSubtarefas] = useState<Subtarefa[]>(base.subtarefas)
  const [novaSubtarefa, setNovaSubtarefa] = useState('')
  const [obs, setObs] = useState(base.obs ?? '')

  function atualizarValorMes(i: number, texto: string) {
    setValoresTexto((prev) => prev.map((v, idx) => (idx === i ? texto : v)))
  }

  function adicionarSubtarefa() {
    const nomeSub = novaSubtarefa.trim()
    if (!nomeSub) return
    setSubtarefas((prev) => [...prev, { id: crypto.randomUUID(), nome: nomeSub, concluida: false }])
    setNovaSubtarefa('')
  }

  function alternarSubtarefa(id: string) {
    setSubtarefas((prev) => prev.map((s) => (s.id === id ? { ...s, concluida: !s.concluida } : s)))
  }

  function removerSubtarefa(id: string) {
    setSubtarefas((prev) => prev.filter((s) => s.id !== id))
  }

  function salvar() {
    if (!nome.trim()) return
    const dados: NovoProjeto = {
      nome: nome.trim(),
      status,
      recorrente,
      dataInicio: deInputMonth(dataInicio),
      dataFim: recorrente && perpetuo ? null : deInputMonth(dataFim),
      valoresPorMes: valoresTexto.map((v) => Math.max(0, Number(v) || 0)),
      subtarefas,
      obs: obs.trim(),
    }
    onSave(dados)
    onClose()
  }

  function excluir() {
    if (!onDelete) return
    if (confirm('Excluir esse projeto?')) {
      onDelete()
      onClose()
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>{projeto ? 'Editar projeto' : 'Novo projeto'}</h3>
      </div>

      <label>
        Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do projeto" />
      </label>

      <div className="row">
        <label style={{ flex: 1 }}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Projeto['status'])}>
            {STATUS_PROJETO_ORDEM.map((s) => (
              <option key={s} value={s}>
                {STATUS_PROJETO_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <button
          type="button"
          className={`chip ${recorrente ? 'active' : ''}`}
          onClick={() => setRecorrente((r) => !r)}
        >
          {recorrente ? '✓ ' : ''}Recorrente (o padrão de meses se repete todo ano)
        </button>
      </div>

      <div className="row">
        <label style={{ flex: 1 }}>
          Início
          <input type="month" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </label>
        {!(recorrente && perpetuo) && (
          <label style={{ flex: 1 }}>
            Fim
            <input type="month" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </label>
        )}
      </div>

      {recorrente && (
        <button
          type="button"
          className={`chip ${perpetuo ? 'active' : ''}`}
          onClick={() => setPerpetuo((p) => !p)}
        >
          {perpetuo ? '✓ ' : ''}Perpétuo (sem data de término)
        </button>
      )}

      <div className="stack" style={{ gap: 6 }}>
        <span className="text-dim text-sm">Valor esperado por mês (R$)</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {MESES.map((m, i) => (
            <label key={m} style={{ width: 'calc(33.33% - 6px)' }}>
              {m.slice(0, 3)}
              <input
                type="number"
                min={0}
                placeholder="0"
                value={valoresTexto[i]}
                onChange={(e) => atualizarValorMes(i, e.target.value)}
              />
            </label>
          ))}
        </div>
        <p className="text-dim text-sm">
          {recorrente
            ? 'Esse padrão de meses se repete em todo ano dentro do período de vigência.'
            : 'Marque só os meses em que esse projeto realmente paga, dentro do período acima.'}
        </p>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <span className="text-dim text-sm">Subtarefas</span>
        {subtarefas.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {subtarefas.map((s) => (
              <div key={s.id} className="row-between card" style={{ padding: '8px 12px' }}>
                <label className="row" style={{ gap: 8, flex: 1, cursor: 'pointer' }}>
                  <input type="checkbox" checked={s.concluida} onChange={() => alternarSubtarefa(s.id)} />
                  <span
                    className="text-sm"
                    style={{ textDecoration: s.concluida ? 'line-through' : undefined, opacity: s.concluida ? 0.6 : 1 }}
                  >
                    {s.nome}
                  </span>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px' }}
                  onClick={() => removerSubtarefa(s.id)}
                  aria-label="Remover subtarefa"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="row">
          <input
            placeholder="Nova subtarefa..."
            value={novaSubtarefa}
            onChange={(e) => setNovaSubtarefa(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarSubtarefa()
              }
            }}
          />
          <button type="button" className="btn" onClick={adicionarSubtarefa} aria-label="Adicionar subtarefa">
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <label>
        Observações
        <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
      </label>

      <div className="row">
        {onDelete && (
          <button type="button" className="btn btn-ghost" onClick={excluir}>
            Excluir
          </button>
        )}
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={salvar}>
          Salvar
        </button>
      </div>
    </Modal>
  )
}
