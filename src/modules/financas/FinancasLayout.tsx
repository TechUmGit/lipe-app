import { useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Topbar } from '../../shared/components/Topbar'
import { useAuth } from '../../core/AuthContext'
import { garantirSeedInicial } from './lib/financasApi'

export function FinancasLayout() {
  const { user } = useAuth()
  const seedIniciado = useRef(false)

  useEffect(() => {
    if (user && !seedIniciado.current) {
      seedIniciado.current = true
      garantirSeedInicial(user.uid)
    }
  }, [user])

  return (
    <>
      <Topbar title="Finanças" backTo="/" />
      <div className="page">
        <Outlet />
      </div>
      <nav className="bottom-nav">
        <NavLink to="/financas" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span>📄</span>
          Extrato
        </NavLink>
        <NavLink to="/financas/importar" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span>⬆️</span>
          Importar
        </NavLink>
        <NavLink to="/financas/categorias" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span>🏷️</span>
          Categorias
        </NavLink>
      </nav>
    </>
  )
}
