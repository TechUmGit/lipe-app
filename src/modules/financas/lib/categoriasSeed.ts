import type { GrupoCategoria } from './types'

export const CATEGORIAS_SEED: { nome: string; grupo: GrupoCategoria; ordem: number }[] = [
  { nome: '01. Salário', grupo: 'receita', ordem: 1 },
  { nome: '02. Outras Receitas', grupo: 'receita', ordem: 2 },
  { nome: '03. Rendimentos', grupo: 'receita', ordem: 3 },

  { nome: '04. Aluguel', grupo: 'despesa_fixa', ordem: 4 },
  { nome: '05. Condomínio', grupo: 'despesa_fixa', ordem: 5 },
  { nome: '06. Luz', grupo: 'despesa_fixa', ordem: 6 },
  { nome: '07. Água', grupo: 'despesa_fixa', ordem: 7 },
  { nome: '08. Telefone e Internet', grupo: 'despesa_fixa', ordem: 8 },
  { nome: '09. Assinaturas recorrentes', grupo: 'despesa_fixa', ordem: 9 },
  { nome: '10. Gás', grupo: 'despesa_fixa', ordem: 10 },
  { nome: '11. Empregada', grupo: 'despesa_fixa', ordem: 11 },
  { nome: '12. Aluguel de Carro', grupo: 'despesa_fixa', ordem: 12 },
  { nome: '13. Outros Custos com transporte', grupo: 'despesa_fixa', ordem: 13 },
  { nome: '14. Plano de Saúde', grupo: 'despesa_fixa', ordem: 14 },
  { nome: '15. Saúde', grupo: 'despesa_fixa', ordem: 15 },
  { nome: '16. Educação Bento', grupo: 'despesa_fixa', ordem: 16 },
  { nome: '17. Educação Nina', grupo: 'despesa_fixa', ordem: 17 },
  { nome: '18. Educação Outros', grupo: 'despesa_fixa', ordem: 18 },
  { nome: '19. IPTU e IPVA', grupo: 'despesa_fixa', ordem: 19 },

  { nome: '20. Cartão de Crédito Fillipe', grupo: 'despesa_variavel', ordem: 20 },
  { nome: '21. Cartão de Crédito Família', grupo: 'despesa_variavel', ordem: 21 },
  { nome: '22. Mercado', grupo: 'despesa_variavel', ordem: 22 },
  { nome: '23. Academia', grupo: 'despesa_variavel', ordem: 23 },
  { nome: '24. Viagens Fillipe', grupo: 'despesa_variavel', ordem: 24 },
  { nome: '25. Viagens Família', grupo: 'despesa_variavel', ordem: 25 },
  { nome: '26. Taxas', grupo: 'despesa_variavel', ordem: 26 },
  { nome: '27. Saque', grupo: 'despesa_variavel', ordem: 27 },
  { nome: '28. Terapia', grupo: 'despesa_variavel', ordem: 28 },
  { nome: '29. Outras Despesas', grupo: 'despesa_variavel', ordem: 29 },
  { nome: '30. Despesas Extraordinárias', grupo: 'despesa_variavel', ordem: 30 },

  { nome: '31. Aplicação', grupo: 'investimento', ordem: 31 },

  { nome: 'Aplicações', grupo: 'bens', ordem: 40 },
  { nome: 'X Capital - Processo', grupo: 'bens', ordem: 41 },
  { nome: 'Consórcio', grupo: 'bens', ordem: 42 },
  { nome: 'Empréstimos a receber', grupo: 'bens', ordem: 43 },
]

export const CONTAS_SEED = ['Fillipe Nubank', 'BTG Familia']

export const CATEGORIA_TRANSFERENCIA_NOME = 'Transferência entre contas'
