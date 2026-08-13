import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export { MESES }

export function MonthSwitcher({
  mes,
  ano,
  onChange,
}: {
  mes: number
  ano: number
  onChange: (mes: number, ano: number) => void
}) {
  const inicioX = useRef<number | null>(null)

  function mudar(delta: number) {
    let novoMes = mes + delta
    let novoAno = ano
    if (novoMes > 12) {
      novoMes = 1
      novoAno += 1
    } else if (novoMes < 1) {
      novoMes = 12
      novoAno -= 1
    }
    onChange(novoMes, novoAno)
  }

  function onPointerDown(e: React.PointerEvent) {
    inicioX.current = e.clientX
  }

  function onPointerUp(e: React.PointerEvent) {
    if (inicioX.current === null) return
    const delta = e.clientX - inicioX.current
    inicioX.current = null
    if (Math.abs(delta) < 40) return
    mudar(delta < 0 ? 1 : -1)
  }

  return (
    <div
      className="row-between"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ touchAction: 'pan-y', userSelect: 'none' }}
    >
      <button type="button" className="btn btn-ghost" onClick={() => mudar(-1)} aria-label="Mês anterior">
        <ChevronLeft size={20} strokeWidth={1.5} />
      </button>
      <h2 style={{ margin: 0 }}>
        {MESES[mes - 1]} {ano}
      </h2>
      <button type="button" className="btn btn-ghost" onClick={() => mudar(1)} aria-label="Próximo mês">
        <ChevronRight size={20} strokeWidth={1.5} />
      </button>
    </div>
  )
}
