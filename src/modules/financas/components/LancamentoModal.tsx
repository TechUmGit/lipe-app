import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { GRUPOS_CATEGORIA, type Categoria, type Lancamento } from '../lib/types'

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function LancamentoModal({
  lancamento,
  categorias,
  onClose,
  onSave,
  onDelete,
}: {
  lancamento: Lancamento
  categorias: Categoria[]
  onClose: () => void
  onSave: (categoriaId: string, obs: string) => void
  onDelete: () => void
}) {
  const [categoriaId, setCategoriaId] = useState(lancamento.categoriaId ?? '')
  const [obs, setObs] = useState(lancamento.obs ?? '')

  const categoriasOrdenadas = GRUPOS_CATEGORIA.map((g) => ({
    ...g,
    itens: categorias.filter((c) => c.grupo === g.id),
  }))

  function salvar() {
    onSave(categoriaId, obs)
    onClose()
  }

  function excluir() {
    if (confirm('Excluir esse lançamento?')) {
      onDelete()
      onClose()
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <div className="row-between">
          <span className="text-dim text-sm">
            {new Date(lancamento.data).toLocaleDateString('pt-BR')} · {lancamento.conta}
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: lancamento.valor < 0 ? 'var(--text)' : 'var(--success)',
            }}
          >
            {formatarMoeda(lancamento.valor)}
          </span>
        </div>
        <p style={{ fontWeight: 600 }}>{lancamento.descricao}</p>
      </div>

      <label>
        Categoria
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categoriasOrdenadas.map((g) =>
            g.itens.length ? (
              <optgroup key={g.id} label={g.label}>
                {g.itens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.transferencia ? '↔ ' : ''}
                    {c.nome}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
      </label>

      <label>
        Comentário
        <textarea
          rows={3}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Por que esse gasto veio diferente do esperado, de onde veio, etc."
        />
      </label>

      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={excluir}>
          Excluir
        </button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={salvar}>
          Salvar
        </button>
      </div>
    </Modal>
  )
}
