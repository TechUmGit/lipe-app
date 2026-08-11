import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './core/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { TreinoLayout } from './modules/treino/TreinoLayout'
import { TreinoHomePage } from './modules/treino/pages/TreinoHomePage'
import { SeriePage } from './modules/treino/pages/SeriePage'
import { ConfiguracoesPage } from './modules/treino/pages/ConfiguracoesPage'
import { ExecucaoPage } from './modules/treino/pages/ExecucaoPage'

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
    </Routes>
  )
}

export default App
