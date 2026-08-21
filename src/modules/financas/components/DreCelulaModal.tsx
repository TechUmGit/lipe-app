import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { valorResponsavel } from '../lib/taxas'
import { MESES } from './MonthSwitcher'
import type { Categoria, DreAnotacao, DreCor, Lancamento } from '../lib/types'

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DreCelulaModal({
  categoria,
  mes,
  ano,
  valor,
  lancamentos,
  anotacao,
  onClose,
  onSave,
}: {
  categoria: Categoria
  mes: number
  ano: number
  valor: number
  lancamentos: Lancamento[]
  anotacao: DreAnotacao | undefined
  onClose: () => void
  onSave: (dados: { comentario: string; cor: DreCor | null; destaque: boolean }) => void
}) {
  const [comentario, setComentario] = useState(anotacao?.comentario ?? '')
  const [cor, setCor] = useState<DreCor | null>(anotacao?.cor ?? null)
  const [destaque, setDestaque] = useState(anotacao?.destaque ?? false)

  function salvar() {
    onSave({ comentario: comentario.trim(), cor, destaque })
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>{categoria.nome}</h3>
        <p className="text-dim text-sm">
          {MESES[mes - 1]} {ano} · {formatarMoeda(valor)}
        </p>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <span className="text-dim text-sm">
          {lancamentos.length === 0
            ? 'Nenhum lançamento nesse mês'
            : `${lancamentos.length} lançamento(s) somam esse valor`}
        </span>
        {lancamentos.length > 0 && (
          <div className="stack" style={{ gap: 0 }}>
            {lancamentos.map((l) => {
              const ajustado = valorResponsavel(l, categoria)
              return (
                <div key={l.id} className="row-between text-sm" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.descricao}
                    </p>
                    <p className="text-dim text-sm">{new Date(l.data).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      color: ajustado < 0 ? 'var(--text)' : 'var(--success)',
                    }}
                  >
                    {formatarMoeda(ajustado)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <label>
        Comentário
        <textarea
          rows={4}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Ex: gasto extra com viagem, ainda falta lançar a fatura..."
        />
      </label>

      <div className="stack" style={{ gap: 6 }}>
        <span className="text-dim text-sm">Cor do texto</span>
        <div className="chip-grid">
          <button
            type="button"
            className={`chip ${cor === null ? 'active' : ''}`}
            onClick={() => setCor(null)}
          >
            Nenhuma
          </button>
          <button
            type="button"
            className={`chip ${cor === 'azul' ? 'active' : ''}`}
            style={cor === 'azul' ? { background: 'var(--blue)', borderColor: 'var(--blue)', color: '#fff' } : undefined}
            onClick={() => setCor('azul')}
          >
            Azul
          </button>
          <button
            type="button"
            className={`chip ${cor === 'vermelho' ? 'active' : ''}`}
            style={
              cor === 'vermelho'
                ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }
                : undefined
            }
            onClick={() => setCor('vermelho')}
          >
            Vermelho
          </button>
        </div>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <span className="text-dim text-sm">Destaque</span>
        <button
          type="button"
          className={`chip ${destaque ? 'active' : ''}`}
          style={destaque ? { background: 'var(--btn-bg)', borderColor: 'var(--btn-border)', color: 'var(--text)' } : undefined}
          onClick={() => setDestaque((d) => !d)}
        >
          Falta lançamento (fundo amarelo)
        </button>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={salvar}>
        Salvar
      </button>
    </Modal>
  )
}
