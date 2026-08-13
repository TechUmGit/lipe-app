const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function rotuloDia(data: Date): string {
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)

  if (mesmoDia(data, hoje)) return 'Hoje'
  if (mesmoDia(data, ontem)) return 'Ontem'
  return `${data.getDate()} ${MESES_ABREV[data.getMonth()]}`
}

export function agruparPorDia<T extends { data: number }>(itens: T[]): { label: string; itens: T[] }[] {
  const ordenados = [...itens].sort((a, b) => b.data - a.data)
  const grupos: { label: string; itens: T[] }[] = []

  for (const item of ordenados) {
    const label = rotuloDia(new Date(item.data))
    const grupoAtual = grupos[grupos.length - 1]
    if (grupoAtual && grupoAtual.label === label) {
      grupoAtual.itens.push(item)
    } else {
      grupos.push({ label, itens: [item] })
    }
  }

  return grupos
}
