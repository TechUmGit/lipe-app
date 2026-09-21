import { Check, Download, Eye, EyeOff, Snowflake, SlidersHorizontal, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { Topbar } from '../../../shared/components/Topbar'
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop'
import { Moeda } from '../components/Moeda'
import { PerspectivaMesModal } from '../components/PerspectivaMesModal'
import { PerspectivaPremissasModal } from '../components/PerspectivaPremissasModal'
import {
  calcularPerspectiva,
  chaveMes,
  resumirPerspectiva,
  rotuloMes,
  type LinhaPerspectiva,
} from '../lib/perspectivaCalculo'
import {
  criarPlanoVazio,
  getPlano,
  salvarMes,
  salvarParametros,
  salvarPlanoCongelado,
  substituirPlano,
  validarBackup,
} from '../lib/perspectivaApi'
import { useFinancasPrivacidade } from '../lib/privacidade'
import type { MesPerspectiva, ParametrosPerspectiva, PlanoPerspectiva } from '../lib/types'

const SEM_CENTAVOS = { maximumFractionDigits: 0 }

function Valor({ v, auto }: { v: number; auto?: boolean }) {
  return (
    <span className={auto ? 'pl-auto' : undefined}>
      <Moeda valor={v} opcoes={SEM_CENTAVOS} />
    </span>
  )
}

function Delta({ v }: { v: number }) {
  return (
    <span className={v >= 0 ? 'pl-pos' : 'pl-neg'}>
      <Moeda valor={v} opcoes={SEM_CENTAVOS} />
    </span>
  )
}

/** Rola a lista até o mês "próximo a preencher", deixando-o no terço superior da área visível. */
function rolarAteProxima(wrap: HTMLDivElement | null) {
  const linha = wrap?.querySelector<HTMLElement>('tr.pl-proxima')
  if (!wrap || !linha) return
  wrap.scrollTop = Math.max(0, linha.offsetTop - wrap.clientHeight / 3)
}

function Percentual({ v }: { v: number }) {
  return <>{(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</>
}

export function PerspectivaPage() {
  const { user } = useAuth()
  const isDesktop = useIsDesktop()
  const { oculto, alternar } = useFinancasPrivacidade()
  const inputArquivo = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const rolouInicial = useRef(false)
  const [plano, setPlano] = useState<PlanoPerspectiva | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [detalhado, setDetalhado] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [premissas, setPremissas] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('wide', isDesktop)
    return () => document.body.classList.remove('wide')
  }, [isDesktop])

  useEffect(() => {
    if (!user) return
    getPlano(user.uid)
      .then(setPlano)
      .catch(() => setErro('Não consegui carregar o plano.'))
      .finally(() => setCarregando(false))
  }, [user])

  const resultado = useMemo(() => (plano ? calcularPerspectiva(plano) : null), [plano])
  const resumo = useMemo(() => (resultado ? resumirPerspectiva(resultado) : null), [resultado])

  useEffect(() => {
    if (resultado && !rolouInicial.current) {
      rolouInicial.current = true
      rolarAteProxima(listaRef.current)
    }
  }, [resultado])

  const padraoDoMes = useMemo(() => {
    if (!plano || !editando) return null
    const semDados = calcularPerspectiva({ ...plano, meses: { ...plano.meses, [editando]: {} } })
    const linha = semDados.linhas.find((l) => l.chave === editando)
    return linha ? { consorcios: linha.consorcios, retiradas: linha.retiradas } : null
  }, [plano, editando])

  const linhaEditada = editando ? resultado?.linhas.find((l) => l.chave === editando) : undefined

  async function comFalha(operacao: () => Promise<void>, reverter: () => void) {
    try {
      await operacao()
      setErro('')
    } catch {
      reverter()
      setErro('Não foi possível salvar. Tente de novo.')
    }
  }

  async function salvarDadosDoMes(chave: string, dados: MesPerspectiva | null) {
    if (!user || !plano) return
    const anterior = plano
    const meses = { ...plano.meses }
    if (dados) meses[chave] = dados
    else delete meses[chave]
    setPlano({ ...plano, meses })
    await comFalha(() => salvarMes(user.uid, chave, dados), () => setPlano(anterior))
  }

  async function salvarPremissas(parametros: ParametrosPerspectiva) {
    if (!user || !plano) return
    const anterior = plano
    setPlano({ ...plano, parametros })
    await comFalha(() => salvarParametros(user.uid, parametros), () => setPlano(anterior))
  }

  async function congelarPlano() {
    if (!user || !plano || !resultado) return
    const aviso = plano.planoCongeladoRotulo
      ? `Isto substitui o plano congelado em ${plano.planoCongeladoRotulo} pelo P/L de hoje. Continuar?`
      : 'Congelar guarda o P/L de todos os meses como referência do "Delta Projetado". Continuar?'
    if (!confirm(aviso)) return
    const congelado = Object.fromEntries(resultado.linhas.map((l) => [l.chave, Math.round(l.plReal * 100) / 100]))
    const hoje = new Date()
    const rotulo = rotuloMes(chaveMes(hoje.getFullYear(), hoje.getMonth() + 1))
    const anterior = plano
    setPlano({ ...plano, planoCongelado: congelado, planoCongeladoRotulo: rotulo })
    await comFalha(() => salvarPlanoCongelado(user.uid, congelado, rotulo), () => setPlano(anterior))
  }

  async function comecarDoZero() {
    if (!user) return
    try {
      setPlano(await criarPlanoVazio(user.uid))
      setPremissas(true)
    } catch {
      setErro('Não consegui criar o plano.')
    }
  }

  function exportar() {
    if (!plano) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(plano, null, 1)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `perspectiva-pl-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importar(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo || !user) return
    try {
      const validado = validarBackup(JSON.parse(await arquivo.text()))
      if (typeof validado === 'string') {
        setErro(validado)
        return
      }
      if (plano && !confirm('Importar substitui todo o plano atual. Continuar?')) return
      await substituirPlano(user.uid, validado)
      setPlano(validado)
      rolouInicial.current = false
      setErro('')
    } catch {
      setErro('Não consegui ler esse arquivo.')
    }
  }

  function celulasDaLinha(l: LinhaPerspectiva) {
    return (
      <>
        {detalhado && (
          <td>
            <Valor v={l.investimentos} />
          </td>
        )}
        <td>
          <Valor v={l.consorcios} auto={l.consorciosAutomatico && !l.preenchido} />
        </td>
        <td>
          <Valor v={l.retiradas} auto={l.retiradasAutomatico && !l.preenchido} />
        </td>
        <td>
          <Valor v={l.xCapital} />
        </td>
        <td>
          <Valor v={l.totalEntradas} />
        </td>
        <td>
          <Valor v={l.plProjetado} />
        </td>
        <td>
          <Valor v={l.custodiaFillipe} auto={l.custodiaProjetada} />
        </td>
        <td>
          <Valor v={l.custodiaOutros} auto={l.custodiaProjetada} />
        </td>
        <td>
          <Valor v={l.plReal} auto={l.custodiaProjetada} />
        </td>
        <td>
          <Delta v={l.deltaReal} />
        </td>
        {detalhado && (
          <>
            <td>
              <Valor v={l.remuneracaoPossivel} />
            </td>
            <td>
              <Valor v={l.remuneracaoFillipe} />
            </td>
            <td>
              <Valor v={l.salarioDesejado} />
            </td>
            <td>{l.pwa !== undefined ? <Valor v={l.pwa} /> : '—'}</td>
            <td>{l.deltaProjetado !== undefined ? <Delta v={l.deltaProjetado} /> : '—'}</td>
            <td>
              <Valor v={l.plProjetadoLiquido} />
            </td>
            <td>
              <Valor v={l.salarioSemInflacao} />
            </td>
          </>
        )}
      </>
    )
  }

  const ultimo = resumo?.ultimoPreenchido
  const proximo = resumo?.proximoAPreencher

  return (
    <>
      <Topbar
        title="Perspectiva e PL"
        backTo="/financas"
        action={
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '6px 10px' }}
            onClick={alternar}
            aria-label={oculto ? 'Mostrar valores' : 'Ocultar valores'}
            title={oculto ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {oculto ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
          </button>
        }
      />
      <div className="page">
        <input ref={inputArquivo} type="file" accept="application/json,.json" hidden onChange={importar} />
        {erro && <p className="error-text">{erro}</p>}

        {carregando ? (
          <p className="text-dim">Carregando...</p>
        ) : !plano || !resultado || !resumo ? (
          <div className="card stack">
            <h3>Nenhum plano ainda</h3>
            <p className="text-dim text-sm">
              Comece do zero e defina as premissas, ou importe o backup (.json) de um plano que você já tenha.
            </p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={comecarDoZero}>
                Começar do zero
              </button>
              <button type="button" className="btn" onClick={() => inputArquivo.current?.click()}>
                <Upload size={16} strokeWidth={1.5} /> Importar backup
              </button>
            </div>
          </div>
        ) : (
          <>
            {proximo && (
              <div className="card row-between">
                <div>
                  <p className="text-dim text-sm">Próximo a preencher</p>
                  <p style={{ fontWeight: 600 }}>{rotuloMes(proximo.chave)}</p>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => setEditando(proximo.chave)}>
                  Preencher
                </button>
              </div>
            )}

            {ultimo ? (
              <div className="pl-resumo-grid">
                <div className="card">
                  <p className="text-dim text-sm">P/L real · {rotuloMes(ultimo.chave)}</p>
                  <p style={{ fontWeight: 600 }}>
                    <Moeda valor={ultimo.plReal} opcoes={SEM_CENTAVOS} />
                  </p>
                </div>
                <div className="card">
                  <p className="text-dim text-sm">P/L projetado · {rotuloMes(ultimo.chave)}</p>
                  <p style={{ fontWeight: 600 }}>
                    <Moeda valor={ultimo.plProjetado} opcoes={SEM_CENTAVOS} />
                  </p>
                </div>
                <div className="card">
                  <p className="text-dim text-sm">Delta real</p>
                  <p style={{ fontWeight: 600 }}>
                    <Delta v={ultimo.deltaReal} />
                  </p>
                </div>
                <div className="card">
                  <p className="text-dim text-sm">Remuneração possível líquida</p>
                  <p style={{ fontWeight: 600 }}>
                    <Moeda valor={ultimo.remuneracaoPossivel} opcoes={SEM_CENTAVOS} />
                  </p>
                </div>
                <div className="card">
                  <p className="text-dim text-sm">Salário desejado/mês</p>
                  <p style={{ fontWeight: 600 }}>
                    <Moeda valor={ultimo.salarioDesejado} opcoes={SEM_CENTAVOS} />
                  </p>
                </div>
                {ultimo.deltaProjetado !== undefined && (
                  <div className="card">
                    <p className="text-dim text-sm">Delta vs plano de {plano.planoCongeladoRotulo ?? 'referência'}</p>
                    <p style={{ fontWeight: 600 }}>
                      <Delta v={ultimo.deltaProjetado} />
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-dim text-sm">Nenhum mês preenchido ainda. Preencha o primeiro para ver o comparativo.</p>
            )}

            {resumo.plNaMeta && (
              <div className="card stack" style={{ gap: 8 }}>
                <div className="row-between">
                  <span>Meta de P/L aos {plano.parametros.idadeMeta} anos (dinheiro de hoje)</span>
                  <strong>
                    <Moeda valor={resultado.metaPL} opcoes={SEM_CENTAVOS} />
                  </strong>
                </div>
                <div className="progress-bar">
                  <div style={{ width: `${Math.max(0, Math.min(100, resumo.coberturaMeta * 100))}%` }} />
                </div>
                <p className="text-dim text-sm">
                  P/L proj. líquido aos {plano.parametros.idadeMeta} ({rotuloMes(resumo.plNaMeta.chave)}):{' '}
                  <Moeda valor={resumo.plNaMeta.plProjetadoLiquido} opcoes={SEM_CENTAVOS} /> (
                  <Percentual v={resumo.coberturaMeta} /> da meta)
                </p>
                <p className="text-dim text-sm">
                  Em valores nominais (com inflação): <Moeda valor={resumo.plNaMeta.plReal} opcoes={SEM_CENTAVOS} />
                </p>
                {resumo.plFinal && resumo.plFinal.chave !== resumo.plNaMeta.chave && (
                  <p className="text-dim text-sm">
                    P/L proj. líquido aos {plano.parametros.idadeFinal} ({rotuloMes(resumo.plFinal.chave)}):{' '}
                    <Moeda valor={resumo.plFinal.plProjetadoLiquido} opcoes={SEM_CENTAVOS} />
                  </p>
                )}
              </div>
            )}

            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPremissas(true)}>
                <SlidersHorizontal size={16} strokeWidth={1.5} /> Premissas
              </button>
              <button type="button" className="btn btn-ghost" onClick={congelarPlano}>
                <Snowflake size={16} strokeWidth={1.5} /> Congelar plano
              </button>
              <button type="button" className="btn btn-ghost" onClick={exportar}>
                <Download size={16} strokeWidth={1.5} /> Exportar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => inputArquivo.current?.click()}>
                <Upload size={16} strokeWidth={1.5} /> Importar
              </button>
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {proximo && (
                  <button type="button" className="chip" onClick={() => rolarAteProxima(listaRef.current)}>
                    Ir para {rotuloMes(proximo.chave)}
                  </button>
                )}
                <button type="button" className={`chip ${detalhado ? 'active' : ''}`} onClick={() => setDetalhado((d) => !d)}>
                  Todas as colunas
                </button>
              </div>

              <div className="pl-table-wrap" ref={listaRef}>
                <table className="dre-table pl-table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      {detalhado && <th>Investimentos</th>}
                      <th>Consórcios</th>
                      <th>Retiradas</th>
                      <th>X Capital</th>
                      <th>Total entradas</th>
                      <th>P/L Projetado</th>
                      <th>Custódia Fillipe</th>
                      <th>Custódia Outros</th>
                      <th>P/L Real</th>
                      <th>Delta Real</th>
                      {detalhado && (
                        <>
                          <th>Remun. possível</th>
                          <th>Remun. Fillipe</th>
                          <th>Salário desejado</th>
                          <th>PWA</th>
                          <th>Delta projetado</th>
                          <th>P/L proj. líquido</th>
                          <th>Salário s/ inflação</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.linhas.map((l) => (
                      <tr
                        key={l.chave}
                        className={`${l.preenchido ? 'pl-preenchida' : 'pl-pendente'} ${proximo?.chave === l.chave ? 'pl-proxima' : ''}`}
                        onClick={() => setEditando(l.chave)}
                      >
                        <td>
                          <span className="row" style={{ gap: 6 }}>
                            {l.preenchido ? (
                              <Check size={14} strokeWidth={2} color="var(--success)" aria-label="Preenchido" />
                            ) : (
                              <span style={{ width: 14 }} />
                            )}
                            {rotuloMes(l.chave)}
                            {l.idade !== undefined && (
                              <span className="text-dim" style={{ fontSize: 11 }}>
                                {l.idade}a
                              </span>
                            )}
                          </span>
                        </td>
                        {celulasDaLinha(l)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-dim text-sm">
                Linha branca = mês preenchido · cinza = projeção · itálico = valor calculado automaticamente. Toque numa linha para
                editar.
              </p>
            </div>
          </>
        )}
      </div>

      {plano && linhaEditada && padraoDoMes && (
        <PerspectivaMesModal
          key={linhaEditada.chave}
          linha={linhaEditada}
          padrao={padraoDoMes}
          sugerirPreenchido={proximo?.chave === linhaEditada.chave}
          onClose={() => setEditando(null)}
          onSave={(dados) => salvarDadosDoMes(linhaEditada.chave, dados)}
        />
      )}

      {plano && premissas && (
        <PerspectivaPremissasModal parametros={plano.parametros} onClose={() => setPremissas(false)} onSave={salvarPremissas} />
      )}
    </>
  )
}
