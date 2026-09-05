import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { Subatividade } from '../lib/types'

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}

export interface DadosEdicaoSubatividade {
  nome: string
  vencimento?: number
}

export function EditarSubatividadeModal({
  subatividade,
  vencimentoMaximo,
  onClose,
  onSave,
}: {
  subatividade: Subatividade
  vencimentoMaximo?: number
  onClose: () => void
  onSave: (dados: DadosEdicaoSubatividade) => void
}) {
  const [nome, setNome] = useState(subatividade.nome)
  const [vencimento, setVencimento] = useState(subatividade.vencimento ? paraInputDate(subatividade.vencimento) : '')
  const [erro, setErro] = useState('')

  const maxInput = vencimentoMaximo !== undefined ? paraInputDate(vencimentoMaximo - 24 * 60 * 60 * 1000) : undefined

  function salvar() {
    const nomeAparado = nome.trim()
    if (!nomeAparado) return
    const dados: DadosEdicaoSubatividade = { nome: nomeAparado }
    if (vencimento) {
      const ms = deInputDate(vencimento)
      if (vencimentoMaximo !== undefined && ms >= vencimentoMaximo) {
        setErro('A validade precisa ser antes do vencimento da atividade principal.')
        return
      }
      dados.vencimento = ms
    }
    onSave(dados)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>Editar subatividade</h3>
      </div>

      <label>
        Nome
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da subatividade" />
      </label>

      <label>
        Validade
        <input
          type="date"
          value={vencimento}
          onChange={(e) => {
            setVencimento(e.target.value)
            setErro('')
          }}
          max={maxInput}
        />
      </label>
      {vencimentoMaximo !== undefined && (
        <p className="text-dim text-sm">
          Precisa ser antes de {new Date(vencimentoMaximo).toLocaleDateString('pt-BR')} (vencimento da atividade).
        </p>
      )}
      {erro && <p className="error-text">{erro}</p>}

      <button type="button" className="btn btn-primary" onClick={salvar}>
        Salvar
      </button>
    </Modal>
  )
}
