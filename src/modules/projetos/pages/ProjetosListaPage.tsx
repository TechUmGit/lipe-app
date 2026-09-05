import { LayoutGrid, List, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { ProjetoModal } from '../components/ProjetoModal'
import { STATUS_PROJETO_LABEL, STATUS_PROJETO_ORDEM } from '../lib/calculo'
import { atualizarProjeto, criarProjeto, getProjetos, removerProjeto } from '../lib/projetosApi'
import type { NovoProjeto, Projeto } from '../lib/types'

function normalizar(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function ProjetosListaPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [editando, setEditando] = useState<Projeto | 'novo' | null>(null)
  const [busca, setBusca] = useState('')
  const [visao, setVisao] = useState<'cards' | 'lista'>('cards')

  useEffect(() => {
    carregar()
  }, [user])

  async function carregar() {
    if (!user) return
    const p = await getProjetos(user.uid)
    setProjetos(p)
    setLoading(false)
  }

  async function salvar(dados: NovoProjeto) {
    if (!user) return
    if (editando && editando !== 'novo') {
      await atualizarProjeto(user.uid, editando.id, dados)
    } else {
      await criarProjeto(user.uid, dados)
    }
    await carregar()
  }

  async function excluir(id: string) {
    if (!user) return
    setProjetos((prev) => prev.filter((p) => p.id !== id))
    await removerProjeto(user.uid, id)
  }

  const projetosFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return projetos
    return projetos.filter((p) => normalizar(p.nome).includes(termo))
  }, [projetos, busca])

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Meus projetos</h2>
        <div className="row" style={{ gap: 4 }}>
          <button
            type="button"
            className={`btn ${visao === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px' }}
            onClick={() => setVisao('cards')}
            aria-label="Ver em cards"
          >
            <LayoutGrid size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className={`btn ${visao === 'lista' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px' }}
            onClick={() => setVisao('lista')}
            aria-label="Ver em lista"
          >
            <List size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setEditando('novo')}>
            <Plus size={16} strokeWidth={1.5} /> Novo
          </button>
        </div>
      </div>

      <input placeholder="Buscar projeto..." value={busca} onChange={(e) => setBusca(e.target.value)} />

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
        <>
          {STATUS_PROJETO_ORDEM.map((status) => {
            const doGrupo = projetosFiltrados.filter((p) => p.status === status)
            if (doGrupo.length === 0) return null
            return (
              <section key={status} className="stack" style={{ gap: 6 }}>
                <h3>{STATUS_PROJETO_LABEL[status]}</h3>
                {visao === 'cards' ? (
                  <div className="projetos-grid">
                    {doGrupo.map((p) => (
                      <div
                        key={p.id}
                        className="card"
                        style={{ padding: '10px 14px', cursor: 'pointer', opacity: status === 'cancelado' ? 0.6 : 1 }}
                        onClick={() => setEditando(p)}
                      >
                        <p style={{ fontWeight: 600 }}>{p.nome}</p>
                        <p className="text-dim text-sm">{p.recorrente ? 'Recorrente' : 'Pagamento único'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card" style={{ padding: 0 }}>
                    {doGrupo.map((p, i) => (
                      <div
                        key={p.id}
                        className="row-between"
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          opacity: status === 'cancelado' ? 0.6 : 1,
                          borderBottom: i < doGrupo.length - 1 ? '1px solid var(--border)' : undefined,
                        }}
                        onClick={() => setEditando(p)}
                      >
                        <span style={{ fontWeight: 600 }}>{p.nome}</span>
                        <span className="text-dim text-sm">{p.recorrente ? 'Recorrente' : 'Pagamento único'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })}

          {projetos.length === 0 && <p className="text-dim text-center">Nenhum projeto lançado ainda.</p>}
          {projetos.length > 0 && projetosFiltrados.length === 0 && (
            <p className="text-dim text-center">Nenhum projeto encontrado para "{busca.trim()}".</p>
          )}
        </>
      )}

      {editando && (
        <ProjetoModal
          projeto={editando === 'novo' ? null : editando}
          onClose={() => setEditando(null)}
          onSave={salvar}
          onDelete={editando !== 'novo' ? () => excluir(editando.id) : undefined}
        />
      )}
    </div>
  )
}
