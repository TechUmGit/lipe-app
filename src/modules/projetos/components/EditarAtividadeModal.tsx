import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import type { Subatividade, Subtarefa } from '../lib/types'

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}

function formatarData(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR')
}

export interface DadosEdicaoAtividade {
  nome: string
  vencimento?: number
  obs?: string
  responsavel?: string
  novasSubatividades?: Subatividade[]
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
  const [novasSubatividades, setNovasSubatividades] = useState<Subatividade[]>([])
  const [textoNovaSub, setTextoNovaSub] = useState('')
  const [dataNovaSub, setDataNovaSub] = useState('')
  const [obsNovaSub, setObsNovaSub] = useState('')
  const [erroSub, setErroSub] = useState('')

  const vencimentoMs = vencimento ? deInputDate(vencimento) : undefined
  const maxSubInput = vencimentoMs !== undefined ? paraInputDate(vencimentoMs - 24 * 60 * 60 * 1000) : undefined

  function adicionarSubatividadeLocal() {
    const nomeSub = textoNovaSub.trim()
    if (!nomeSub) return
    const nova: Subatividade = { id: crypto.randomUUID(), nome: nomeSub, concluida: false }
    if (dataNovaSub) {
      const ms = deInputDate(dataNovaSub)
      if (vencimentoMs !== undefined && ms >= vencimentoMs) {
        setErroSub('A validade precisa ser antes do vencimento da atividade.')
        return
      }
      nova.vencimento = ms
    }
    if (obsNovaSub.trim()) nova.obs = obsNovaSub.trim()
    setNovasSubatividades((prev) => [...prev, nova])
    setTextoNovaSub('')
    setDataNovaSub('')
    setObsNovaSub('')
    setErroSub('')
  }

  function removerSubatividadeLocal(id: string) {
    setNovasSubatividades((prev) => prev.filter((s) => s.id !== id))
  }

  function salvar() {
    const nomeAparado = nome.trim()
    if (!nomeAparado) return
    const dados: DadosEdicaoAtividade = { nome: nomeAparado }
    if (vencimento) dados.vencimento = deInputDate(vencimento)
    if (obs.trim()) dados.obs = obs.trim()
    if (responsavel) dados.responsavel = responsavel
    if (novasSubatividades.length > 0) dados.novasSubatividades = novasSubatividades
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

      <div className="stack" style={{ gap: 6 }}>
        <span className="text-dim text-sm">Adicionar subatividade</span>
        {novasSubatividades.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {novasSubatividades.map((s) => (
              <div key={s.id} className="row-between card" style={{ padding: '8px 12px' }}>
                <span className="text-sm">
                  {s.nome}
                  {s.vencimento ? ` · ${formatarData(s.vencimento)}` : ''}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px' }}
                  onClick={() => removerSubatividadeLocal(s.id)}
                  aria-label="Remover subatividade"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="row">
          <input
            placeholder="Nome da subatividade..."
            value={textoNovaSub}
            onChange={(e) => setTextoNovaSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarSubatividadeLocal()
              }
            }}
            style={{ flex: 2 }}
          />
          <input
            type="date"
            value={dataNovaSub}
            onChange={(e) => {
              setDataNovaSub(e.target.value)
              setErroSub('')
            }}
            max={maxSubInput}
            style={{ flex: 1, minWidth: 130 }}
            aria-label="Validade da nova subatividade"
          />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '4px 8px' }}
            onClick={adicionarSubatividadeLocal}
            aria-label="Adicionar subatividade"
          >
            <Plus size={16} strokeWidth={1.5} />
          </button>
        </div>
        <input
          placeholder="Observação (opcional)..."
          value={obsNovaSub}
          onChange={(e) => setObsNovaSub(e.target.value)}
          style={{ fontSize: 13 }}
        />
        {erroSub && <p className="error-text">{erroSub}</p>}
      </div>

      <button type="button" className="btn btn-primary" onClick={salvar}>
        Salvar
      </button>
    </Modal>
  )
}
