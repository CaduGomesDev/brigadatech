import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { LgpdProvider } from './contexts/LgpdContext'
import { ToastContainer } from './components/ui/Toast'
import { AceiteTermosModal } from './components/lgpd/AceiteTermosModal'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { hasCargoPermission } from './lib/permissions'
import { Cargo } from './types'

// Pages
import { LoginForm } from './components/auth/LoginForm'
import { DashboardPage } from './pages/DashboardPage'
import { NovoChamadoPage } from './pages/NovoChamadoPage'
import { HistoricoPage } from './pages/HistoricoPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { GinasticaLaboralPage } from './pages/GinasticaLaboralPage'
import { TermosPage } from './pages/TermosPage'
import { PrivacidadePage } from './pages/PrivacidadePage'
import { ExtintoresPage } from './pages/ExtintoresPage'
import { NotificacoesPage } from './pages/NotificacoesPage'
import { RelatorioGerencialPage } from './pages/RelatorioGerencialPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function CargoRoute({ children, minCargo }: { children: React.ReactNode; minCargo: Cargo }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!hasCargoPermission(profile?.cargo, minCargo)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<PublicRoute><LoginForm /></PublicRoute>} />
      <Route path="/auth" element={<PublicRoute><LoginForm /></PublicRoute>} />
      <Route path="/termos" element={<TermosPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/chamados/novo" element={<ProtectedRoute><NovoChamadoPage /></ProtectedRoute>} />
      <Route path="/chamados/historico" element={<ProtectedRoute><CargoRoute minCargo="Supervisor"><HistoricoPage /></CargoRoute></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><ConfiguracoesPage /></ProtectedRoute>} />
      <Route path="/ginastica-laboral" element={<ProtectedRoute><GinasticaLaboralPage /></ProtectedRoute>} />
      <Route path="/privacidade" element={<ProtectedRoute><PrivacidadePage /></ProtectedRoute>} />
      <Route path="/extintores" element={<ProtectedRoute><ExtintoresPage /></ProtectedRoute>} />
      <Route path="/notificacoes" element={<ProtectedRoute><NotificacoesPage /></ProtectedRoute>} />
      <Route path="/relatorio-gerencial" element={<ProtectedRoute><RelatorioGerencialPage /></ProtectedRoute>} />

      {/* Coordenador only */}
      <Route path="/usuarios" element={<ProtectedRoute><CargoRoute minCargo="Coordenador"><UsuariosPage /></CargoRoute></ProtectedRoute>} />

      {/* Redirects */}
      <Route path="/chamados" element={<Navigate to="/chamados/novo" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg">
        <filter id="c3-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blend" />
          <feComposite in="blend" in2="SourceGraphic" operator="in" />
        </filter>
      </svg>
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <LgpdProvider>
              <AppRoutes />
              <ToastContainer />
              <AceiteTermosModal />
            </LgpdProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
    </>
  )
}
