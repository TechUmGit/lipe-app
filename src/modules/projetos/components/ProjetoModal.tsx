import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { STATUS_PROJETO_LABEL, STATUS_PROJETO_ORDEM } from '../lib/calculo'
import type { MesAnoRef, NovoProjeto, Projeto, ValorPontual } from '../lib/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

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
    valoresPontuais: [],
    subtarefas: [],
    obs: '',
  }
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Input que formata como moeda enquanto digita — cada dígito entra pela direita, como em app de banco. */
function MoedaInput({
  valor,
  onChange,
  style,
}: {
  valor: number
  onChange: (novoValor: number) => void
  style?: React.CSSProperties
}) {
  const centavos = Math.round(valor * 100)
  const texto = centavos === 0 ? '' : formatarMoeda(centavos / 100)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '')
    const novosCentavos = digitos ? parseInt(digitos, 10) : 0
    onChange(novosCentavos / 100)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="R$ 0,00"
      value={texto}
      onChange={handleChange}
      style={style}
    />
  )
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
  const [valoresPorMes, setValoresPorMes] = useState<number[]>(base.valoresPorMes)
  const [valoresPontuais, setValoresPontuais] = useState<ValorPontual[]>(base.valoresPontuais ?? [])
  const [novoPontualMes, setNovoPontualMes] = useState(paraInputMonth(hoje()))
  const [novoPontualValor, setNovoPontualValor] = useState(0)
  const [obs, setObs] = useState(base.obs ?? '')

  function atualizarValorMes(i: number, novoValor: number) {
    setValoresPorMes((prev) => prev.map((v, idx) => (idx === i ? novoValor : v)))
  }

  function adicionarValorPontual() {
    if (!novoPontualMes || novoPontualValor <= 0) return
    const { mes, ano } = deInputMonth(novoPontualMes)
    setValoresPontuais((prev) => [...prev, { id: crypto.randomUUID(), mes, ano, valor: novoPontualValor }])
    setNovoPontualValor(0)
  }

  function removerValorPontual(id: string) {
    setValoresPontuais((prev) => prev.filter((v) => v.id !== id))
  }

  function salvar() {
    if (!nome.trim()) return
    const dados: NovoProjeto = {
      nome: nome.trim(),
      status,
      recorrente,
      dataInicio: deInputMonth(dataInicio),
      dataFim: recorrente && perpetuo ? null : deInputMonth(dataFim),
      valoresPorMes,
      valoresPontuais,
      subtarefas: base.subtarefas,
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
              <MoedaInput valor={valoresPorMes[i]} onChange={(v) => atualizarValorMes(i, v)} />
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
        <span className="text-dim text-sm">Valor pontual (prêmio ou bônus que não se repete todo ano)</span>
        {valoresPontuais.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {valoresPontuais.map((v) => (
              <div key={v.id} className="row-between card" style={{ padding: '8px 12px' }}>
                <span className="text-sm">
                  {MESES[v.mes - 1]}/{v.ano}
                </span>
                <span className="text-sm" style={{ fontWeight: 600 }}>
                  {formatarMoeda(v.valor)}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px' }}
                  onClick={() => removerValorPontual(v.id)}
                  aria-label="Remover valor pontual"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="row">
          <input
            type="month"
            value={novoPontualMes}
            onChange={(e) => setNovoPontualMes(e.target.value)}
            style={{ flex: 1 }}
          />
          <MoedaInput valor={novoPontualValor} onChange={setNovoPontualValor} style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={adicionarValorPontual} aria-label="Adicionar valor pontual">
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
