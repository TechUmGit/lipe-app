import { NavLink, Outlet } from 'react-router-dom'
import { Topbar } from '../../shared/components/Topbar'

export function TreinoLayout() {
  return (
    <>
      <Topbar title="Treino" backTo="/" />
      <div className="page">
        <Outlet />
      </div>
      <nav className="bottom-nav">
        <NavLink to="/treino" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span>🏠</span>
          Hoje
        </NavLink>
        <NavLink to="/treino/serie" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span>📋</span>
          Série
        </NavLink>
        <NavLink
          to="/treino/configuracoes"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <span>⚙️</span>
          Config
        </NavLink>
      </nav>
    </>
  )
}
