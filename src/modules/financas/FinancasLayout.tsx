import { Tag, Upload } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
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
      <Topbar
        title="Finanças"
        backTo="/"
        action={
          <>
            <Link
              to="/financas/importar"
              className="btn btn-ghost"
              style={{ padding: '6px 10px' }}
              aria-label="Importar extrato"
            >
              <Upload size={18} strokeWidth={1.5} />
            </Link>
            <Link
              to="/financas/categorias"
              className="btn btn-ghost"
              style={{ padding: '6px 10px' }}
              aria-label="Categorias"
            >
              <Tag size={18} strokeWidth={1.5} />
            </Link>
          </>
        }
      />
      <nav className="tabs">
        <NavLink to="/financas" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Resumo
        </NavLink>
        <NavLink to="/financas/extrato" className={({ isActive }) => (isActive ? 'active' : '')}>
          Extrato
        </NavLink>
        <NavLink to="/financas/dre" className={({ isActive }) => (isActive ? 'active' : '')}>
          DRE
        </NavLink>
      </nav>
      <div className="page">
        <Outlet />
      </div>
    </>
  )
}
