import ExcelJS from 'exceljs'
import type { Categoria } from './types'

const COLUNAS = ['Conta', 'Data', 'Valor', 'Descrição', 'Categoria', 'Obs']

export async function gerarTemplate(contas: string[], categorias: Categoria[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook()

  const listas = wb.addWorksheet('Listas')
  listas.getColumn(1).values = ['Contas', ...contas]
  listas.getColumn(2).values = ['Categorias', ...categorias.map((c) => c.nome)]
  listas.state = 'veryHidden'

  const ws = wb.addWorksheet('Extrato')
  ws.addRow(COLUNAS)
  ws.getRow(1).font = { bold: true }
  ws.columns = [
    { width: 18 },
    { width: 12 },
    { width: 12 },
    { width: 42 },
    { width: 28 },
    { width: 28 },
  ]

  const exemplo = ws.addRow([
    contas[0] ?? '',
    new Date(),
    -150.5,
    'Ex: Pix enviado - Supermercado',
    categorias[0]?.nome ?? '',
    '',
  ])
  exemplo.getCell(2).numFmt = 'dd/mm/yyyy'
  exemplo.font = { italic: true, color: { argb: 'FF9CA3AF' } }

  const ultimaLinha = 500
  for (let r = 2; r <= ultimaLinha; r++) {
    ws.getCell(`B${r}`).numFmt = 'dd/mm/yyyy'
    ws.getCell(`A${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Listas!$A$2:$A$${contas.length + 1}`],
    }
    ws.getCell(`E${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Listas!$B$2:$B$${categorias.length + 1}`],
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export interface LinhaTemplate {
  conta: string
  data: number | null
  valor: number
  descricao: string
  categoriaNome: string
  obs: string
}

export async function lerTemplate(file: File): Promise<LinhaTemplate[]> {
  const wb = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await wb.xlsx.load(buffer)

  const ws = wb.getWorksheet('Extrato') ?? wb.worksheets[0]
  const linhas: LinhaTemplate[] = []

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const conta = String(row.getCell(1).value ?? '').trim()
    const descricao = String(row.getCell(4).value ?? '').trim()
    const valorCell = row.getCell(3).value
    if (!conta && !descricao && (valorCell === null || valorCell === undefined)) return

    const dataCell = row.getCell(2).value
    let dataMs: number | null = null
    if (dataCell instanceof Date) {
      dataMs = dataCell.getTime()
    } else if (typeof dataCell === 'string') {
      const m = dataCell.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (m) dataMs = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime()
    }

    const valor = typeof valorCell === 'number' ? valorCell : Number.parseFloat(String(valorCell ?? '0'))
    const categoriaNome = String(row.getCell(5).value ?? '').trim()
    const obs = String(row.getCell(6).value ?? '').trim()

    linhas.push({ conta, data: dataMs, valor, descricao, categoriaNome, obs })
  })

  return linhas
}
