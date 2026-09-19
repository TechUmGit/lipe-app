import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { MoedaInput, MoedaInputComSinal } from '../../../shared/components/MoedaInput'
import { rotuloMes, type LinhaPerspectiva } from '../lib/perspectivaCalculo'
import type { MesPerspectiva } from '../lib/types'
import { formatarMoeda } from './Moeda'

export interface PadraoDoMes {
  consorcios: number
  retiradas: number
}

export function PerspectivaMesModal({
  linha,
  padrao,
  sugerirPreenchido,
  onClose,
  onSave,
}: {
  linha: LinhaPerspectiva
  /** Valores que o mês teria sem nada digitado (regra padrão da projeção). */
  padrao: PadraoDoMes
  /** Abre já com "preenchido" marcado (mês que é o próximo da fila). */
  sugerirPreenchido: boolean
  onClose: () => void
  onSave: (dados: MesPerspectiva | null) => void
}) {
  const [preenchido, setPreenchido] = useState(linha.preenchido || sugerirPreenchido)
  const [retiradas, setRetiradas] = useState(linha.retiradas)
  const [retiradasAuto, setRetiradasAuto] = useState(linha.retiradasAutomatico && !linha.preenchido)
  const [consorcios, setConsorcios] = useState(linha.consorcios)
  const [consorciosAuto, setConsorciosAuto] = useState(linha.consorciosAutomatico && !linha.preenchido)
  const [xCapital, setXCapital] = useState(linha.xCapital)
  const [investimentos, setInvestimentos] = useState(linha.investimentos)
  const [custodiaFillipe, setCustodiaFillipe] = useState(linha.preenchido ? linha.custodiaFillipe : 0)
  const [custodiaOutros, setCustodiaOutros] = useState(linha.preenchido ? linha.custodiaOutros : 0)
  const [reinicios, setReinicios] = useState({ retiradas: 0, consorcios: 0 })

  function salvar() {
    const dados: MesPerspectiva = {}
    if (preenchido) {
      dados.preenchido = true
      dados.investimentos = investimentos
      dados.consorcios = consorcios
      dados.retiradas = retiradas
      dados.xCapital = xCapital
      dados.custodiaFillipe = custodiaFillipe
      dados.custodiaOutros = custodiaOutros
    } else {
      if (investimentos !== 0) dados.investimentos = investimentos
      if (!consorciosAuto) dados.consorcios = consorcios
      if (!retiradasAuto) dados.retiradas = retiradas
      if (xCapital !== 0) dados.xCapital = xCapital
    }
    onSave(Object.keys(dados).length > 0 ? dados : null)
    onClose()
  }

  const pendente = !preenchido
  const semCustodia = preenchido && custodiaFillipe === 0 && custodiaOutros === 0

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>{linha.preenchido ? 'Editar' : 'Preencher'} {rotuloMes(linha.chave)}</h3>
        <p className="text-dim text-sm">
          {pendente
            ? 'Mês ainda em projeção: ajuste o que você planeja movimentar. Retiradas e consórcios em automático seguem a regra padrão.'
            : 'Informe o que realmente aconteceu no mês e o saldo das custódias.'}
        </p>
      </div>

      <div className="campo">
        <span className="row-between">
          Retiradas mensais
          {pendente && retiradasAuto && <span className="text-dim text-sm">automático (corrige pela inflação)</span>}
          {pendente && !retiradasAuto && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '0 6px', fontSize: 12 }}
              onClick={() => {
                setRetiradasAuto(true)
                setRetiradas(padrao.retiradas)
                setReinicios((r) => ({ ...r, retiradas: r.retiradas + 1 }))
              }}
            >
              ↺ voltar ao automático
            </button>
          )}
        </span>
        <MoedaInputComSinal
          selecionarAoFocar
          key={`ret-${reinicios.retiradas}`}
          valor={retiradas}
          negativoPorPadrao
          onChange={(v) => {
            setRetiradas(v)
            setRetiradasAuto(false)
          }}
        />
      </div>

      <div className="campo">
        X Capital
        <MoedaInputComSinal selecionarAoFocar valor={xCapital} onChange={setXCapital} />
      </div>

      <div className="campo">
        <span className="row-between">
          Consórcios
          {pendente && consorciosAuto && <span className="text-dim text-sm">automático (repete o mês anterior)</span>}
          {pendente && !consorciosAuto && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '0 6px', fontSize: 12 }}
              onClick={() => {
                setConsorciosAuto(true)
                setConsorcios(padrao.consorcios)
                setReinicios((r) => ({ ...r, consorcios: r.consorcios + 1 }))
              }}
            >
              ↺ voltar ao automático
            </button>
          )}
        </span>
        <MoedaInputComSinal
          selecionarAoFocar
          key={`cons-${reinicios.consorcios}`}
          valor={consorcios}
          negativoPorPadrao
          onChange={(v) => {
            setConsorcios(v)
            setConsorciosAuto(false)
          }}
        />
      </div>

      <div className="campo">
        Investimentos (aporte inicial ou extra)
        <MoedaInputComSinal selecionarAoFocar valor={investimentos} onChange={setInvestimentos} />
      </div>

      {preenchido && (
        <div className="stack" style={{ gap: 10 }}>
          <label>
            Custódia Fillipe
            <MoedaInput valor={custodiaFillipe} onChange={setCustodiaFillipe} selecionarAoFocar />
            {!linha.preenchido && <span className="text-sm">Projetado: {formatarMoeda(linha.custodiaFillipe)}</span>}
          </label>
          <label>
            Custódia Outros
            <MoedaInput valor={custodiaOutros} onChange={setCustodiaOutros} selecionarAoFocar />
            {!linha.preenchido && <span className="text-sm">Projetado: {formatarMoeda(linha.custodiaOutros)}</span>}
          </label>
          <p className="text-dim text-sm">P/L real do mês: {formatarMoeda(custodiaFillipe + custodiaOutros)}</p>
        </div>
      )}

      <label className="row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={preenchido}
          onChange={(e) => setPreenchido(e.target.checked)}
          style={{ width: 20, height: 20, flexShrink: 0 }}
        />
        <span>Mês preenchido (linha conferida)</span>
      </label>

      {semCustodia && <p className="error-text">Informe o saldo das custódias para marcar o mês como preenchido.</p>}

      <button type="button" className="btn btn-primary" onClick={salvar} disabled={semCustodia}>
        Salvar
      </button>
    </Modal>
  )
}
