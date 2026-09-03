import { BookOpen, Briefcase, Dumbbell, Wallet, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Topbar } from '../shared/components/Topbar'

interface AppEntry {
  to: string
  icon: LucideIcon
  title: string
  description: string
  disabled?: boolean
}

const apps: AppEntry[] = [
  {
    to: '/financas',
    icon: Wallet,
    title: 'Controle financeiro pessoal',
    description: 'Extrato, categorias e orçamento.',
  },
  {
    to: '/treino',
    icon: Dumbbell,
    title: 'Treino',
    description: 'Sua série, seu equipamento, seu progresso.',
  },
  {
    to: '/projetos',
    icon: Briefcase,
    title: 'Projetos',
    description: 'Negociações, contratos fechados e receita esperada.',
  },
  {
    to: '/livros',
    icon: BookOpen,
    title: 'Livros',
    description: 'Biblioteca do que eu quero ler.',
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
                  <app.icon size={26} strokeWidth={1.5} />
                  <div>
                    <h3>{app.title}</h3>
                    <p className="text-dim text-sm">{app.description}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Link key={app.to} to={app.to} className="card">
                <div className="row">
                  <app.icon size={26} strokeWidth={1.5} color="var(--text)" />
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
