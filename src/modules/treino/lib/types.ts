export type GrupoTreino = 'peito_ombro_triceps' | 'costas_biceps' | 'perna'

export const GRUPOS: { id: GrupoTreino; label: string; emoji: string }[] = [
  { id: 'peito_ombro_triceps', label: 'Peito, Ombro e Tríceps', emoji: '💪' },
  { id: 'costas_biceps', label: 'Costas e Bíceps', emoji: '🔙' },
  { id: 'perna', label: 'Perna', emoji: '🦵' },
]

export type Objetivo = 'hipertrofia' | 'emagrecimento' | 'condicionamento' | 'forca' | 'saude_geral'

export const OBJETIVOS: { id: Objetivo; label: string }[] = [
  { id: 'hipertrofia', label: 'Hipertrofia' },
  { id: 'emagrecimento', label: 'Emagrecimento' },
  { id: 'condicionamento', label: 'Condicionamento' },
  { id: 'forca', label: 'Força' },
  { id: 'saude_geral', label: 'Saúde geral' },
]

export type NivelAtividade = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'atleta'

export const NIVEIS_ATIVIDADE: { id: NivelAtividade; label: string }[] = [
  { id: 'sedentario', label: 'Sedentário' },
  { id: 'leve', label: 'Levemente ativo' },
  { id: 'moderado', label: 'Moderadamente ativo' },
  { id: 'intenso', label: 'Muito ativo' },
  { id: 'atleta', label: 'Atleta' },
]

export interface Perfil {
  pesoKg?: number
  alturaCm?: number
  objetivo?: Objetivo
  nivelAtividade?: NivelAtividade
  updatedAt?: number
}

export const EQUIPAMENTOS_SUGERIDOS = [
  'Halteres',
  'Barra reta',
  'Barra W',
  'Anilhas',
  'Banco reto',
  'Banco inclinável',
  'Smith',
  'Leg press',
  'Cadeira extensora',
  'Mesa flexora',
  'Cadeira flexora',
  'Puxador alto (pulley)',
  'Remada baixa (pulley)',
  'Crossover (cabo)',
  'Elásticos',
  'Kettlebell',
  'Barra fixa (pull-up)',
  'Esteira',
  'Bicicleta ergométrica',
  'Colchonete',
]

export interface Exercicio {
  nome: string
  series: number
  repeticoes: string
  carga?: string
  observacao?: string
  imagemUrl?: string
  videoUrl?: string
}

export interface Serie {
  id: string
  criadaEm: number
  ativa: boolean
  metaExecucoes: number
  metaDias: number
  grupos: Record<GrupoTreino, Exercicio[]>
  abdominalLombar: Exercicio[]
}

export type NovaSerie = Omit<Serie, 'id' | 'criadaEm' | 'ativa'>

export interface Execucao {
  id: string
  serieId: string
  grupo: GrupoTreino
  dataHora: number
}
