import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigation } from './components/Navigation';
import { AvaliacaoForm } from './pages/AvaliacaoForm';
import { Estatisticas } from './pages/Estatisticas';
import { Interessados } from './pages/Interessados';
import { Encontros } from './pages/Encontros';
import { EncontroForm } from './pages/EncontroForm';
import { EncontroEstatisticas } from './pages/EncontroEstatisticas';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import PastoralAdminDashboard from './pages/PastoralAdminDashboard';

// Protected Route Component
function ProtectedRoute({ children, requiredRole }: {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'pastoral_admin';
}) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h2>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Não mostrar navegação nas rotas públicas de avaliação e login
  const isPublicRoute = location.pathname === '/' ||
                        location.pathname.startsWith('/avaliacao/') ||
                        location.pathname === '/login';
  const showNavigation = !isPublicRoute && isAuthenticated;

  return (
    <div className="min-h-screen">
      {showNavigation && <Navigation />}
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<AvaliacaoForm />} />
        <Route path="/avaliacao/:codigo" element={<AvaliacaoForm />} />
        <Route path="/login" element={<Login />} />

        {/* Dashboard routes - redirect to appropriate dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Super Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="super_admin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Pastoral Admin routes */}
        <Route
          path="/pastoral/dashboard"
          element={
            <ProtectedRoute requiredRole="pastoral_admin">
              <PastoralAdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Legacy admin routes - protected for both roles */}
        <Route
          path="/admin/encontros"
          element={
            <ProtectedRoute>
              <Encontros />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/encontros/novo"
          element={
            <ProtectedRoute>
              <EncontroForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/encontros/:id/editar"
          element={
            <ProtectedRoute>
              <EncontroForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/encontros/:id/estatisticas"
          element={
            <ProtectedRoute>
              <EncontroEstatisticas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estatisticas"
          element={
            <ProtectedRoute>
              <Estatisticas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interessados"
          element={
            <ProtectedRoute>
              <Interessados />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

// Dashboard redirect based on user role
function DashboardRedirect() {
  const { user } = useAuth();

  if (user?.role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user?.role === 'pastoral_admin') {
    return <Navigate to="/pastoral/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
