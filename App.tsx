import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { AvaliacaoForm } from './pages/AvaliacaoForm';
import { Estatisticas } from './pages/Estatisticas';
import { Interessados } from './pages/Interessados';
import { Encontros } from './pages/Encontros';
import { EncontroForm } from './pages/EncontroForm';
import { EncontroEstatisticas } from './pages/EncontroEstatisticas';

function AppContent() {
  const location = useLocation();

  // Não mostrar navegação nas rotas públicas de avaliação
  const isPublicRoute = location.pathname === '/' || location.pathname.startsWith('/avaliacao/');
  const showNavigation = !isPublicRoute;

  return (
    <div className="min-h-screen">
      {showNavigation && <Navigation />}
      <Routes>
        {/* Rotas públicas */}
        <Route path="/" element={<AvaliacaoForm />} />
        <Route path="/avaliacao/:codigo" element={<AvaliacaoForm />} />

        {/* Rotas administrativas */}
        <Route path="/admin/encontros" element={<Encontros />} />
        <Route path="/admin/encontros/novo" element={<EncontroForm />} />
        <Route path="/admin/encontros/:id/editar" element={<EncontroForm />} />
        <Route path="/admin/encontros/:id/estatisticas" element={<EncontroEstatisticas />} />
        <Route path="/estatisticas" element={<Estatisticas />} />
        <Route path="/interessados" element={<Interessados />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
