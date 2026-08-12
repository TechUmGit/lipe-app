import { useEffect, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { ExercicioItem } from '../components/ExercicioItem'
import {
  atualizarAbdominalLombar,
  atualizarExerciciosGrupo,
  criarSerie,
  getEquipamentos,
  getPerfil,
  getSerieAtiva,
} from '../lib/treinoApi'
import { GRUPOS, type GrupoTreino, type NovaSerie, type Perfil, type Serie } from '../lib/types'

const EXEMPLO_JSON = `{
  "grupos": {
    "peito_ombro_triceps": [
      {
        "nome": "Supino reto com halteres",
        "series": 4,
        "repeticoes": "10-12",
        "imagemUrl": "https://strengthlevel.com/exercises/images/exercises/dumbbell-bench-press-800.jpg",
        "videoUrl": "https://www.youtube.com/watch?v=VmB1G1K7v94"
      },
      { "nome": "Desenvolvimento com halteres", "series": 3, "repeticoes": "10-12" },
      { "nome": "Tríceps corda", "series": 3, "repeticoes": "12-15" }
    ],
    "costas_biceps": [
      { "nome": "Puxador alto", "series": 4, "repeticoes": "10-12" },
      { "nome": "Remada baixa", "series": 3, "repeticoes": "10-12" },
      { "nome": "Rosca direta", "series": 3, "repeticoes": "12-15" }
    ],
    "perna": [
      { "nome": "Leg press", "series": 4, "repeticoes": "10-12" },
      { "nome": "Cadeira extensora", "series": 3, "repeticoes": "12-15" },
      { "nome": "Mesa flexora", "series": 3, "repeticoes": "12-15" }
    ]
  },
  "abdominalLombar": [
    { "nome": "Abdominal supra", "series": 3, "repeticoes": "15-20" },
    { "nome": "Extensão lombar (banco romano)", "series": 3, "repeticoes": "12-15" }
  ]
}`

function montarPrompt(equipamentos: string[], perfil: Perfil) {
  return `Monte uma série de treino de musculação em 3 partes (peito/ombro/tríceps, costas/bíceps, perna), com abdominal e lombar ao final de cada treino.

Equipamentos disponíveis: ${equipamentos.length ? equipamentos.join(', ') : '(nenhum informado)'}
Meu perfil: ${JSON.stringify(perfil)}

Para cada exercício, se você tiver certeza de um link real e funcional, inclua também:
- "imagemUrl": um link direto de imagem (ex: de strengthlevel.com ou musclewiki.com) mostrando a execução do exercício
- "videoUrl": um link de vídeo do YouTube explicando a execução

Se não tiver certeza de um link real, pode omitir esses dois campos — o app gera automaticamente uma busca no YouTube para os exercícios sem link.

Responda APENAS com um JSON no seguinte formato, sem texto adicional:
${EXEMPLO_JSON}`
}

export function SeriePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [serieAtiva, setSerieAtiva] = useState<Serie | null>(null)
  const [equipamentos, setEquipamentos] = useState<string[]>([])
  const [perfil, setPerfil] = useState<Perfil>({})

  const [mostrarImportar, setMostrarImportar] = useState(false)
  const [jsonTexto, setJsonTexto] = useState('')
  const [metaExecucoes, setMetaExecucoes] = useState(24)
  const [metaDias, setMetaDias] = useState(60)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [promptCopiado, setPromptCopiado] = useState(false)

  useEffect(() => {
    if (!user) return
    Promise.all([getSerieAtiva(user.uid), getEquipamentos(user.uid), getPerfil(user.uid)]).then(
      ([serie, itens, p]) => {
        setSerieAtiva(serie)
        setEquipamentos(itens)
        setPerfil(p ?? {})
        setLoading(false)
      },
    )
  }, [user])

  async function copiarPrompt() {
    const texto = montarPrompt(equipamentos, perfil)
    await navigator.clipboard.writeText(texto)
    setPromptCopiado(true)
    setTimeout(() => setPromptCopiado(false), 2000)
  }

  async function importar() {
    if (!user) return
    setErro(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonTexto)
    } catch {
      setErro('JSON inválido. Confira se copiou o conteúdo completo.')
      return
    }

    const obj = parsed as Partial<NovaSerie>
    if (!obj.grupos || !obj.grupos.peito_ombro_triceps || !obj.grupos.costas_biceps || !obj.grupos.perna) {
      setErro('JSON precisa ter "grupos" com peito_ombro_triceps, costas_biceps e perna.')
      return
    }

    setSalvando(true)
    try {
      await criarSerie(user.uid, {
        grupos: obj.grupos as NovaSerie['grupos'],
        abdominalLombar: obj.abdominalLombar ?? [],
        metaExecucoes,
        metaDias,
      })
      const nova = await getSerieAtiva(user.uid)
      setSerieAtiva(nova)
      setMostrarImportar(false)
      setJsonTexto('')
    } catch {
      setErro('Não foi possível salvar a série. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarCargaGrupo(grupo: GrupoTreino, index: number, carga: string) {
    if (!user || !serieAtiva) return
    const exercicios = serieAtiva.grupos[grupo].map((ex, i) => (i === index ? { ...ex, carga } : ex))
    setSerieAtiva({ ...serieAtiva, grupos: { ...serieAtiva.grupos, [grupo]: exercicios } })
    await atualizarExerciciosGrupo(user.uid, serieAtiva.id, grupo, exercicios)
  }

  async function atualizarCargaAbdominalLombar(index: number, carga: string) {
    if (!user || !serieAtiva) return
    const exercicios = serieAtiva.abdominalLombar.map((ex, i) => (i === index ? { ...ex, carga } : ex))
    setSerieAtiva({ ...serieAtiva, abdominalLombar: exercicios })
    await atualizarAbdominalLombar(user.uid, serieAtiva.id, exercicios)
  }

  if (loading) return <p className="text-dim">Carregando...</p>

  return (
    <div className="stack">
      {serieAtiva ? (
        <div className="stack">
          <div className="row-between">
            <h2>Série ativa</h2>
            <span className="text-dim text-sm">
              desde {new Date(serieAtiva.criadaEm).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {GRUPOS.map((g) => (
            <div key={g.id} className="stack">
              <h3>
                {g.emoji} {g.label}
              </h3>
              <div className="stack" style={{ gap: 8 }}>
                {serieAtiva.grupos[g.id]?.map((ex, i) => (
                  <ExercicioItem
                    key={i}
                    exercicio={ex}
                    onCargaChange={(carga) => atualizarCargaGrupo(g.id, i, carga)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="stack">
            <h3>🔥 Abdominal e Lombar</h3>
            <div className="stack" style={{ gap: 8 }}>
              {serieAtiva.abdominalLombar.map((ex, i) => (
                <ExercicioItem
                  key={i}
                  exercicio={ex}
                  onCargaChange={(carga) => atualizarCargaAbdominalLombar(i, carga)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-dim">Você ainda não tem uma série ativa.</p>
        </div>
      )}

      {!mostrarImportar && (
        <button className="btn btn-primary btn-block" onClick={() => setMostrarImportar(true)}>
          {serieAtiva ? 'Importar nova série' : 'Criar minha série'}
        </button>
      )}

      {mostrarImportar && (
        <div className="stack card">
          <h3>Importar série (JSON)</h3>
          <p className="text-dim text-sm">
            Peça ao Claude para montar sua série com base nos seus equipamentos e perfil, cole a
            resposta em JSON abaixo e salve.
          </p>
          <button type="button" className="btn" onClick={copiarPrompt}>
            {promptCopiado ? 'Prompt copiado ✓' : '📋 Copiar prompt para o Claude'}
          </button>

          <details>
            <summary className="text-dim text-sm">Ver formato de exemplo</summary>
            <pre
              className="text-sm"
              style={{
                whiteSpace: 'pre-wrap',
                background: 'var(--surface-2)',
                padding: 10,
                borderRadius: 8,
                overflowX: 'auto',
              }}
            >
              {EXEMPLO_JSON}
            </pre>
          </details>

          <label>
            Cole aqui o JSON da série
            <textarea
              rows={10}
              value={jsonTexto}
              onChange={(e) => setJsonTexto(e.target.value)}
              placeholder="Cole o JSON aqui..."
            />
          </label>

          <div className="row">
            <label style={{ flex: 1 }}>
              Meta de treinos
              <input
                type="number"
                value={metaExecucoes}
                onChange={(e) => setMetaExecucoes(Number(e.target.value))}
              />
            </label>
            <label style={{ flex: 1 }}>
              Meta de dias
              <input
                type="number"
                value={metaDias}
                onChange={(e) => setMetaDias(Number(e.target.value))}
              />
            </label>
          </div>

          {erro && <p className="error-text">{erro}</p>}

          <div className="row">
            <button className="btn" onClick={() => setMostrarImportar(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={importar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar série'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
