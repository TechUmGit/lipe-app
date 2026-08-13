import { useEffect, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { Topbar } from '../../../shared/components/Topbar'
import { TaxaModal } from '../components/TaxaModal'
import {
  atualizarCategoria,
  criarCategoria,
  getCategorias,
  getContas,
  removerCategoria,
  salvarContas,
} from '../lib/financasApi'
import { orcamentoVigente, taxaVigente } from '../lib/taxas'
import { GRUPOS_CATEGORIA, type Categoria, type GrupoCategoria, type OrcamentoMensal, type TaxaResponsabilidade } from '../lib/types'

export function CategoriasPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [contas, setContas] = useState<string[]>([])
  const [novaConta, setNovaConta] = useState('')
  const [novoNome, setNovoNome] = useState<Record<GrupoCategoria, string>>({
    receita: '',
    despesa_fixa: '',
    despesa_variavel: '',
    investimento: '',
    bens: '',
  })
  const [editandoTaxa, setEditandoTaxa] = useState<Categoria | null>(null)

  useEffect(() => {
    if (!user) return
    carregar()
  }, [user])

  async function carregar() {
    if (!user) return
    const [cats, ctas] = await Promise.all([getCategorias(user.uid), getContas(user.uid)])
    setCategorias(cats)
    setContas(ctas)
    setLoading(false)
  }

  async function adicionarCategoria(grupo: GrupoCategoria) {
    if (!user) return
    const nome = novoNome[grupo].trim()
    if (!nome) return
    const maiorOrdem = categorias.reduce((max, c) => Math.max(max, c.ordem), 0)
    await criarCategoria(user.uid, { nome, grupo, ordem: maiorOrdem + 1 })
    setNovoNome((prev) => ({ ...prev, [grupo]: '' }))
    await carregar()
  }

  async function excluirCategoria(id: string) {
    if (!user) return
    await removerCategoria(user.uid, id)
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  async function adicionarConta() {
    if (!user) return
    const nome = novaConta.trim()
    if (!nome || contas.includes(nome)) return
    const novas = [...contas, nome]
    setContas(novas)
    setNovaConta('')
    await salvarContas(user.uid, novas)
  }

  async function removerConta(nome: string) {
    if (!user) return
    const novas = contas.filter((c) => c !== nome)
    setContas(novas)
    await salvarContas(user.uid, novas)
  }

  async function salvarTaxas(dados: { taxas: TaxaResponsabilidade[]; orcamentos: OrcamentoMensal[] }) {
    if (!user || !editandoTaxa) return
    await atualizarCategoria(user.uid, editandoTaxa.id, dados)
    setCategorias((prev) => prev.map((c) => (c.id === editandoTaxa.id ? { ...c, ...dados } : c)))
  }

  function formatarMoeda(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <>
      <Topbar title="Categorias" backTo="/financas" />
      <div className="page">
      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
      <>
      <p className="text-dim text-sm">
        Toque numa categoria para ajustar sua taxa de responsabilidade e seu orçamento mensal,
        cada um com histórico de vigência.
      </p>
      <section className="stack">
        <h2>Contas</h2>
        <div className="chip-grid">
          {contas.map((c) => (
            <button key={c} type="button" className="chip active" onClick={() => removerConta(c)}>
              {c} ✕
            </button>
          ))}
        </div>
        <div className="row">
          <input
            placeholder="Nova conta..."
            value={novaConta}
            onChange={(e) => setNovaConta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarConta()
              }
            }}
          />
          <button type="button" className="btn" onClick={adicionarConta}>
            +
          </button>
        </div>
      </section>

      {GRUPOS_CATEGORIA.map((grupo) => (
        <section key={grupo.id} className="stack">
          <h2>{grupo.label}</h2>
          <div className="stack" style={{ gap: 6 }}>
            {categorias
              .filter((c) => c.grupo === grupo.id && !c.transferencia)
              .map((c) => (
                <div
                  key={c.id}
                  className="row-between card"
                  style={{ padding: '10px 14px', cursor: 'pointer' }}
                  onClick={() => setEditandoTaxa(c)}
                >
                  <span className="text-sm">{c.nome}</span>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="text-dim text-sm">
                      {taxaVigente(c)}%
                      {orcamentoVigente(c) ? ` · ${formatarMoeda(orcamentoVigente(c))}` : ''}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        excluirCategoria(c.id)
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
          </div>
          <div className="row">
            <input
              placeholder="Nova categoria..."
              value={novoNome[grupo.id]}
              onChange={(e) => setNovoNome((prev) => ({ ...prev, [grupo.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  adicionarCategoria(grupo.id)
                }
              }}
            />
            <button type="button" className="btn" onClick={() => adicionarCategoria(grupo.id)}>
              +
            </button>
          </div>
        </section>
      ))}
      </>
      )}
      </div>

      {editandoTaxa && (
        <TaxaModal
          categoria={editandoTaxa}
          onClose={() => setEditandoTaxa(null)}
          onSave={salvarTaxas}
        />
      )}
    </>
  )
}
