import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { Subtarefa } from '../lib/types'

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}

export interface DadosEdicaoAtividade {
  nome: string
  vencimento?: number
  obs?: string
  responsavel?: string
}

export function EditarAtividadeModal({
  subtarefa,
  pessoasDisponiveis,
  onClose,
  onSave,
}: {
  subtarefa: Subtarefa
  pessoasDisponiveis: string[]
  onClose: () => void
  onSave: (dados: DadosEdicaoAtividade) => void
}) {
  const [nome, setNome] = useState(subtarefa.nome)
  const [vencimento, setVencimento] = useState(subtarefa.vencimento ? paraInputDate(subtarefa.vencimento) : '')
  const [obs, setObs] = useState(subtarefa.obs ?? '')
  const [responsavel, setResponsavel] = useState(subtarefa.responsavel ?? '')

  function salvar() {
    const nomeAparado = nome.trim()
    if (!nomeAparado) return
    const dados: DadosEdicaoAtividade = { nome: nomeAparado }
    if (vencimento) dados.vencimento = deInputDate(vencimento)
    if (obs.trim()) dados.obs = obs.trim()
    if (responsavel) dados.responsavel = responsavel
    onSave(dados)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>Editar atividade</h3>
      </div>

      <label>
        Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da atividade" />
      </label>

      <label>
        Vencimento
        <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
      </label>

      <label>
        Responsável
        <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
          <option value="">Ninguém</option>
          {pessoasDisponiveis.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label>
        Observação
        <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
      </label>

      <button type="button" className="btn btn-primary" onClick={salvar}>
        Salvar
      </button>
    </Modal>
  )
}
