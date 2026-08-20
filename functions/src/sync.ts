import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { db } from './admin.js'
import { listarContas, listarTransacoes, normalizarValor } from './pluggyClient.js'
import { encontrarMatch, type CandidatoComId } from './reconciliacao.js'
import { PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET } from './secrets.js'
import { REGION } from './config.js'
import type { ConexaoBancaria, Lancamento, SyncLog } from './types.js'

const MESES_LOOKBACK_PRIMEIRO_SYNC = 24
const DIAS_SOBREPOSICAO_RESYNC = 5
const MAX_OPS_POR_BATCH = 400

function formatarDataISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Sincroniza um item específico: busca transações novas, concilia ou cria como "Verificar". */
async function sincronizarItem(uid: string, itemId: string): Promise<SyncLog> {
  const clientId = PLUGGY_CLIENT_ID.value()
  const clientSecret = PLUGGY_CLIENT_SECRET.value()
  const inicioEm = Date.now()

  const conexaoRef = db.doc(`users/${uid}/financas_conexoes_bancarias/${itemId}`)
  const conexaoSnap = await conexaoRef.get()
  if (!conexaoSnap.exists) throw new HttpsError('not-found', 'Conexão não encontrada.')
  const conexao = conexaoSnap.data() as ConexaoBancaria

  const from = conexao.ultimoSyncEm
    ? formatarDataISO(conexao.ultimoSyncEm - DIAS_SOBREPOSICAO_RESYNC * 86_400_000)
    : formatarDataISO(Date.now() - MESES_LOOKBACK_PRIMEIRO_SYNC * 30 * 86_400_000)

  const contasAtuais = await listarContas(clientId, clientSecret, itemId)

  let transacoesProcessadas = 0
  let casadas = 0
  let ambiguas = 0
  let criadas = 0

  const lancamentosCol = db.collection(`users/${uid}/financas_lancamentos`)
  let batch = db.batch()
  let opsNoBatch = 0

  async function flushBatchSeNecessario() {
    if (opsNoBatch >= MAX_OPS_POR_BATCH) {
      await batch.commit()
      batch = db.batch()
      opsNoBatch = 0
    }
  }

  const contasAtualizadas = conexao.contas.map((c) => ({ ...c }))

  for (const contaPluggy of contasAtuais) {
    const contaMapeada = conexao.contas.find((c) => c.pluggyAccountId === contaPluggy.id)
    if (!contaMapeada) continue // conta ainda não mapeada pra um nome do app — pula até o usuário mapear

    // atualiza saldo local
    const idx = contasAtualizadas.findIndex((c) => c.pluggyAccountId === contaPluggy.id)
    if (idx >= 0) {
      contasAtualizadas[idx] = {
        ...contasAtualizadas[idx],
        saldo: contaPluggy.balance,
        saldoAtualizadoEm: Date.now(),
      }
    }

    const transacoes = await listarTransacoes(clientId, clientSecret, contaPluggy.id, from)

    // candidatos: lançamentos manuais da mesma conta, já categorizados, ainda não conciliados
    const candidatosSnap = await lancamentosCol.where('conta', '==', contaMapeada.contaNome).get()
    const candidatosDisponiveis: CandidatoComId[] = candidatosSnap.docs
      .filter((d) => {
        const l = d.data() as Lancamento
        return l.categoriaId != null && !l.pluggyTransactionId
      })
      .map((d) => ({ id: d.id, lancamento: d.data() as Lancamento }))

    // ids de transação já processados nessa conta (evita duplicar em re-sync)
    const idsJaProcessados = new Set(
      candidatosSnap.docs
        .map((d) => (d.data() as Lancamento).pluggyTransactionId)
        .filter((id): id is string => !!id),
    )

    for (const tx of transacoes) {
      transacoesProcessadas += 1
      if (idsJaProcessados.has(tx.id)) continue // já sincronizada antes

      const valor = normalizarValor(tx.amount, contaPluggy.type)
      const data = new Date(tx.date).getTime()
      const descricao = tx.merchant?.name || tx.description

      const resultado = encontrarMatch(
        { data, valor, descricao },
        candidatosDisponiveis.filter((c) => !c.lancamento.pluggyTransactionId),
      )

      if (resultado.candidatoId) {
        batch.update(lancamentosCol.doc(resultado.candidatoId), {
          pluggyTransactionId: tx.id,
          origem: 'manual',
          conciliado: true,
        })
        // marca localmente como usado, pra não casar duas transações da Pluggy com o mesmo lançamento
        const c = candidatosDisponiveis.find((c) => c.id === resultado.candidatoId)
        if (c) c.lancamento.pluggyTransactionId = tx.id
        casadas += 1
      } else {
        if (resultado.ambiguo) ambiguas += 1
        const d = new Date(data)
        const novo: Omit<Lancamento, 'id'> = {
          conta: contaMapeada.contaNome,
          data,
          valor,
          descricao,
          categoriaId: null,
          mes: d.getMonth() + 1,
          ano: d.getFullYear(),
          criadoEm: Date.now(),
          origem: 'pluggy',
          conciliado: false,
          pluggyTransactionId: tx.id,
        }
        batch.set(lancamentosCol.doc(), novo)
        criadas += 1
      }

      opsNoBatch += 1
      await flushBatchSeNecessario()
    }
  }

  if (opsNoBatch > 0) await batch.commit()

  const fimEm = Date.now()
  await conexaoRef.update({
    contas: contasAtualizadas,
    ultimoSyncEm: fimEm,
    atualizadoEm: fimEm,
    precisaSync: false,
  })

  const log: SyncLog = {
    itemId,
    ano: new Date().getFullYear(),
    inicioEm,
    fimEm,
    contasProcessadas: contasAtuais.length,
    transacoesProcessadas,
    casadas,
    criadas,
  }
  await db.collection(`users/${uid}/financas_sync_logs`).add({ ...log, ambiguas })

  return log
}

interface Dados {
  itemId: string
}

export const pluggySync = onCall(
  { region: REGION, secrets: [PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET], timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login primeiro.')
    const { itemId } = (request.data ?? {}) as Dados
    if (!itemId) throw new HttpsError('invalid-argument', 'itemId é obrigatório.')

    try {
      return await sincronizarItem(request.auth.uid, itemId)
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err)
      throw new HttpsError('internal', `Falha ao sincronizar: ${mensagem}`)
    }
  },
)

export { sincronizarItem }
