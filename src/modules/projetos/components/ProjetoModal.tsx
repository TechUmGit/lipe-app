import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { STATUS_PROJETO_LABEL, STATUS_PROJETO_ORDEM, compararAtividades, subtarefaVencida } from '../lib/calculo'
import type { MesAnoRef, NovoProjeto, Projeto, Subtarefa, ValorPontual } from '../lib/types'

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

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
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
  const [subtarefas, setSubtarefas] = useState<Subtarefa[]>(base.subtarefas)
  const [novaSubtarefa, setNovaSubtarefa] = useState('')
  const [novaSubtarefaVencimento, setNovaSubtarefaVencimento] = useState('')
  const [valoresPontuais, setValoresPontuais] = useState<ValorPontual[]>(base.valoresPontuais ?? [])
  const [novoPontualMes, setNovoPontualMes] = useState(paraInputMonth(hoje()))
  const [novoPontualValor, setNovoPontualValor] = useState(0)
  const [obs, setObs] = useState(base.obs ?? '')

  function atualizarValorMes(i: number, novoValor: number) {
    setValoresPorMes((prev) => prev.map((v, idx) => (idx === i ? novoValor : v)))
  }

  function adicionarSubtarefa() {
    const nomeSub = novaSubtarefa.trim()
    if (!nomeSub) return
    const nova: Subtarefa = { id: crypto.randomUUID(), nome: nomeSub, concluida: false }
    if (novaSubtarefaVencimento) nova.vencimento = deInputDate(novaSubtarefaVencimento)
    setSubtarefas((prev) => [...prev, nova])
    setNovaSubtarefa('')
    setNovaSubtarefaVencimento('')
  }

  function alternarSubtarefa(id: string) {
    setSubtarefas((prev) => prev.map((s) => (s.id === id ? { ...s, concluida: !s.concluida } : s)))
  }

  function atualizarNomeSubtarefa(id: string, nomeNovo: string) {
    setSubtarefas((prev) => prev.map((s) => (s.id === id ? { ...s, nome: nomeNovo } : s)))
  }

  function atualizarVencimentoSubtarefa(id: string, valorNovo: string) {
    setSubtarefas((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const atualizado = { ...s }
        if (valorNovo) atualizado.vencimento = deInputDate(valorNovo)
        else delete atualizado.vencimento
        return atualizado
      }),
    )
  }

  function removerSubtarefa(id: string) {
    setSubtarefas((prev) => prev.filter((s) => s.id !== id))
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

      <div className="stack" style={{ gap: 6 }}>
        <span className="text-dim text-sm">Subtarefas</span>
        {subtarefas.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {[...subtarefas].sort(compararAtividades).map((s) => {
              const vencida = subtarefaVencida(s)
              return (
                <div key={s.id} className="row-between card" style={{ padding: '8px 12px' }}>
                  <input
                    type="checkbox"
                    checked={s.concluida}
                    onChange={() => alternarSubtarefa(s.id)}
                    style={{ width: 18, height: 18, flexShrink: 0 }}
                  />
                  <input
                    type="text"
                    value={s.nome}
                    onChange={(e) => atualizarNomeSubtarefa(s.id, e.target.value)}
                    style={{
                      flex: 1,
                      textDecoration: s.concluida ? 'line-through' : undefined,
                      opacity: s.concluida ? 0.6 : 1,
                      color: vencida ? 'var(--danger)' : undefined,
                    }}
                  />
                  <input
                    type="date"
                    value={s.vencimento ? paraInputDate(s.vencimento) : ''}
                    onChange={(e) => atualizarVencimentoSubtarefa(s.id, e.target.value)}
                    style={{ width: 150, color: vencida ? 'var(--danger)' : undefined }}
                  />
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
              )
            })}
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
          <input
            type="date"
            value={novaSubtarefaVencimento}
            onChange={(e) => setNovaSubtarefaVencimento(e.target.value)}
            style={{ width: 150 }}
            aria-label="Vencimento da nova subtarefa"
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
