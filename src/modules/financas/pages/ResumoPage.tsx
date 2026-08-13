import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { DonutChart } from '../components/DonutChart'
import { getCategorias, getLancamentos } from '../lib/financasApi'
import type { Categoria, Lancamento } from '../lib/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const CORES = {
  despesa_fixa: '#6d4de6',
  despesa_variavel: '#a78bfa',
  investimento: '#d6c8fb',
}

export function ResumoPage() {
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

  const categoriasPorId = useMemo(() => {
    const map = new Map<string, Categoria>()
    for (const c of categorias) map.set(c.id, c)
    return map
  }, [categorias])

  const resumo = useMemo(() => {
    let receita = 0
    let despesaFixa = 0
    let despesaVariavel = 0
    let investimento = 0

    for (const l of lancamentos) {
      const cat = l.categoriaId ? categoriasPorId.get(l.categoriaId) : undefined
      if (!cat || cat.transferencia || cat.grupo === 'bens') continue
      const valorAbs = Math.abs(l.valor)
      if (cat.grupo === 'receita') receita += l.valor
      else if (cat.grupo === 'despesa_fixa') despesaFixa += valorAbs
      else if (cat.grupo === 'despesa_variavel') despesaVariavel += valorAbs
      else if (cat.grupo === 'investimento') investimento += valorAbs
    }

    const despesaTotal = despesaFixa + despesaVariavel + investimento
    return {
      receita,
      despesaFixa,
      despesaVariavel,
      investimento,
      despesaTotal,
      saldo: receita - despesaTotal,
    }
  }, [lancamentos, categoriasPorId])

  const segmentos = [
    { label: 'Despesas Fixas', value: resumo.despesaFixa, color: CORES.despesa_fixa },
    { label: 'Despesas Variáveis', value: resumo.despesaVariavel, color: CORES.despesa_variavel },
    { label: 'Investimentos', value: resumo.investimento, color: CORES.investimento },
  ]

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

      {loading ? (
        <p className="text-dim">Carregando...</p>
      ) : (
        <>
          <div className="card stack" style={{ alignItems: 'center' }}>
            <DonutChart
              segmentos={segmentos}
              center={
                <>
                  <p className="text-dim text-sm">Gasto em {MESES[mes - 1]}</p>
                  <p style={{ fontSize: 24, fontWeight: 700 }}>{formatarMoeda(resumo.despesaTotal)}</p>
                </>
              }
            />

            <div className="stack" style={{ width: '100%', gap: 8, marginTop: 8 }}>
              {segmentos.map((s) => (
                <div key={s.label} className="row-between legend-row">
                  <div className="row legend-row">
                    <span className="legend-dot" style={{ background: s.color }} />
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <span className="text-sm text-dim">{formatarMoeda(s.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card stat-row">
            <div>
              <p className="text-dim text-sm">Receita</p>
              <p style={{ color: 'var(--success)', fontWeight: 600 }}>{formatarMoeda(resumo.receita)}</p>
            </div>
            <div>
              <p className="text-dim text-sm">Despesa</p>
              <p style={{ fontWeight: 600 }}>{formatarMoeda(resumo.despesaTotal)}</p>
            </div>
            <div>
              <p className="text-dim text-sm">Saldo</p>
              <p style={{ fontWeight: 600, color: resumo.saldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatarMoeda(resumo.saldo)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
