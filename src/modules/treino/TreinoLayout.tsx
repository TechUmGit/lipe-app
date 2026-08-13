import { ClipboardList, Home, Settings } from 'lucide-react'
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
          <Home size={20} strokeWidth={1.5} />
          Hoje
        </NavLink>
        <NavLink to="/treino/serie" className={({ isActive }) => (isActive ? 'active' : '')}>
          <ClipboardList size={20} strokeWidth={1.5} />
          Série
        </NavLink>
        <NavLink
          to="/treino/configuracoes"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <Settings size={20} strokeWidth={1.5} />
          Config
        </NavLink>
      </nav>
    </>
  )
}
