import { Landmark, PencilLine, Scissors, Trash2 } from 'lucide-react'
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

interface ParteForm {
  texto: string
  descricao: string
  categoriaId: string
}

export interface ParteDivisaoSaida {
  valor: number
  descricao: string
  categoriaId: string | null
}

export function LancamentoModal({
  lancamento,
  categorias,
  onClose,
  onSave,
  onDelete,
  onSplit,
}: {
  lancamento: Lancamento
  categorias: Categoria[]
  onClose: () => void
  onSave: (categoriaId: string, obs: string, descricao: string) => void
  onDelete: () => void
  onSplit: (partes: ParteDivisaoSaida[]) => void
}) {
  const [categoriaId, setCategoriaId] = useState(lancamento.categoriaId ?? '')
  const [obs, setObs] = useState(lancamento.obs ?? '')
  const [descricao, setDescricao] = useState(lancamento.descricao)
  const [dividindo, setDividindo] = useState(false)
  const [partes, setPartes] = useState<ParteForm[]>([])

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

  function iniciarDivisao() {
    setPartes([
      { texto: '', descricao: lancamento.descricao, categoriaId: lancamento.categoriaId ?? '' },
      { texto: '', descricao: lancamento.descricao, categoriaId: '' },
    ])
    setDividindo(true)
  }

  function adicionarParte() {
    setPartes((prev) => [...prev, { texto: '', descricao: lancamento.descricao, categoriaId: '' }])
  }

  function removerParte(i: number) {
    setPartes((prev) => prev.filter((_, idx) => idx !== i))
  }

  function atualizarParte(i: number, campo: keyof ParteForm, valor: string) {
    setPartes((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)))
  }

  const totalAbs = Math.abs(lancamento.valor)
  const sinal = lancamento.valor < 0 ? -1 : 1
  const somaPartes = partes.reduce((s, p) => s + (Number(p.texto) || 0), 0)
  const restante = totalAbs - somaPartes
  const balanceado = Math.abs(restante) < 0.005

  function confirmarDivisao() {
    if (!balanceado || partes.length < 2) return
    const saida: ParteDivisaoSaida[] = partes.map((p) => ({
      valor: sinal * (Number(p.texto) || 0),
      descricao: p.descricao.trim() || lancamento.descricao,
      categoriaId: p.categoriaId || null,
    }))
    onSplit(saida)
    onClose()
  }

  const origem = origemInfo(lancamento)

  if (dividindo) {
    return (
      <Modal onClose={onClose}>
        <div className="stack">
          <h3>Dividir lançamento</h3>
          <p className="text-dim text-sm">
            {lancamento.descricao} · Total {formatarMoeda(lancamento.valor)}
          </p>
        </div>

        <div className="stack" style={{ gap: 12 }}>
          {partes.map((p, i) => (
            <div key={i} className="card stack" style={{ gap: 8, padding: 12 }}>
              <div className="row">
                <input
                  type="number"
                  min={0}
                  placeholder="Valor (R$)"
                  value={p.texto}
                  onChange={(e) => atualizarParte(i, 'texto', e.target.value)}
                  style={{ flex: 1 }}
                />
                {partes.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px' }}
                    onClick={() => removerParte(i)}
                    aria-label="Remover parte"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Descrição dessa parte"
                value={p.descricao}
                onChange={(e) => atualizarParte(i, 'descricao', e.target.value)}
              />
              <select value={p.categoriaId} onChange={(e) => atualizarParte(i, 'categoriaId', e.target.value)}>
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
            </div>
          ))}
        </div>

        <button type="button" className="btn" onClick={adicionarParte}>
          + Adicionar parte
        </button>

        <div className="row-between">
          <span className="text-dim text-sm">Restante</span>
          <span
            style={{ fontWeight: 600, color: balanceado ? 'var(--success)' : 'var(--danger)' }}
          >
            {formatarMoeda(sinal * restante)}
          </span>
        </div>

        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={() => setDividindo(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={confirmarDivisao}
            disabled={!balanceado || partes.length < 2}
          >
            Confirmar divisão
          </button>
        </div>
      </Modal>
    )
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

      <button type="button" className="btn row" onClick={iniciarDivisao}>
        <Scissors size={16} strokeWidth={1.5} />
        Dividir em partes
      </button>

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
