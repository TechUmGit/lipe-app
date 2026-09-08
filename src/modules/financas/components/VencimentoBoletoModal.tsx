import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { ordenarVencimentos, vencimentoVigente } from '../lib/taxas'
import type { Boleto, VencimentoBoleto } from '../lib/types'

function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}

export function VencimentoBoletoModal({
  boleto,
  onClose,
  onSave,
}: {
  boleto: Boleto
  onClose: () => void
  onSave: (vencimentos: VencimentoBoleto[]) => void
}) {
  const [vencimentos, setVencimentos] = useState<VencimentoBoleto[]>(boleto.vencimentos ?? [])
  const [diaTexto, setDiaTexto] = useState('10')
  const [vigenciaDesde, setVigenciaDesde] = useState(paraInputDate(Date.now()))

  function adicionar() {
    const dia = Math.min(31, Math.max(1, Number(diaTexto) || 1))
    const nova: VencimentoBoleto = { dia, vigenciaDesde: deInputDate(vigenciaDesde) }
    setVencimentos((prev) => [...prev.filter((v) => v.vigenciaDesde !== nova.vigenciaDesde), nova])
  }

  function remover(vigencia: number) {
    setVencimentos((prev) => prev.filter((v) => v.vigenciaDesde !== vigencia))
  }

  function salvar() {
    onSave(vencimentos)
    onClose()
  }

  const atual = vencimentoVigente({ vencimentos })

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>{boleto.nome}</h3>
        <p className="text-dim text-sm">{atual ? `Vencimento atual: dia ${atual}` : 'Sem vencimento definido ainda'}</p>
      </div>

      {vencimentos.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          {ordenarVencimentos(vencimentos).map((v) => (
            <div key={v.vigenciaDesde} className="row-between card" style={{ padding: '10px 14px' }}>
              <span className="text-sm">
                Dia {v.dia} desde {new Date(v.vigenciaDesde).toLocaleDateString('pt-BR')}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px 8px' }}
                onClick={() => remover(v.vigenciaDesde)}
                aria-label="Remover período"
              >
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-dim text-sm">
        Um novo período vale a partir da vigência escolhida pra frente, sem mudar os meses anteriores. Se for o
        primeiro período lançado, ele vale para todo o histórico.
      </p>

      <div className="row">
        <label style={{ flex: 1 }}>
          Dia do vencimento
          <input type="number" min={1} max={31} value={diaTexto} onChange={(e) => setDiaTexto(e.target.value)} />
        </label>
        <label style={{ flex: 1 }}>
          Vigência desde
          <input type="date" value={vigenciaDesde} onChange={(e) => setVigenciaDesde(e.target.value)} />
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
