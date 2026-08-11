import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../core/AuthContext'
import { registrarExecucao, getSerieAtiva } from '../lib/treinoApi'
import { GRUPOS, type Exercicio, type GrupoTreino, type Serie } from '../lib/types'

export function ExecucaoPage() {
  const { grupo } = useParams<{ grupo: GrupoTreino }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [serie, setSerie] = useState<Serie | null>(null)
  const [loading, setLoading] = useState(true)
  const [feitos, setFeitos] = useState<Set<number>>(new Set())
  const [concluindo, setConcluindo] = useState(false)

  useEffect(() => {
    if (!user) return
    getSerieAtiva(user.uid).then((s) => {
      setSerie(s)
      setLoading(false)
    })
  }, [user])

  if (loading) return <div className="page">Carregando...</div>
  if (!serie || !grupo) {
    return (
      <div className="page">
        <p className="text-dim">Treino não encontrado.</p>
      </div>
    )
  }

  const grupoInfo = GRUPOS.find((g) => g.id === grupo)!
  const exercicios: Exercicio[] = [
    ...(serie.grupos[grupo] ?? []),
    ...serie.abdominalLombar,
  ]
  const totalPrincipais = serie.grupos[grupo]?.length ?? 0

  function toggle(i: number) {
    setFeitos((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function concluirTreino() {
    if (!user || !serie || !grupo) return
    setConcluindo(true)
    await registrarExecucao(user.uid, serie.id, grupo)
    navigate('/treino')
  }

  return (
    <div className="page">
      <div className="stack">
        <div className="row">
          <button className="btn btn-ghost" onClick={() => navigate('/treino')} aria-label="Voltar">
            ←
          </button>
          <h1 style={{ fontSize: 22 }}>
            {grupoInfo.emoji} {grupoInfo.label}
          </h1>
        </div>

        <div className="stack">
          {exercicios.map((ex, i) => (
            <div key={i}>
              {i === totalPrincipais && (
                <p className="text-dim text-sm" style={{ margin: '8px 0 4px' }}>
                  🔥 Abdominal e Lombar
                </p>
              )}
              <label
                className="card row-between"
                style={{ cursor: 'pointer', opacity: feitos.has(i) ? 0.55 : 1 }}
              >
                <div className="row" style={{ gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={feitos.has(i)}
                    onChange={() => toggle(i)}
                    style={{ width: 20, height: 20 }}
                  />
                  <div>
                    <p style={{ textDecoration: feitos.has(i) ? 'line-through' : 'none' }}>
                      {ex.nome}
                    </p>
                    {ex.observacao && <p className="text-dim text-sm">{ex.observacao}</p>}
                  </div>
                </div>
                <span className="text-dim text-sm">
                  {ex.series}x{ex.repeticoes}
                  {ex.carga ? ` · ${ex.carga}` : ''}
                </span>
              </label>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary btn-block"
          style={{ padding: 16, fontSize: 16 }}
          onClick={concluirTreino}
          disabled={concluindo}
        >
          {concluindo ? 'Salvando...' : '✓ Concluir treino'}
        </button>
      </div>
    </div>
  )
}
