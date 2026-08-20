import { Landmark, PencilLine } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { GRUPOS_CATEGORIA, type Categoria, type Lancamento } from '../lib/types'

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function origemInfo(l: Lancamento): { texto: string; Icone: typeof Landmark } {
  if (l.conciliado) return { texto: 'Conciliado: você lançou manualmente e o banco confirmou', Icone: Landmark }
  if (l.origem === 'pluggy') return { texto: 'Veio automaticamente do banco, ainda não revisado', Icone: Landmark }
  return { texto: 'Lançado manualmente', Icone: PencilLine }
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
  onSave: (categoriaId: string, obs: string, descricao: string) => void
  onDelete: () => void
}) {
  const [categoriaId, setCategoriaId] = useState(lancamento.categoriaId ?? '')
  const [obs, setObs] = useState(lancamento.obs ?? '')
  const [descricao, setDescricao] = useState(lancamento.descricao)

  const categoriasOrdenadas = GRUPOS_CATEGORIA.map((g) => ({
    ...g,
    itens: categorias.filter((c) => c.grupo === g.id),
  }))

  function salvar() {
    onSave(categoriaId, obs, descricao.trim() || lancamento.descricao)
    onClose()
  }

  function excluir() {
    if (confirm('Excluir esse lançamento?')) {
      onDelete()
      onClose()
    }
  }

  const origem = origemInfo(lancamento)

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
        <p className="text-dim text-sm row" style={{ gap: 4 }}>
          <origem.Icone size={13} strokeWidth={1.5} />
          {origem.texto}
        </p>
      </div>

      <label>
        Descrição
        <input
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          style={{ fontWeight: 600 }}
        />
      </label>

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
