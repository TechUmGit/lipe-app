export function formatarData(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR')
}

export function paraInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

export function deInputDate(valor: string) {
  const [ano, mes, dia] = valor.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getTime()
}
