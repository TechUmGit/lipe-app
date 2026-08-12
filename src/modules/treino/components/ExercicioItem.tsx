import { linkVideoExercicio } from '../lib/logic'
import type { Exercicio } from '../lib/types'

function Thumb({ exercicio, size }: { exercicio: Exercicio; size: number }) {
  if (exercicio.imagemUrl) {
    return (
      <img
        src={exercicio.imagemUrl}
        alt={exercicio.nome}
        className="exercise-thumb"
        style={{ width: size, aspectRatio: '1 / 1', flexShrink: 0 }}
        loading="lazy"
      />
    )
  }
  return (
    <div
      className="exercise-thumb-placeholder"
      style={{ width: size, aspectRatio: '1 / 1', flexShrink: 0, fontSize: size * 0.4 }}
    >
      🏋️
    </div>
  )
}

export function ExercicioItem({
  exercicio,
  checked,
  onToggle,
}: {
  exercicio: Exercicio
  checked?: boolean
  onToggle?: () => void
}) {
  const conteudo = (
    <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
      <Thumb exercicio={exercicio} size={64} />
      <div className="stack" style={{ gap: 4, flex: 1 }}>
        <div className="row-between">
          <p style={{ textDecoration: checked ? 'line-through' : 'none' }}>{exercicio.nome}</p>
          <span className="text-dim text-sm" style={{ whiteSpace: 'nowrap' }}>
            {exercicio.series}x{exercicio.repeticoes}
            {exercicio.carga ? ` · ${exercicio.carga}` : ''}
          </span>
        </div>
        {exercicio.observacao && <p className="text-dim text-sm">{exercicio.observacao}</p>}
        <a
          href={linkVideoExercicio(exercicio)}
          target="_blank"
          rel="noreferrer"
          className="video-link"
          onClick={(e) => e.stopPropagation()}
        >
          ▶ Ver vídeo
        </a>
      </div>
    </div>
  )

  if (onToggle) {
    return (
      <label
        className="card"
        style={{ cursor: 'pointer', opacity: checked ? 0.55 : 1, display: 'block' }}
      >
        <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            style={{ width: 20, height: 20, marginTop: 4, flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>{conteudo}</div>
        </div>
      </label>
    )
  }

  return <div className="card">{conteudo}</div>
}
