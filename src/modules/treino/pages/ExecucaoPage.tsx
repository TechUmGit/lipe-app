import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../core/AuthContext'
import { ExercicioItem } from '../components/ExercicioItem'
import {
  atualizarAbdominalLombar,
  atualizarExerciciosGrupo,
  registrarExecucao,
  getSerieAtiva,
} from '../lib/treinoApi'
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

  async function atualizarCarga(i: number, carga: string) {
    if (!user || !serie || !grupo) return
    if (i < totalPrincipais) {
      const exercicios = serie.grupos[grupo].map((ex, idx) => (idx === i ? { ...ex, carga } : ex))
      setSerie({ ...serie, grupos: { ...serie.grupos, [grupo]: exercicios } })
      await atualizarExerciciosGrupo(user.uid, serie.id, grupo, exercicios)
    } else {
      const idx = i - totalPrincipais
      const exercicios = serie.abdominalLombar.map((ex, j) => (j === idx ? { ...ex, carga } : ex))
      setSerie({ ...serie, abdominalLombar: exercicios })
      await atualizarAbdominalLombar(user.uid, serie.id, exercicios)
    }
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
              <ExercicioItem
                exercicio={ex}
                checked={feitos.has(i)}
                onToggle={() => toggle(i)}
                onCargaChange={(carga) => atualizarCarga(i, carga)}
              />
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
