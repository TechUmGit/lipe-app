import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'
import { Topbar } from '../../shared/components/Topbar'
import { useIsDesktop } from '../../shared/hooks/useIsDesktop'
import { FILTROS_RECEITA, type FiltroReceita } from './lib/calculo'
import { ProjetosContext } from './lib/ProjetosContext'
import { getProjetos } from './lib/projetosApi'
import type { Projeto } from './lib/types'

export function ProjetosLayout() {
  const { user } = useAuth()
  const isDesktop = useIsDesktop()
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroReceita, setFiltroReceita] = useState<FiltroReceita>('todos')

  useEffect(() => {
    document.body.classList.toggle('wide', isDesktop)
    return () => document.body.classList.remove('wide')
  }, [isDesktop])

  useEffect(() => {
    recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function recarregar() {
    if (!user) return
    const p = await getProjetos(user.uid)
    setProjetos(p)
    setLoading(false)
  }

  const projetosOrdenados = useMemo(
    () => [...projetos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [projetos],
  )

  return (
    <>
      <Topbar title="Projetos" backTo="/" />
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <input
              placeholder="Buscar projeto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ flex: 2 }}
            />
            <select value={busca} onChange={(e) => setBusca(e.target.value)} style={{ flex: 1 }} aria-label="Selecionar projeto">
              <option value="">Todos os projetos</option>
              {projetosOrdenados.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="chip-grid">
            {FILTROS_RECEITA.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip ${filtroReceita === f.id ? 'active' : ''}`}
                onClick={() => setFiltroReceita(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav className="tabs">
        <NavLink to="/projetos" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Projetos
        </NavLink>
        <NavLink to="/projetos/atividades" className={({ isActive }) => (isActive ? 'active' : '')}>
          Atividades
        </NavLink>
        <NavLink to="/projetos/projecoes" className={({ isActive }) => (isActive ? 'active' : '')}>
          Projeções
        </NavLink>
      </nav>
      <div className="page">
        <ProjetosContext.Provider value={{ projetos, setProjetos, loading, recarregar, busca, setBusca, filtroReceita, setFiltroReceita }}>
          <Outlet />
        </ProjetosContext.Provider>
      </div>
    </>
  )
}
