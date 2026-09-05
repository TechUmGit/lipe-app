import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Topbar } from '../../shared/components/Topbar'
import { useIsDesktop } from '../../shared/hooks/useIsDesktop'

export function ProjetosLayout() {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    document.body.classList.toggle('wide', isDesktop)
    return () => document.body.classList.remove('wide')
  }, [isDesktop])

  return (
    <>
      <Topbar title="Projetos" backTo="/" />
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
        <Outlet />
      </div>
    </>
  )
}
