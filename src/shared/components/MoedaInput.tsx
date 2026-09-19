import { useState, type CSSProperties } from 'react'

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Input que formata como moeda enquanto digita — cada dígito entra pela direita, como em app de banco. */
export function MoedaInput({
  valor,
  onChange,
  style,
  selecionarAoFocar = false,
}: {
  valor: number
  onChange: (novoValor: number) => void
  style?: CSSProperties
  /** Seleciona o texto ao focar, então digitar substitui o valor em vez de acrescentar dígitos. */
  selecionarAoFocar?: boolean
}) {
  const centavos = Math.round(valor * 100)
  const texto = centavos === 0 ? '' : formatarMoeda(centavos / 100)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '')
    const novosCentavos = digitos ? parseInt(digitos, 10) : 0
    onChange(novosCentavos / 100)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="R$ 0,00"
      value={texto}
      onChange={handleChange}
      onFocus={selecionarAoFocar ? (e) => e.target.select() : undefined}
      style={style}
    />
  )
}

/** MoedaInput que aceita valor negativo (retiradas, consórcios) por meio de um botão de sinal ao lado. */
export function MoedaInputComSinal({
  valor,
  onChange,
  negativoPorPadrao = false,
  selecionarAoFocar = false,
}: {
  valor: number
  onChange: (novoValor: number) => void
  negativoPorPadrao?: boolean
  selecionarAoFocar?: boolean
}) {
  const [negativo, setNegativo] = useState(valor < 0 || (valor === 0 && negativoPorPadrao))
  const absoluto = Math.abs(valor)

  function emitir(abs: number, neg: boolean) {
    onChange(neg ? -abs : abs)
  }

  return (
    <div className="row" style={{ gap: 6 }}>
      <button
        type="button"
        className={`btn ${negativo ? 'btn-primary' : ''}`}
        style={{ padding: '6px 12px', minWidth: 42 }}
        onClick={() => {
          setNegativo(!negativo)
          emitir(absoluto, !negativo)
        }}
        aria-label={negativo ? 'Valor negativo (saída). Clique para tornar positivo' : 'Valor positivo (entrada). Clique para tornar negativo'}
        title={negativo ? 'Saída (negativo)' : 'Entrada (positivo)'}
      >
        {negativo ? '−' : '+'}
      </button>
      <MoedaInput valor={absoluto} onChange={(abs) => emitir(abs, negativo)} style={{ flex: 1 }} selecionarAoFocar={selecionarAoFocar} />
    </div>
  )
}
