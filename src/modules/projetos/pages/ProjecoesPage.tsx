import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { STATUS_PROJETO_LABEL, STATUS_PROJETO_ORDEM, valorNoMes, valoresDoAno } from '../lib/calculo'
import { getProjetos } from '../lib/projetosApi'
import type { Projeto } from '../lib/types'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProjecoesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [ano, setAno] = useState(new Date().getFullYear())
  const [gruposColapsados, setGruposColapsados] = useState<Set<Projeto['status']>>(new Set())

  useEffect(() => {
    if (!user) return
    getProjetos(user.uid).then((p) => {
      setProjetos(p)
      setLoading(false)
    })
  }, [user])

  function alternarGrupoColapsado(status: Projeto['status']) {
    setGruposColapsados((prev) => {
      const novo = new Set(prev)
      if (novo.has(status)) novo.delete(status)
      else novo.add(status)
      return novo
    })
  }

  const ativos = useMemo(() => projetos.filter((p) => p.status !== 'cancelado'), [projetos])

  const tabela = useMemo(() => {
    const linhas = ativos.map((p) => ({ projeto: p, meses: valoresDoAno(p, ano) }))
    const grupos = STATUS_PROJETO_ORDEM.filter((s) => s !== 'cancelado').map((status) => {
      const linhasDoGrupo = linhas.filter((l) => l.projeto.status === status)
      const mesesSubtotal = new Array(12).fill(0)
      for (const l of linhasDoGrupo) l.meses.forEach((v, i) => (mesesSubtotal[i] += v))
      return { status, linhas: linhasDoGrupo, mesesSubtotal }
    })
    const totalPorMes = new Array(12).fill(0).map((_, i) => grupos.reduce((s, g) => s + g.mesesSubtotal[i], 0))
    return { grupos, totalPorMes }
  }, [ativos, ano])

  const resumo = useMemo(() => {
    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1
    const anoAtual = hoje.getFullYear()

    const esteMesTodos = ativos.reduce((s, p) => s + valorNoMes(p, mesAtual, anoAtual), 0)
    const esteMesFechados = ativos
      .filter((p) => p.status === 'fechado')
      .reduce((s, p) => s + valorNoMes(p, mesAtual, anoAtual), 0)
    const totalAno = tabela.totalPorMes.reduce((s, v) => s + v, 0)
    const mediaMensalAno = totalAno / 12

    return { esteMesTodos, esteMesFechados, mediaMensalAno, mesAtual, anoAtual }
  }, [ativos, tabela])

  if (loading) return <p className="text-dim">Carregando...</p>

  return (
    <div className="stack">
      <div className="row-between">
        <h2 style={{ margin: 0 }}>Projeção {ano}</h2>
        <div className="row" style={{ gap: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior">
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setAno((a) => a + 1)} aria-label="Próximo ano">
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="dre-table-wrap">
        <table className="dre-table">
          <thead>
            <tr>
              <th>Projeto</th>
              {MESES_CURTO.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabela.grupos.map((g) => {
              if (g.linhas.length === 0) return null
              const colapsado = gruposColapsados.has(g.status)
              return (
                <Fragment key={g.status}>
                  <tr
                    className="dre-table-grupo"
                    style={{ cursor: 'pointer' }}
                    onClick={() => alternarGrupoColapsado(g.status)}
                  >
                    <td>
                      <span className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <ChevronDown
                          size={16}
                          strokeWidth={1.5}
                          style={{
                            transform: colapsado ? 'rotate(-90deg)' : undefined,
                            transition: 'transform 0.15s',
                            flexShrink: 0,
                          }}
                        />
                        {STATUS_PROJETO_LABEL[g.status]}
                      </span>
                    </td>
                    {g.mesesSubtotal.map((v, i) => (
                      <td key={i}>{v !== 0 ? formatarMoeda(v) : '—'}</td>
                    ))}
                  </tr>
                  {!colapsado &&
                    g.linhas.map((l) => (
                      <tr key={l.projeto.id}>
                        <td>{l.projeto.nome}</td>
                        {l.meses.map((v, i) => (
                          <td key={i}>{v !== 0 ? formatarMoeda(v) : '—'}</td>
                        ))}
                      </tr>
                    ))}
                </Fragment>
              )
            })}
            <tr className="dre-table-resultado">
              <td>Total</td>
              {tabela.totalPorMes.map((v, i) => (
                <td key={i}>{formatarMoeda(v)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <h3>Resumo mensal</h3>
        <div className="card stack" style={{ gap: 8 }}>
          <div className="row-between text-sm">
            <span className="text-dim">A receber em {MESES_CURTO[resumo.mesAtual - 1]}/{resumo.anoAtual} (todos)</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(resumo.esteMesTodos)}</span>
          </div>
          <div className="row-between text-sm">
            <span className="text-dim">A receber em {MESES_CURTO[resumo.mesAtual - 1]}/{resumo.anoAtual} (apenas fechados)</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(resumo.esteMesFechados)}</span>
          </div>
          <div className="row-between text-sm">
            <span className="text-dim">Média mensal em {ano}</span>
            <span style={{ fontWeight: 600 }}>{formatarMoeda(resumo.mediaMensalAno)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
