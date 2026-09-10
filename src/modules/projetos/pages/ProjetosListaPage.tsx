import { ArrowDownWideNarrow, LayoutGrid, List, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { ProjetoModal } from '../components/ProjetoModal'
import { STATUS_PROJETO_LABEL, STATUS_PROJETO_ORDEM, geraReceitaDaquiPraFrente, normalizar, valoresDoAno } from '../lib/calculo'
import { useProjetosContexto } from '../lib/ProjetosContext'
import { atualizarProjeto, criarProjeto, removerProjeto } from '../lib/projetosApi'
import type { NovoProjeto, Projeto } from '../lib/types'

const ANO_ATUAL = new Date().getFullYear()

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProjetosListaPage() {
  const { user } = useAuth()
  const { projetos, loading, busca, filtroReceita, recarregar } = useProjetosContexto()
  const [editando, setEditando] = useState<Projeto | 'novo' | null>(null)
  const [visao, setVisao] = useState<'cards' | 'lista'>('lista')
  const [ordenarPorReceita, setOrdenarPorReceita] = useState(false)

  async function salvar(dados: NovoProjeto) {
    if (!user) return
    if (editando && editando !== 'novo') {
      await atualizarProjeto(user.uid, editando.id, dados)
    } else {
      await criarProjeto(user.uid, dados)
    }
    await recarregar()
  }

  async function excluir(id: string) {
    if (!user) return
    await removerProjeto(user.uid, id)
    await recarregar()
  }

  const projetosFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    return projetos
      .filter((p) => {
        if (termo && !normalizar(p.nome).includes(termo)) return false
        if (filtroReceita !== 'todos') {
          const geraReceita = geraReceitaDaquiPraFrente(p, ANO_ATUAL)
          if (filtroReceita === 'com_receita' && !geraReceita) return false
          if (filtroReceita === 'sem_receita' && geraReceita) return false
        }
        return true
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [projetos, busca, filtroReceita])

  const receitaAnualPorId = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const p of projetos) {
      mapa.set(p.id, valoresDoAno(p, ANO_ATUAL).reduce((s, v) => s + v, 0))
    }
    return mapa
  }, [projetos])

  const resumoReceita = useMemo(() => {
    const ativos = projetos.filter((p) => p.status !== 'cancelado')
    return [ANO_ATUAL, ANO_ATUAL + 1, ANO_ATUAL + 2].map((ano) => ({
      ano,
      total: ativos.reduce((s, p) => s + valoresDoAno(p, ano).reduce((s2, v) => s2 + v, 0), 0),
    }))
  }, [projetos])

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
          <button
            type="button"
            className={`btn ${ordenarPorReceita ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px' }}
            onClick={() => setOrdenarPorReceita((v) => !v)}
            aria-label="Ordenar por maior receita"
            title="Ordenar por maior receita"
          >
            <ArrowDownWideNarrow size={16} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setEditando('novo')}>
            <Plus size={16} strokeWidth={1.5} /> Novo
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
        <>
          <div className="stack" style={{ gap: 6 }}>
            <h3 style={{ margin: 0 }}>Resumo de faturamento</h3>
            <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {resumoReceita.map((r) => (
                <div key={r.ano} style={{ textAlign: 'center' }}>
                  <p className="text-dim text-sm">{r.ano}</p>
                  <p style={{ fontWeight: 600 }}>{formatarMoeda(r.total)}</p>
                </div>
              ))}
            </div>
          </div>

          {STATUS_PROJETO_ORDEM.map((status) => {
            const doGrupo = projetosFiltrados.filter((p) => p.status === status)
            if (doGrupo.length === 0) return null
            const doGrupoOrdenado = ordenarPorReceita
              ? [...doGrupo].sort((a, b) => (receitaAnualPorId.get(b.id) ?? 0) - (receitaAnualPorId.get(a.id) ?? 0))
              : doGrupo
            return (
              <section key={status} className="stack" style={{ gap: 6 }}>
                <h3>
                  {STATUS_PROJETO_LABEL[status]} ({doGrupo.length})
                </h3>
                {visao === 'cards' ? (
                  <div className="projetos-grid">
                    {doGrupoOrdenado.map((p) => {
                      const anual = receitaAnualPorId.get(p.id) ?? 0
                      return (
                        <div
                          key={p.id}
                          className="card"
                          style={{ padding: '10px 14px', cursor: 'pointer', opacity: status === 'cancelado' ? 0.6 : 1 }}
                          onClick={() => setEditando(p)}
                        >
                          <p style={{ fontWeight: 600 }}>{p.nome}</p>
                          <p className="text-dim text-sm">{p.recorrente ? 'Recorrente' : 'Pagamento único'}</p>
                          <p className="text-dim text-sm">
                            {formatarMoeda(anual)}/ano · {formatarMoeda(anual / 12)}/mês
                          </p>
                          {p.pessoasEnvolvidas && p.pessoasEnvolvidas.length > 0 && (
                            <p className="text-dim text-sm">{p.pessoasEnvolvidas.join(', ')}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="card" style={{ padding: 0 }}>
                    {doGrupoOrdenado.map((p, i) => {
                      const anual = receitaAnualPorId.get(p.id) ?? 0
                      return (
                        <div
                          key={p.id}
                          className="row-between"
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            opacity: status === 'cancelado' ? 0.6 : 1,
                            borderBottom: i < doGrupoOrdenado.length - 1 ? '1px solid var(--border)' : undefined,
                          }}
                          onClick={() => setEditando(p)}
                        >
                          <span style={{ fontWeight: 600 }}>{p.nome}</span>
                          <div className="text-dim text-sm" style={{ textAlign: 'right' }}>
                            <div>{p.recorrente ? 'Recorrente' : 'Pagamento único'}</div>
                            <div>
                              {formatarMoeda(anual)}/ano · {formatarMoeda(anual / 12)}/mês
                            </div>
                            {p.pessoasEnvolvidas && p.pessoasEnvolvidas.length > 0 && <div>{p.pessoasEnvolvidas.join(', ')}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          {projetos.length === 0 && <p className="text-dim text-center">Nenhum projeto lançado ainda.</p>}
          {projetos.length > 0 && projetosFiltrados.length === 0 && (
            <p className="text-dim text-center">Nenhum projeto encontrado.</p>
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
