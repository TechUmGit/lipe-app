import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './core/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { TreinoLayout } from './modules/treino/TreinoLayout'
import { TreinoHomePage } from './modules/treino/pages/TreinoHomePage'
import { SeriePage } from './modules/treino/pages/SeriePage'
import { ConfiguracoesPage } from './modules/treino/pages/ConfiguracoesPage'
import { ExecucaoPage } from './modules/treino/pages/ExecucaoPage'
import { FinancasLayout } from './modules/financas/FinancasLayout'
import { ResumoPage } from './modules/financas/pages/ResumoPage'
import { ExtratoListPage } from './modules/financas/pages/ExtratoListPage'
import { DREPage } from './modules/financas/pages/DREPage'
import { ProjetosPage } from './modules/projetos/pages/ProjetosPage'
import { LivrosPage } from './modules/livros/pages/LivrosPage'
import { ImportarExtratoPage } from './modules/financas/pages/ImportarExtratoPage'
import { CategoriasPage } from './modules/financas/pages/CategoriasPage'
import { ConexoesBancariasPage } from './modules/financas/pages/ConexoesBancariasPage'
import { ConciliacaoLogPage } from './modules/financas/pages/ConciliacaoLogPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/treino"
        element={
          <ProtectedRoute>
            <TreinoLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TreinoHomePage />} />
        <Route path="serie" element={<SeriePage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
      </Route>

      <Route
        path="/treino/execucao/:grupo"
        element={
          <ProtectedRoute>
            <ExecucaoPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/financas"
        element={
          <ProtectedRoute>
            <FinancasLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ResumoPage />} />
        <Route path="extrato" element={<ExtratoListPage />} />
        <Route path="dre" element={<DREPage />} />
      </Route>

      <Route
        path="/projetos"
        element={
          <ProtectedRoute>
            <ProjetosPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/livros"
        element={
          <ProtectedRoute>
            <LivrosPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/financas/importar"
        element={
          <ProtectedRoute>
            <ImportarExtratoPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/financas/categorias"
        element={
          <ProtectedRoute>
            <CategoriasPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/financas/conexoes"
        element={
          <ProtectedRoute>
            <ConexoesBancariasPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/financas/conciliacao"
        element={
          <ProtectedRoute>
            <ConciliacaoLogPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
