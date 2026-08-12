import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../core/AuthContext'
import { detectarColunas, parseCsv, parseData, parseValor } from '../lib/csv'
import { getCategorias, getContas, salvarLancamentos } from '../lib/financasApi'
import { GRUPOS_CATEGORIA, type Categoria, type NovoLancamento } from '../lib/types'

interface LinhaParseada {
  data: number | null
  dataTexto: string
  valor: number
  descricao: string
}

export function ImportarExtratoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [contas, setContas] = useState<string[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [conta, setConta] = useState('')

  const [textoCsv, setTextoCsv] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [linhasBrutas, setLinhasBrutas] = useState<string[][]>([])
  const [colData, setColData] = useState(-1)
  const [colValor, setColValor] = useState(-1)
  const [colDescricao, setColDescricao] = useState(-1)

  const [categoriaPorLinha, setCategoriaPorLinha] = useState<Record<number, string>>({})
  const [obsPorLinha, setObsPorLinha] = useState<Record<number, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([getContas(user.uid), getCategorias(user.uid)]).then(([c, cat]) => {
      setContas(c)
      setCategorias(cat)
      if (c.length) setConta(c[0])
    })
  }, [user])

  function processarCsv() {
    setErro(null)
    const linhas = parseCsv(textoCsv)
    if (linhas.length < 2) {
      setErro('Não consegui identificar linhas suficientes nesse CSV.')
      return
    }
    const [head, ...resto] = linhas
    const mapa = detectarColunas(head)
    setHeaders(head)
    setLinhasBrutas(resto)
    setColData(mapa.data)
    setColValor(mapa.valor)
    setColDescricao(mapa.descricao)
    setCategoriaPorLinha({})
    setObsPorLinha({})
  }

  const linhasParseadas: LinhaParseada[] = useMemo(() => {
    if (colData < 0 || colValor < 0 || colDescricao < 0) return []
    return linhasBrutas.map((linha) => {
      const dataTexto = linha[colData] ?? ''
      return {
        data: parseData(dataTexto),
        dataTexto,
        valor: parseValor(linha[colValor] ?? '0'),
        descricao: (linha[colDescricao] ?? '').trim(),
      }
    })
  }, [linhasBrutas, colData, colValor, colDescricao])

  const categoriasOrdenadas = useMemo(
    () => GRUPOS_CATEGORIA.map((g) => ({ ...g, itens: categorias.filter((c) => c.grupo === g.id) })),
    [categorias],
  )

  const prontoParaMapear = headers.length > 0
  const colunasValidas = colData >= 0 && colValor >= 0 && colDescricao >= 0

  async function salvar() {
    if (!user || !conta) return
    setErro(null)
    const semData = linhasParseadas.some((l) => l.data === null)
    if (semData) {
      setErro('Algumas linhas têm data em formato não reconhecido. Confira a coluna de data.')
      return
    }

    const lancamentos: NovoLancamento[] = linhasParseadas.map((l, i) => {
      const d = new Date(l.data as number)
      return {
        conta,
        data: l.data as number,
        valor: l.valor,
        descricao: l.descricao,
        categoriaId: categoriaPorLinha[i] ?? null,
        obs: obsPorLinha[i] ?? '',
        mes: d.getMonth() + 1,
        ano: d.getFullYear(),
      }
    })

    setSalvando(true)
    try {
      await salvarLancamentos(user.uid, lancamentos)
      navigate('/financas')
    } catch (e) {
      console.error(e)
      setErro('Não foi possível salvar os lançamentos. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="stack">
      <h2>Importar extrato</h2>

      <label>
        Conta
        <select value={conta} onChange={(e) => setConta(e.target.value)}>
          {contas.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Cole aqui o CSV exportado do banco
        <textarea
          rows={8}
          value={textoCsv}
          onChange={(e) => setTextoCsv(e.target.value)}
          placeholder="Data,Valor,Descrição&#10;01/01/2026,-97.91,Pix enviado..."
        />
      </label>

      <button type="button" className="btn btn-primary" onClick={processarCsv} disabled={!textoCsv.trim()}>
        Analisar CSV
      </button>

      {prontoParaMapear && (
        <div className="stack card">
          <h3>Confirme as colunas</h3>
          <p className="text-dim text-sm">
            {linhasBrutas.length} linha(s) encontrada(s). Confira se identifiquei as colunas certas.
          </p>

          <div className="row">
            <label style={{ flex: 1 }}>
              Data
              <select value={colData} onChange={(e) => setColData(Number(e.target.value))}>
                <option value={-1}>Selecione...</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Coluna ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Valor
              <select value={colValor} onChange={(e) => setColValor(Number(e.target.value))}>
                <option value={-1}>Selecione...</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Coluna ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Descrição
              <select value={colDescricao} onChange={(e) => setColDescricao(Number(e.target.value))}>
                <option value={-1}>Selecione...</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Coluna ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {colunasValidas && linhasParseadas.length > 0 && (
        <div className="stack">
          <h3>Categorize cada lançamento</h3>
          <div className="stack" style={{ gap: 8 }}>
            {linhasParseadas.map((l, i) => (
              <div key={i} className="card stack" style={{ gap: 6 }}>
                <div className="row-between">
                  <span className="text-sm">
                    {l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '⚠️ data inválida'}
                  </span>
                  <span
                    className="text-sm"
                    style={{ fontWeight: 600, color: l.valor < 0 ? 'var(--danger)' : 'var(--success)' }}
                  >
                    {l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <p className="text-sm" style={{ overflowWrap: 'break-word' }}>
                  {l.descricao}
                </p>
                <select
                  value={categoriaPorLinha[i] ?? ''}
                  onChange={(e) =>
                    setCategoriaPorLinha((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                >
                  <option value="">Sem categoria</option>
                  {categoriasOrdenadas.map((g) =>
                    g.itens.length ? (
                      <optgroup key={g.id} label={g.label}>
                        {g.itens.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.transferencia ? '↔ ' : ''}
                            {c.nome}
                          </option>
                        ))}
                      </optgroup>
                    ) : null,
                  )}
                </select>
                <input
                  placeholder="Comentário (opcional)"
                  value={obsPorLinha[i] ?? ''}
                  onChange={(e) => setObsPorLinha((prev) => ({ ...prev, [i]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          {erro && <p className="error-text">{erro}</p>}

          <button className="btn btn-primary btn-block" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : `Salvar ${linhasParseadas.length} lançamento(s)`}
          </button>
        </div>
      )}
    </div>
  )
}
