import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../core/AuthContext'
import { getExecucoesDaSerie, getSerieAtiva } from '../lib/treinoApi'
import { calcularStatusRenovacao, proximoGrupo, type StatusRenovacao } from '../lib/logic'
import { GRUPOS, type Execucao, type Serie } from '../lib/types'

export function TreinoHomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [serie, setSerie] = useState<Serie | null>(null)
  const [execucoes, setExecucoes] = useState<Execucao[]>([])

  useEffect(() => {
    if (!user) return
    carregar()
    async function carregar() {
      const s = await getSerieAtiva(user!.uid)
      setSerie(s)
      if (s) {
        const ex = await getExecucoesDaSerie(user!.uid, s.id)
        setExecucoes(ex)
      }
      setLoading(false)
    }
  }, [user])

  if (loading) return <p className="text-dim">Carregando...</p>

  if (!serie) {
    return (
      <div className="card text-center stack">
        <p>Você ainda não tem uma série cadastrada.</p>
        <Link to="/treino/serie" className="btn btn-primary">
          Criar minha série
        </Link>
      </div>
    )
  }

  const proximo = proximoGrupo(execucoes)
  const status: StatusRenovacao = calcularStatusRenovacao(serie, execucoes)
  const grupoInfo = GRUPOS.find((g) => g.id === proximo)!
  const progresso = Math.min(100, Math.round((status.execucoesFeitas / serie.metaExecucoes) * 100))

  return (
    <div className="stack">
      {status.precisaRenovar && (
        <div className="alert">
          {status.motivo === 'execucoes'
            ? `Você completou ${status.execucoesFeitas} treinos dessa série.`
            : `Já se passaram ${status.diasPassados} dias dessa série.`}{' '}
          Hora de gerar uma nova série!{' '}
          <Link to="/treino/serie" style={{ textDecoration: 'underline' }}>
            Ir agora
          </Link>
        </div>
      )}

      <div className="card stack text-center">
        <p className="text-dim text-sm">Próximo treino</p>
        <h1 className="row" style={{ fontSize: 32, justifyContent: 'center' }}>
          <grupoInfo.icon size={28} strokeWidth={1.5} />
          {grupoInfo.label}
        </h1>
        <button
          className="btn btn-primary btn-block row"
          style={{ padding: '16px', fontSize: 18, justifyContent: 'center' }}
          onClick={() => navigate(`/treino/execucao/${proximo}`)}
        >
          <Play size={20} strokeWidth={1.5} fill="currentColor" />
          Play
        </button>
      </div>

      <div className="card stack">
        <div className="row-between">
          <h3>Progresso da série</h3>
          <span className="text-dim text-sm">
            {status.execucoesFeitas}/{serie.metaExecucoes} treinos
          </span>
        </div>
        <div className="progress-bar">
          <div style={{ width: `${progresso}%` }} />
        </div>
        <p className="text-dim text-sm">
          {status.diasPassados}/{serie.metaDias} dias desde o início
        </p>
      </div>

      <div className="stack">
        <h3>Por grupo</h3>
        {GRUPOS.map((g) => {
          const vezes = execucoes.filter((e) => e.grupo === g.id).length
          return (
            <div key={g.id} className="row-between card" style={{ padding: '12px 16px' }}>
              <span className="row">
                <g.icon size={18} strokeWidth={1.5} />
                {g.label}
              </span>
              <span className="text-dim text-sm">{vezes}x</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
