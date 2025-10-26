import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { AvaliacaoForm } from './pages/AvaliacaoForm';
import { Estatisticas } from './pages/Estatisticas';
import { Interessados } from './pages/Interessados';

function AppContent() {
  const location = useLocation();

  // Mostrar navegação apenas nas rotas administrativas
  const showNavigation = location.pathname !== '/';

  return (
    <div className="min-h-screen">
      {showNavigation && <Navigation />}
      <Routes>
        <Route path="/" element={<AvaliacaoForm />} />
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
