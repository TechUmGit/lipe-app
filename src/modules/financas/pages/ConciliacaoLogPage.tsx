import { useEffect, useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { Topbar } from '../../../shared/components/Topbar'
import { getConexoes, getSyncLogs } from '../lib/pluggyApi'
import type { ConexaoBancaria, SyncLog } from '../lib/types'

export function ConciliacaoLogPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [conexoes, setConexoes] = useState<Record<string, ConexaoBancaria>>({})

  useEffect(() => {
    if (!user) return
    Promise.all([getSyncLogs(user.uid), getConexoes(user.uid)]).then(([l, c]) => {
      setLogs(l)
      setConexoes(Object.fromEntries(c.map((x) => [x.itemId, x])))
      setLoading(false)
    })
  }, [user])

  const totais = logs.reduce(
    (acc, l) => ({
      transacoes: acc.transacoes + l.transacoesProcessadas,
      casadas: acc.casadas + l.casadas,
      criadas: acc.criadas + l.criadas,
      ambiguas: acc.ambiguas + (l.ambiguas ?? 0),
    }),
    { transacoes: 0, casadas: 0, criadas: 0, ambiguas: 0 },
  )

  return (
    <>
      <Topbar title="Conciliação" backTo="/financas/conexoes" />
      <div className="page">
        {loading ? (
          <p className="text-dim">Carregando...</p>
        ) : (
          <div className="stack">
            <p className="text-dim text-sm">
              Histórico de sincronizações com os bancos: o que foi casado automaticamente com
              lançamentos já categorizados por você, e o que entrou como "Verificar" pra revisão.
            </p>

            <div className="card stat-row">
              <div>
                <p className="text-dim text-sm">Conciliadas</p>
                <p style={{ color: 'var(--success)', fontWeight: 600 }}>{totais.casadas}</p>
              </div>
              <div>
                <p className="text-dim text-sm">Verificar</p>
                <p style={{ fontWeight: 600 }}>{totais.criadas}</p>
              </div>
              <div>
                <p className="text-dim text-sm">Total processado</p>
                <p style={{ fontWeight: 600 }}>{totais.transacoes}</p>
              </div>
            </div>

            {totais.ambiguas > 0 && (
              <p className="text-dim text-sm">
                {totais.ambiguas} transação(ões) tiveram mais de um lançamento manual parecido e
                foram pra "Verificar" por segurança, em vez de arriscar um match errado.
              </p>
            )}

            {logs.length === 0 && (
              <p className="text-dim text-center" style={{ marginTop: 12 }}>
                Nenhuma sincronização ainda.
              </p>
            )}

            <div className="stack" style={{ gap: 8 }}>
              {logs.map((log) => (
                <div key={log.id} className="card stack" style={{ gap: 6 }}>
                  <div className="row-between text-sm">
                    <span style={{ fontWeight: 600 }}>
                      {conexoes[log.itemId]?.conectorNome ?? log.itemId}
                    </span>
                    <span className="text-dim">{new Date(log.fimEm).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="row-between text-sm">
                    <span className="text-dim">
                      {log.transacoesProcessadas} transação(ões) em {log.contasProcessadas} conta(s)
                    </span>
                  </div>
                  <div className="row" style={{ gap: 14 }}>
                    <span className="text-sm" style={{ color: 'var(--success)' }}>
                      {log.casadas} conciliada(s)
                    </span>
                    <span className="text-sm">{log.criadas} pra verificar</span>
                    {!!log.ambiguas && <span className="text-sm text-dim">{log.ambiguas} ambígua(s)</span>}
                  </div>
                  {log.erro && <p className="error-text text-sm">{log.erro}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
