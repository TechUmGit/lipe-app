import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { MoedaInput } from '../../../shared/components/MoedaInput'
import { calcularTaxas, metaDePL } from '../lib/perspectivaCalculo'
import type { ParametrosPerspectiva } from '../lib/types'
import { formatarMoeda } from './Moeda'

type CampoPercentual = 'inflacaoAnual' | 'rendimentoDesejadoAnual' | 'impostoRenda' | 'retiradaAnualPct' | 'jurosRealMetaAnual'

const CAMPOS_PERCENTUAIS: { campo: CampoPercentual; rotulo: string }[] = [
  { campo: 'inflacaoAnual', rotulo: 'Inflação anual (%)' },
  { campo: 'rendimentoDesejadoAnual', rotulo: 'Rendimento desejado anual (%)' },
  { campo: 'impostoRenda', rotulo: 'Imposto sobre o rendimento (%)' },
  { campo: 'retiradaAnualPct', rotulo: 'Remuneração anual sobre o P/L (%)' },
  { campo: 'jurosRealMetaAnual', rotulo: 'Juros real da meta (% a.a.)' },
]

function paraTexto(decimal: number): string {
  return String(Number((decimal * 100).toFixed(4))).replace('.', ',')
}

function deTexto(texto: string): number {
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n / 100 : NaN
}

export function PerspectivaPremissasModal({
  parametros,
  onClose,
  onSave,
}: {
  parametros: ParametrosPerspectiva
  onClose: () => void
  onSave: (p: ParametrosPerspectiva) => void
}) {
  const [percentuais, setPercentuais] = useState<Record<CampoPercentual, string>>(
    () =>
      Object.fromEntries(CAMPOS_PERCENTUAIS.map(({ campo }) => [campo, paraTexto(parametros[campo])])) as Record<
        CampoPercentual,
        string
      >,
  )
  const [rendaMensalDesejada, setRendaMensalDesejada] = useState(parametros.rendaMensalDesejada)
  const [salarioDesejadoMensal, setSalarioDesejadoMensal] = useState(parametros.salarioDesejadoMensal)
  const [salarioReferencia, setSalarioReferencia] = useState(parametros.salarioReferencia)
  const [mesBase, setMesBase] = useState(parametros.mesBase)
  const [idadeBase, setIdadeBase] = useState(String(parametros.idadeBase))
  const [idadeMeta, setIdadeMeta] = useState(String(parametros.idadeMeta))

  function montar(): ParametrosPerspectiva | null {
    const decimais = Object.fromEntries(CAMPOS_PERCENTUAIS.map(({ campo }) => [campo, deTexto(percentuais[campo])])) as Record<
      CampoPercentual,
      number
    >
    const idadeBaseNum = Number(idadeBase)
    const idadeMetaNum = Number(idadeMeta)
    if (Object.values(decimais).some((v) => Number.isNaN(v))) return null
    if (!Number.isInteger(idadeBaseNum) || !Number.isInteger(idadeMetaNum) || idadeMetaNum <= idadeBaseNum) return null
    if (!mesBase || !salarioReferencia) return null
    return {
      ...decimais,
      rendaMensalDesejada,
      salarioDesejadoMensal,
      salarioReferencia,
      mesBase,
      idadeBase: idadeBaseNum,
      idadeMeta: idadeMetaNum,
    }
  }

  const rascunho = montar()
  const taxas = rascunho ? calcularTaxas(rascunho) : null

  function salvar() {
    if (!rascunho) return
    onSave(rascunho)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>Premissas do plano</h3>
        <p className="text-dim text-sm">Alterar as premissas recalcula toda a projeção, dos meses preenchidos aos futuros.</p>
      </div>

      {CAMPOS_PERCENTUAIS.map(({ campo, rotulo }) => (
        <label key={campo}>
          {rotulo}
          <input
            type="text"
            inputMode="decimal"
            value={percentuais[campo]}
            onChange={(e) => setPercentuais((prev) => ({ ...prev, [campo]: e.target.value }))}
          />
        </label>
      ))}

      <label>
        Renda mensal líquida desejada (define a meta)
        <MoedaInput valor={rendaMensalDesejada} onChange={setRendaMensalDesejada} />
      </label>

      <label>
        Salário desejado por mês
        <MoedaInput valor={salarioDesejadoMensal} onChange={setSalarioDesejadoMensal} />
      </label>

      <label>
        Mês em que esse salário vale (depois corrige pela inflação)
        <input type="month" value={salarioReferencia} onChange={(e) => setSalarioReferencia(e.target.value)} />
      </label>

      <div className="row">
        <label style={{ flex: 2 }}>
          Mês zero do plano
          <input type="month" value={mesBase} onChange={(e) => setMesBase(e.target.value)} />
        </label>
        <label style={{ flex: 1 }}>
          Idade nele
          <input type="text" inputMode="numeric" value={idadeBase} onChange={(e) => setIdadeBase(e.target.value)} />
        </label>
        <label style={{ flex: 1 }}>
          Idade da meta
          <input type="text" inputMode="numeric" value={idadeMeta} onChange={(e) => setIdadeMeta(e.target.value)} />
        </label>
      </div>

      {rascunho && taxas ? (
        <div className="card stack" style={{ gap: 4 }}>
          <p className="text-sm">Rendimento real mensal: {(taxas.rendimentoRealMensal * 100).toFixed(3).replace('.', ',')}%</p>
          <p className="text-sm">Meta de P/L: {formatarMoeda(metaDePL(rascunho))}</p>
        </div>
      ) : (
        <p className="error-text">Confira os campos: percentuais numéricos e idade da meta maior que a idade inicial.</p>
      )}

      <button type="button" className="btn btn-primary" onClick={salvar} disabled={!rascunho}>
        Salvar premissas
      </button>
    </Modal>
  )
}
