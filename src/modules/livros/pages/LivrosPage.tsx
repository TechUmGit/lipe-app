import { useEffect, useState } from 'react'
import { Topbar } from '../../../shared/components/Topbar'
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop'
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

export function LivrosPage() {
  const isDesktop = useIsDesktop()

  useEffect(() => {
    document.body.classList.toggle('wide', isDesktop)
    return () => document.body.classList.remove('wide')
  }, [isDesktop])

  return (
    <>
      <Topbar title="Livros" backTo="/" />
      <div className="page">
        <div className="stack">
          <p className="text-dim text-sm">Quero ler ({LIVROS_SEED.length})</p>
          <div className="livros-grid">
            {LIVROS_SEED.map((livro) => (
              <div key={livro.id} className="stack" style={{ gap: 4 }}>
                <Capa livro={livro} />
                <p className="text-sm" style={{ fontWeight: 600, lineHeight: 1.25 }}>
                  {livro.titulo}
                </p>
                {livro.autor && <p className="text-dim text-sm">{livro.autor}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
