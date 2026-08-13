import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { ordenarTaxas, taxaVigente } from '../lib/taxas'
import type { Categoria, TaxaResponsabilidade } from '../lib/types'

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}

export function TaxaModal({
  categoria,
  onClose,
  onSave,
}: {
  categoria: Categoria
  onClose: () => void
  onSave: (taxas: TaxaResponsabilidade[]) => void
}) {
  const [taxas, setTaxas] = useState<TaxaResponsabilidade[]>(categoria.taxas ?? [])
  const [percentualTexto, setPercentualTexto] = useState('100')
  const [vigenciaDesde, setVigenciaDesde] = useState(paraInputDate(Date.now()))

  function adicionar() {
    const percentual = Math.min(100, Math.max(0, Number(percentualTexto) || 0))
    const nova: TaxaResponsabilidade = {
      percentual,
      vigenciaDesde: deInputDate(vigenciaDesde),
    }
    setTaxas((prev) => [...prev.filter((t) => t.vigenciaDesde !== nova.vigenciaDesde), nova])
  }

  function remover(vigenciaDesde: number) {
    setTaxas((prev) => prev.filter((t) => t.vigenciaDesde !== vigenciaDesde))
  }

  function salvar() {
    onSave(taxas)
    onClose()
  }

  const atual = taxaVigente({ taxas })

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>{categoria.nome}</h3>
        <p className="text-dim text-sm">Sua responsabilidade atual: {atual}%</p>
      </div>

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
                onClick={() => remover(t.vigenciaDesde)}
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
            value={vigenciaDesde}
            onChange={(e) => setVigenciaDesde(e.target.value)}
          />
        </label>
      </div>
      <button type="button" className="btn" onClick={adicionar}>
        + Adicionar período
      </button>

      <button type="button" className="btn btn-primary btn-block" onClick={salvar}>
        Salvar
      </button>
    </Modal>
  )
}
