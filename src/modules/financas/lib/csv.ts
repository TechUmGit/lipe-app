export function parseCsv(texto: string): string[][] {
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let dentroAspas = false

  const texto2 = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < texto2.length; i++) {
    const char = texto2[i]
    const proximo = texto2[i + 1]

    if (dentroAspas) {
      if (char === '"' && proximo === '"') {
        campo += '"'
        i++
      } else if (char === '"') {
        dentroAspas = false
      } else {
        campo += char
      }
      continue
    }

    if (char === '"') {
      dentroAspas = true
    } else if (char === ',' || char === ';') {
      linha.push(campo)
      campo = ''
    } else if (char === '\n') {
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else {
      campo += char
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo)
    linhas.push(linha)
  }

  return linhas.filter((l) => l.some((c) => c.trim() !== ''))
}

export function detectarDelimitador(primeiraLinha: string): ',' | ';' {
  const virgulas = (primeiraLinha.match(/,/g) ?? []).length
  const pontoVirgulas = (primeiraLinha.match(/;/g) ?? []).length
  return pontoVirgulas > virgulas ? ';' : ','
}

const NOMES_DATA = ['data', 'date']
const NOMES_VALOR = ['valor', 'amount', 'value']
const NOMES_DESCRICAO = [
  'descrição',
  'descricao',
  'description',
  'histórico',
  'historico',
  'lançamento',
  'lancamento',
  'title',
]

function acharColuna(headers: string[], candidatos: string[]): number {
  const normalizados = headers.map((h) => h.trim().toLowerCase())
  for (const nome of candidatos) {
    const idx = normalizados.findIndex((h) => h === nome || h.includes(nome))
    if (idx >= 0) return idx
  }
  return -1
}

export interface MapeamentoColunas {
  data: number
  valor: number
  descricao: number
}

export function detectarColunas(headers: string[]): MapeamentoColunas {
  return {
    data: acharColuna(headers, NOMES_DATA),
    valor: acharColuna(headers, NOMES_VALOR),
    descricao: acharColuna(headers, NOMES_DESCRICAO),
  }
}

export function parseValor(raw: string): number {
  let s = raw.trim().replace(/[^\d,.-]/g, '')
  const temVirgula = s.includes(',')
  const temPonto = s.includes('.')

  if (temVirgula && temPonto) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    s = s.replace(',', '.')
  } else if (temPonto) {
    const partes = s.split('.')
    if (partes[partes.length - 1].length === 3) {
      s = partes.join('')
    }
  }
  return Number.parseFloat(s)
}

export function parseData(raw: string): number | null {
  const s = raw.trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime()
  return null
}
