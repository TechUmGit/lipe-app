import { Tag, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Topbar } from '../../shared/components/Topbar'
import { useAuth } from '../../core/AuthContext'
import { useIsDesktop } from '../../shared/hooks/useIsDesktop'
import { garantirSeedInicial } from './lib/financasApi'
import { MesAnoContext } from './lib/MesAnoContext'
import { FinancasDashboardDesktop } from './pages/FinancasDashboardDesktop'

export function FinancasLayout() {
  const { user } = useAuth()
  const seedIniciado = useRef(false)
  const isDesktop = useIsDesktop()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())

  useEffect(() => {
    if (user && !seedIniciado.current) {
      seedIniciado.current = true
      garantirSeedInicial(user.uid)
    }
  }, [user])

  useEffect(() => {
    document.body.classList.toggle('wide', isDesktop)
    return () => document.body.classList.remove('wide')
  }, [isDesktop])

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
      {!isDesktop && (
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
      )}
      <div className="page">
        {isDesktop ? (
          <FinancasDashboardDesktop />
        ) : (
          <MesAnoContext.Provider
            value={{
              mes,
              ano,
              setMesAno: (m, a) => {
                setMes(m)
                setAno(a)
              },
            }}
          >
            <Outlet />
          </MesAnoContext.Provider>
        )}
      </div>
    </>
  )
}
