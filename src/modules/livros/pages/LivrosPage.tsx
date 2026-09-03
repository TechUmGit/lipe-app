import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { Topbar } from '../../../shared/components/Topbar'
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop'
import { getLidos, salvarLidos } from '../lib/livrosApi'
import { LIVROS_SEED } from '../lib/livrosSeed'
import type { Livro } from '../lib/types'

const CORES_PLACEHOLDER = ['#6d4de6', '#2563eb', '#17a673', '#dc2626', '#a15c07', '#5732d6']

function corPlaceholder(id: string) {
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) % CORES_PLACEHOLDER.length
  return CORES_PLACEHOLDER[hash]
}

function Capa({ livro }: { livro: Livro }) {
  const [erro, setErro] = useState(!livro.capaId)

  if (erro) {
    return (
      <div
        className="livro-capa livro-capa-placeholder"
        style={{ background: corPlaceholder(livro.id) }}
      >
        <span>{livro.titulo}</span>
      </div>
    )
  }

  return (
    <img
      className="livro-capa"
      src={`https://covers.openlibrary.org/b/id/${livro.capaId}-M.jpg`}
      alt={`Capa de ${livro.titulo}`}
      onError={() => setErro(true)}
      onLoad={(e) => {
        // a Open Library responde 200 com uma imagem 1x1 quando não tem capa, em vez de erro
        if (e.currentTarget.naturalWidth <= 1) setErro(true)
      }}
    />
  )
}

function CartaoLivro({
  livro,
  lido,
  onAlternar,
}: {
  livro: Livro
  lido: boolean
  onAlternar: () => void
}) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div style={{ position: 'relative', opacity: lido ? 0.55 : 1 }}>
        <Capa livro={livro} />
        <button
          type="button"
          className="livro-lido-btn"
          data-ativo={lido}
          onClick={onAlternar}
          aria-label={lido ? 'Marcar como não lido' : 'Marcar como lido'}
          title={lido ? 'Lido' : 'Marcar como lido'}
        >
          <Check size={14} strokeWidth={3} />
        </button>
      </div>
      <p
        className="text-sm"
        style={{ fontWeight: 600, lineHeight: 1.25, textDecoration: lido ? 'line-through' : undefined }}
      >
        {livro.titulo}
      </p>
      {livro.autor && <p className="text-dim text-sm">{livro.autor}</p>}
    </div>
  )
}

export function LivrosPage() {
  const { user } = useAuth()
  const isDesktop = useIsDesktop()
  const [lidos, setLidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    document.body.classList.toggle('wide', isDesktop)
    return () => document.body.classList.remove('wide')
  }, [isDesktop])

  useEffect(() => {
    if (!user) return
    getLidos(user.uid).then((ids) => setLidos(new Set(ids)))
  }, [user])

  async function alternarLido(id: string) {
    if (!user) return
    const novo = new Set(lidos)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setLidos(novo)
    await salvarLidos(user.uid, Array.from(novo))
  }

  const queroLer = LIVROS_SEED.filter((l) => !lidos.has(l.id))
  const jaLidos = LIVROS_SEED.filter((l) => lidos.has(l.id))

  return (
    <>
      <Topbar title="Livros" backTo="/" />
      <div className="page">
        <div className="stack">
          <p className="text-dim text-sm">Quero ler ({queroLer.length})</p>
          <div className="livros-grid">
            {queroLer.map((livro) => (
              <CartaoLivro
                key={livro.id}
                livro={livro}
                lido={false}
                onAlternar={() => alternarLido(livro.id)}
              />
            ))}
          </div>

          {jaLidos.length > 0 && (
            <>
              <p className="text-dim text-sm">Lidos ({jaLidos.length})</p>
              <div className="livros-grid">
                {jaLidos.map((livro) => (
                  <CartaoLivro
                    key={livro.id}
                    livro={livro}
                    lido={true}
                    onAlternar={() => alternarLido(livro.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
