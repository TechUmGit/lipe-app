import { Link } from 'react-router-dom'
import { Topbar } from '../shared/components/Topbar'

interface AppEntry {
  to: string
  emoji: string
  title: string
  description: string
  disabled?: boolean
}

const apps: AppEntry[] = [
  {
    to: '/treino',
    emoji: '🏋️',
    title: 'Treino',
    description: 'Sua série, seu equipamento, seu progresso.',
  },
  {
    to: '/audiobooks',
    emoji: '🎧',
    title: 'Audiobooks',
    description: 'Em breve.',
    disabled: true,
  },
  {
    to: '/financas',
    emoji: '💰',
    title: 'Controle financeiro pessoal',
    description: 'Extrato, categorias e orçamento.',
  },
]

export function HomePage() {
  return (
    <>
      <Topbar title="Meus Aplicativos" />
      <div className="page">
        <div className="stack">
          {apps.map((app) =>
            app.disabled ? (
              <div key={app.to} className="card" style={{ opacity: 0.5 }}>
                <div className="row">
                  <span style={{ fontSize: 28 }}>{app.emoji}</span>
                  <div>
                    <h3>{app.title}</h3>
                    <p className="text-dim text-sm">{app.description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Link key={app.to} to={app.to} className="card">
                <div className="row">
                  <span style={{ fontSize: 28 }}>{app.emoji}</span>
                  <div>
                    <h3>{app.title}</h3>
                    <p className="text-dim text-sm">{app.description}</p>
                  </div>
                </div>
              </Link>
            ),
          )}
        </div>
      </div>
    </>
  )
}
