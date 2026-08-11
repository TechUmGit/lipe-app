import { useEffect, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import {
  getEquipamentos,
  getPerfil,
  salvarEquipamentos,
  salvarPerfil,
} from '../lib/treinoApi'
import {
  EQUIPAMENTOS_SUGERIDOS,
  NIVEIS_ATIVIDADE,
  OBJETIVOS,
  type NivelAtividade,
  type Objetivo,
  type Perfil,
} from '../lib/types'

export function ConfiguracoesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const [equipamentos, setEquipamentosState] = useState<Set<string>>(new Set())
  const [novoEquipamento, setNovoEquipamento] = useState('')

  const [perfil, setPerfil] = useState<Perfil>({})

  useEffect(() => {
    if (!user) return
    Promise.all([getEquipamentos(user.uid), getPerfil(user.uid)]).then(([itens, p]) => {
      setEquipamentosState(new Set(itens))
      if (p) setPerfil(p)
      setLoading(false)
    })
  }, [user])

  function toggleEquipamento(nome: string) {
    setEquipamentosState((prev) => {
      const next = new Set(prev)
      if (next.has(nome)) next.delete(nome)
      else next.add(nome)
      return next
    })
  }

  function adicionarEquipamentoCustom() {
    const nome = novoEquipamento.trim()
    if (!nome) return
    setEquipamentosState((prev) => new Set(prev).add(nome))
    setNovoEquipamento('')
  }

  const equipamentosCustom = [...equipamentos].filter(
    (e) => !EQUIPAMENTOS_SUGERIDOS.includes(e),
  )

  async function salvar() {
    if (!user) return
    setSalvando(true)
    setSalvo(false)
    await Promise.all([
      salvarEquipamentos(user.uid, [...equipamentos]),
      salvarPerfil(user.uid, perfil),
    ])
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  if (loading) return <p className="text-dim">Carregando...</p>

  return (
    <div className="stack">
      <section className="stack">
        <h2>Equipamentos disponíveis</h2>
        <div className="chip-grid">
          {EQUIPAMENTOS_SUGERIDOS.map((nome) => (
            <button
              key={nome}
              type="button"
              className={`chip ${equipamentos.has(nome) ? 'active' : ''}`}
              onClick={() => toggleEquipamento(nome)}
            >
              {nome}
            </button>
          ))}
          {equipamentosCustom.map((nome) => (
            <button
              key={nome}
              type="button"
              className="chip active"
              onClick={() => toggleEquipamento(nome)}
            >
              {nome} ✕
            </button>
          ))}
        </div>
        <div className="row">
          <input
            placeholder="Outro equipamento..."
            value={novoEquipamento}
            onChange={(e) => setNovoEquipamento(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionarEquipamentoCustom()
              }
            }}
          />
          <button type="button" className="btn" onClick={adicionarEquipamentoCustom}>
            +
          </button>
        </div>
      </section>

      <section className="stack">
        <h2>Parâmetros pessoais</h2>
        <label>
          Peso (kg)
          <input
            type="number"
            inputMode="decimal"
            value={perfil.pesoKg ?? ''}
            onChange={(e) =>
              setPerfil((p) => ({ ...p, pesoKg: e.target.value ? Number(e.target.value) : undefined }))
            }
          />
        </label>
        <label>
          Altura (cm)
          <input
            type="number"
            inputMode="decimal"
            value={perfil.alturaCm ?? ''}
            onChange={(e) =>
              setPerfil((p) => ({
                ...p,
                alturaCm: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          />
        </label>
        <label>
          Objetivo
          <select
            value={perfil.objetivo ?? ''}
            onChange={(e) => setPerfil((p) => ({ ...p, objetivo: e.target.value as Objetivo }))}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {OBJETIVOS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nível de atividade física
          <select
            value={perfil.nivelAtividade ?? ''}
            onChange={(e) =>
              setPerfil((p) => ({ ...p, nivelAtividade: e.target.value as NivelAtividade }))
            }
          >
            <option value="" disabled>
              Selecione...
            </option>
            {NIVEIS_ATIVIDADE.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <button className="btn btn-primary btn-block" onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : salvo ? 'Salvo ✓' : 'Salvar'}
      </button>
    </div>
  )
}
