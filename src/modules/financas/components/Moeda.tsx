import { useFinancasPrivacidade } from '../lib/privacidade'

export function formatarMoeda(v: number, opcoes?: Intl.NumberFormatOptions): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', ...opcoes })
}

export function Moeda({ valor, opcoes }: { valor: number; opcoes?: Intl.NumberFormatOptions }) {
  const { oculto } = useFinancasPrivacidade()
  return <>{oculto ? 'R$ ••••' : formatarMoeda(valor, opcoes)}</>
}
