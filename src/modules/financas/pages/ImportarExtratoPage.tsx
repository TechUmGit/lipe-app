import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../core/AuthContext'
import { Topbar } from '../../../shared/components/Topbar'
import { gerarTemplate, lerTemplate, type LinhaTemplate } from '../lib/excelTemplate'
import { getCategorias, getContas, salvarLancamentos } from '../lib/financasApi'
import { GRUPOS_CATEGORIA, type Categoria, type NovoLancamento } from '../lib/types'

interface LinhaRevisao extends LinhaTemplate {
  categoriaId: string | null
}

function normalizar(s: string) {
  return s.trim().toLowerCase()
}

export function ImportarExtratoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [contas, setContas] = useState<string[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  const [linhas, setLinhas] = useState<LinhaRevisao[] | null>(null)
  const [baixando, setBaixando] = useState(false)
  const [lendo, setLendo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    Promise.all([getContas(user.uid), getCategorias(user.uid)]).then(([c, cat]) => {
      setContas(c)
      setCategorias(cat)
    })
  }, [user])

  const categoriasPorNomeNormalizado = useMemo(() => {
    const map = new Map<string, Categoria>()
    for (const c of categorias) map.set(normalizar(c.nome), c)
    return map
  }, [categorias])

  const categoriasOrdenadas = useMemo(
    () => GRUPOS_CATEGORIA.map((g) => ({ ...g, itens: categorias.filter((c) => c.grupo === g.id) })),
    [categorias],
  )

  async function baixarModelo() {
    if (!user) return
    setBaixando(true)
    try {
      const blob = await gerarTemplate(contas, categorias)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'modelo-extrato-lipe.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBaixando(false)
    }
  }

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    setLendo(true)
    try {
      const linhasLidas = await lerTemplate(file)
      const revisao: LinhaRevisao[] = linhasLidas.map((l) => {
        const cat = categoriasPorNomeNormalizado.get(normalizar(l.categoriaNome))
        return { ...l, categoriaId: cat?.id ?? null }
      })
      setLinhas(revisao)
    } catch (err) {
      console.error(err)
      setErro('Não consegui ler esse arquivo. Confira se é o modelo baixado pelo app.')
    } finally {
      setLendo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function mudarCategoria(i: number, categoriaId: string) {
    setLinhas((prev) => prev?.map((l, idx) => (idx === i ? { ...l, categoriaId } : l)) ?? null)
  }

  function mudarObs(i: number, obs: string) {
    setLinhas((prev) => prev?.map((l, idx) => (idx === i ? { ...l, obs } : l)) ?? null)
  }

  async function salvar() {
    if (!user || !linhas) return
    setErro(null)

    const semData = linhas.some((l) => l.data === null)
    if (semData) {
      setErro('Algumas linhas têm data vazia ou inválida. Confira a planilha.')
      return
    }
    const semConta = linhas.some((l) => !l.conta.trim())
    if (semConta) {
      setErro('Algumas linhas estão sem conta preenchida.')
      return
    }

    const lancamentos: NovoLancamento[] = linhas.map((l) => {
      const d = new Date(l.data as number)
      return {
        conta: l.conta,
        data: l.data as number,
        valor: l.valor,
        descricao: l.descricao,
        categoriaId: l.categoriaId,
        obs: l.obs,
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
    <>
      <Topbar title="Importar extrato" backTo="/financas" />
      <div className="page">
      <div className="card stack">
        <h3>1. Baixe o modelo</h3>
        <p className="text-dim text-sm">
          Preencha no computador, com Conta e Categoria escolhidas na lista suspensa de cada
          célula. Sempre que suas contas ou categorias mudarem, baixe um modelo novo.
        </p>
        <button type="button" className="btn" onClick={baixarModelo} disabled={baixando}>
          {baixando ? 'Gerando...' : '⬇️ Baixar modelo (.xlsx)'}
        </button>
      </div>

      <div className="card stack">
        <h3>2. Envie o arquivo preenchido</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={selecionarArquivo}
          disabled={lendo}
        />
        {lendo && <p className="text-dim text-sm">Lendo arquivo...</p>}
      </div>

      {erro && <p className="error-text">{erro}</p>}

      {linhas && linhas.length === 0 && (
        <p className="text-dim text-center">Não encontrei nenhuma linha preenchida nesse arquivo.</p>
      )}

      {linhas && linhas.length > 0 && (
        <div className="stack">
          <h3>3. Confira e salve</h3>
          <div className="stack" style={{ gap: 8 }}>
            {linhas.map((l, i) => (
              <div key={i} className="card stack" style={{ gap: 6 }}>
                <div className="row-between">
                  <span className="text-sm text-dim">
                    {l.data ? new Date(l.data).toLocaleDateString('pt-BR') : '⚠️ data inválida'} ·{' '}
                    {l.conta || '⚠️ sem conta'}
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
                <select value={l.categoriaId ?? ''} onChange={(e) => mudarCategoria(i, e.target.value)}>
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
                  value={l.obs}
                  onChange={(e) => mudarObs(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button className="btn btn-primary btn-block" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : `Salvar ${linhas.length} lançamento(s)`}
          </button>
        </div>
      )}
      </div>
    </>
  )
}
