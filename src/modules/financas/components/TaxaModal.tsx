import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { ordenarOrcamentos, ordenarTaxas, orcamentoVigente, taxaVigente } from '../lib/taxas'
import type { Categoria, OrcamentoMensal, TaxaResponsabilidade } from '../lib/types'

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function orcamentosIniciais(categoria: Categoria): OrcamentoMensal[] {
  if (categoria.orcamentos && categoria.orcamentos.length > 0) return categoria.orcamentos
  if (categoria.orcamentoMensal) return [{ valor: categoria.orcamentoMensal, vigenciaDesde: 0 }]
  return []
}

export function TaxaModal({
  categoria,
  onClose,
  onSave,
}: {
  categoria: Categoria
  onClose: () => void
  onSave: (dados: { taxas: TaxaResponsabilidade[]; orcamentos: OrcamentoMensal[] }) => void
}) {
  const [taxas, setTaxas] = useState<TaxaResponsabilidade[]>(categoria.taxas ?? [])
  const [percentualTexto, setPercentualTexto] = useState('100')
  const [vigenciaTaxaDesde, setVigenciaTaxaDesde] = useState(paraInputDate(Date.now()))

  const [orcamentos, setOrcamentos] = useState<OrcamentoMensal[]>(orcamentosIniciais(categoria))
  const [valorOrcamentoTexto, setValorOrcamentoTexto] = useState('0')
  const [vigenciaOrcamentoDesde, setVigenciaOrcamentoDesde] = useState(paraInputDate(Date.now()))

  function adicionarTaxa() {
    const percentual = Math.min(100, Math.max(0, Number(percentualTexto) || 0))
    const nova: TaxaResponsabilidade = {
      percentual,
      vigenciaDesde: deInputDate(vigenciaTaxaDesde),
    }
    setTaxas((prev) => [...prev.filter((t) => t.vigenciaDesde !== nova.vigenciaDesde), nova])
  }

  function removerTaxa(vigenciaDesde: number) {
    setTaxas((prev) => prev.filter((t) => t.vigenciaDesde !== vigenciaDesde))
  }

  function adicionarOrcamento() {
    const valor = Math.max(0, Number(valorOrcamentoTexto) || 0)
    const novo: OrcamentoMensal = {
      valor,
      vigenciaDesde: deInputDate(vigenciaOrcamentoDesde),
    }
    setOrcamentos((prev) => [...prev.filter((o) => o.vigenciaDesde !== novo.vigenciaDesde), novo])
  }

  function removerOrcamento(vigenciaDesde: number) {
    setOrcamentos((prev) => prev.filter((o) => o.vigenciaDesde !== vigenciaDesde))
  }

  function salvar() {
    onSave({ taxas, orcamentos })
    onClose()
  }

  const taxaAtual = taxaVigente({ taxas })
  const orcamentoAtual = orcamentoVigente({ orcamentos })

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>{categoria.nome}</h3>
        <p className="text-dim text-sm">
          Responsabilidade atual: {taxaAtual}% · Orçamento atual: {formatarMoeda(orcamentoAtual)}
        </p>
      </div>

      <div className="stack">
        <span className="text-dim text-sm">Taxa de responsabilidade</span>

        {taxas.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {ordenarTaxas(taxas).map((t) => (
              <div key={t.vigenciaDesde} className="row-between card" style={{ padding: '10px 14px' }}>
                <span className="text-sm">
                  {t.percentual}% desde {new Date(t.vigenciaDesde).toLocaleDateString('pt-BR')}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px' }}
                  onClick={() => removerTaxa(t.vigenciaDesde)}
                  aria-label="Remover"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="row">
          <label style={{ flex: 1 }}>
            Taxa (%)
            <input
              type="number"
              min={0}
              max={100}
              value={percentualTexto}
              onChange={(e) => setPercentualTexto(e.target.value)}
            />
          </label>
          <label style={{ flex: 1 }}>
            Vigência desde
            <input
              type="date"
              value={vigenciaTaxaDesde}
              onChange={(e) => setVigenciaTaxaDesde(e.target.value)}
            />
          </label>
        </div>
        <button type="button" className="btn" onClick={adicionarTaxa}>
          + Adicionar período
        </button>
      </div>

      <div className="stack">
        <span className="text-dim text-sm">Orçamento mensal</span>

        {orcamentos.length > 0 && (
          <div className="stack" style={{ gap: 6 }}>
            {ordenarOrcamentos(orcamentos).map((o) => (
              <div key={o.vigenciaDesde} className="row-between card" style={{ padding: '10px 14px' }}>
                <span className="text-sm">
                  {formatarMoeda(o.valor)} desde {new Date(o.vigenciaDesde).toLocaleDateString('pt-BR')}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px' }}
                  onClick={() => removerOrcamento(o.vigenciaDesde)}
                  aria-label="Remover"
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="row">
          <label style={{ flex: 1 }}>
            Orçamento (R$)
            <input
              type="number"
              min={0}
              value={valorOrcamentoTexto}
              onChange={(e) => setValorOrcamentoTexto(e.target.value)}
            />
          </label>
          <label style={{ flex: 1 }}>
            Vigência desde
            <input
              type="date"
              value={vigenciaOrcamentoDesde}
              onChange={(e) => setVigenciaOrcamentoDesde(e.target.value)}
            />
          </label>
        </div>
        <button type="button" className="btn" onClick={adicionarOrcamento}>
          + Adicionar período
        </button>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={salvar}>
        Salvar
      </button>
    </Modal>
  )
}
