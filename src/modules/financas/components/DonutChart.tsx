import type { ReactNode } from 'react'

export interface Segmento {
  label: string
  value: number
  color: string
}

export function DonutChart({
  segmentos,
  size = 220,
  strokeWidth = 22,
  center,
}: {
  segmentos: Segmento[]
  size?: number
  strokeWidth?: number
  center: ReactNode
}) {
  const total = segmentos.reduce((sum, s) => sum + s.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let acumulado = 0

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
        />
        {total > 0 &&
          segmentos.map((s, i) => {
            if (s.value <= 0) return null
            const fracao = s.value / total
            const comprimento = fracao * circumference
            const offset = -acumulado
            acumulado += comprimento
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${comprimento} ${circumference - comprimento}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            )
          })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 8,
        }}
      >
        {center}
      </div>
    </div>
  )
}
