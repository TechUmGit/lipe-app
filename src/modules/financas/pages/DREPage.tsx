import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { getCategorias, getLancamentos } from '../lib/financasApi'
import { GRUPOS_CATEGORIA, type Categoria, type Lancamento } from '../lib/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function DREPage() {
  const { user } = useAuth()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [loading, setLoading] = useState(true)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([getLancamentos(user.uid, mes, ano), getCategorias(user.uid)]).then(([l, c]) => {
      setLancamentos(l)
      setCategorias(c)
      setLoading(false)
    })
  }, [user, mes, ano])

  const dre = useMemo(() => {
    const porCategoria = new Map<string, number>()
    for (const l of lancamentos) {
      if (!l.categoriaId) continue
      porCategoria.set(l.categoriaId, (porCategoria.get(l.categoriaId) ?? 0) + l.valor)
    }

    const grupos = GRUPOS_CATEGORIA.filter((g) => g.id !== 'bens').map((g) => {
      const categoriasDoGrupo = categorias.filter((c) => c.grupo === g.id && !c.transferencia)
      const linhas = categoriasDoGrupo
        .map((c) => ({ categoria: c, total: porCategoria.get(c.id) ?? 0 }))
        .filter((l) => l.total !== 0)
      const subtotal = linhas.reduce((sum, l) => sum + l.total, 0)
      return { ...g, linhas, subtotal }
    })

    const receita = grupos.find((g) => g.id === 'receita')?.subtotal ?? 0
    const totalDespesas = grupos
      .filter((g) => g.id !== 'receita')
      .reduce((sum, g) => sum + g.subtotal, 0)

    return { grupos, receita, totalDespesas, resultado: receita + totalDespesas }
  }, [lancamentos, categorias])

  return (
    <div className="stack">
      <div className="row">
        <label style={{ flex: 1 }}>
          Mês
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          Ano
          <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
        </label>
      </div>

      <div className="alert">
        Por enquanto essa DRE mostra só o realizado. Comparação com orçado e comentários por linha
        vêm numa próxima etapa.
      </div>

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
        <>
          {dre.grupos.map((g) =>
            g.linhas.length ? (
              <div key={g.id} className="stack">
                <div className="row-between">
                  <h3>{g.label}</h3>
                  <span style={{ fontWeight: 600 }}>{formatarMoeda(g.subtotal)}</span>
                </div>
                <div className="card stack" style={{ gap: 6 }}>
                  {g.linhas.map(({ categoria, total }) => (
                    <div key={categoria.id} className="row-between text-sm">
                      <span>{categoria.nome}</span>
                      <span className="text-dim">{formatarMoeda(total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}

          <div className="card stack">
            <div className="row-between text-sm">
              <span className="text-dim">Receita</span>
              <span style={{ color: 'var(--success)' }}>{formatarMoeda(dre.receita)}</span>
            </div>
            <div className="row-between text-sm">
              <span className="text-dim">Despesas totais</span>
              <span>{formatarMoeda(dre.totalDespesas)}</span>
            </div>
            <div className="row-between">
              <span>Resultado</span>
              <span
                style={{
                  fontWeight: 700,
                  color: dre.resultado >= 0 ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {formatarMoeda(dre.resultado)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
