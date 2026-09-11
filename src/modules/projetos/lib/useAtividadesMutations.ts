import { useAuth } from '../../../core/AuthContext'
import type { DadosEdicaoAtividade } from '../components/EditarAtividadeModal'
import type { DadosEdicaoSubatividade } from '../components/EditarSubatividadeModal'
import { comConclusaoAutomatica } from './calculo'
import { useProjetosContexto } from './ProjetosContext'
import { atualizarProjeto } from './projetosApi'
import type { Projeto, Subatividade, Subtarefa } from './types'

export function useAtividadesMutations() {
  const { user } = useAuth()
  const { setProjetos } = useProjetosContexto()

  async function salvarSubtarefas(projeto: Projeto, novasSubtarefas: Subtarefa[]) {
    if (!user) return
    setProjetos((prev) => prev.map((p) => (p.id === projeto.id ? { ...p, subtarefas: novasSubtarefas } : p)))
    await atualizarProjeto(user.uid, projeto.id, { subtarefas: novasSubtarefas })
  }

  function alternarConcluida(projeto: Projeto, subtarefaId: string) {
    const novas = projeto.subtarefas.map((s) => (s.id === subtarefaId ? { ...s, concluida: !s.concluida } : s))
    salvarSubtarefas(projeto, novas)
  }

  function removerAtividade(projeto: Projeto, subtarefaId: string) {
    const novas = projeto.subtarefas.filter((s) => s.id !== subtarefaId)
    salvarSubtarefas(projeto, novas)
  }

  function alternarSubatividade(projeto: Projeto, subtarefaId: string, subId: string) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const subs = (s.subatividades ?? []).map((sub) => (sub.id === subId ? { ...sub, concluida: !sub.concluida } : sub))
      return comConclusaoAutomatica({ ...s, subatividades: subs })
    })
    salvarSubtarefas(projeto, novas)
  }

  function adicionarSubatividade(projeto: Projeto, subtarefaId: string, nome: string, vencimento?: number, obs?: string) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const nova: Subatividade = { id: crypto.randomUUID(), nome, concluida: false }
      if (vencimento) nova.vencimento = vencimento
      if (obs) nova.obs = obs
      return comConclusaoAutomatica({ ...s, subatividades: [...(s.subatividades ?? []), nova] })
    })
    salvarSubtarefas(projeto, novas)
  }

  function atualizarSubatividade(projeto: Projeto, subtarefaId: string, subId: string, dados: DadosEdicaoSubatividade) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const subs = (s.subatividades ?? []).map((sub) => {
        if (sub.id !== subId) return sub
        const atualizado: Subatividade = { ...sub, nome: dados.nome }
        if (dados.vencimento) atualizado.vencimento = dados.vencimento
        else delete atualizado.vencimento
        if (dados.obs) atualizado.obs = dados.obs
        else delete atualizado.obs
        return atualizado
      })
      return { ...s, subatividades: subs }
    })
    salvarSubtarefas(projeto, novas)
  }

  function removerSubatividade(projeto: Projeto, subtarefaId: string, subId: string) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      return comConclusaoAutomatica({ ...s, subatividades: (s.subatividades ?? []).filter((sub) => sub.id !== subId) })
    })
    salvarSubtarefas(projeto, novas)
  }

  function salvarEdicaoAtividade(projeto: Projeto, subtarefaId: string, dados: DadosEdicaoAtividade) {
    const novas = projeto.subtarefas.map((s) => {
      if (s.id !== subtarefaId) return s
      const atualizado: Subtarefa = { ...s, nome: dados.nome }
      if (dados.vencimento) atualizado.vencimento = dados.vencimento
      else delete atualizado.vencimento
      if (dados.obs) atualizado.obs = dados.obs
      else delete atualizado.obs
      if (dados.responsavel) atualizado.responsavel = dados.responsavel
      else delete atualizado.responsavel
      if (dados.novasSubatividades && dados.novasSubatividades.length > 0) {
        atualizado.subatividades = [...(atualizado.subatividades ?? []), ...dados.novasSubatividades]
      }
      return comConclusaoAutomatica(atualizado)
    })
    salvarSubtarefas(projeto, novas)
  }

  function adicionarAtividade(projeto: Projeto, nome: string, vencimento?: number, responsavel?: string) {
    const nova: Subtarefa = { id: crypto.randomUUID(), nome, concluida: false }
    if (vencimento) nova.vencimento = vencimento
    if (responsavel) nova.responsavel = responsavel
    return salvarSubtarefas(projeto, [...projeto.subtarefas, nova])
  }

  return {
    salvarSubtarefas,
    alternarConcluida,
    removerAtividade,
    alternarSubatividade,
    adicionarSubatividade,
    atualizarSubatividade,
    removerSubatividade,
    salvarEdicaoAtividade,
    adicionarAtividade,
  }
}
