import { ArrowLeft, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'

export function Topbar({
  title,
  backTo,
  action,
}: {
  title: string
  backTo?: string
  action?: ReactNode
}) {
  const { logout } = useAuth()

  return (
    <div className="topbar">
      <div className="row">
        {backTo && (
          <Link to={backTo} className="btn-ghost btn" style={{ padding: '6px 10px' }} aria-label="Voltar">
            <ArrowLeft size={18} strokeWidth={1.5} />
          </Link>
        )}
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <div className="row">
        {action}
        <button className="btn btn-ghost row" onClick={() => logout()}>
          <LogOut size={16} strokeWidth={1.5} />
          Sair
        </button>
      </div>
    </div>
  )
}
