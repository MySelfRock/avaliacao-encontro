import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Encontro {
  id: number;
  numero: number;
  data_inicio: string;
  data_fim: string;
  status: string;
  tema: string;
  local: string;
}

interface Avaliacao {
  id: number;
  encontro_id: number;
  nome_noivo: string;
  nome_noiva: string;
  data_resposta: string;
  media_geral?: number;
}

interface Stats {
  totalEncontros: number;
  encontrosAtivos: number;
  totalAvaliacoes: number;
  mediaGeralAvaliacoes: number;
}

export default function PastoralAdminDashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'encontros' | 'avaliacoes' | 'relatorios'>('overview');

  const [stats, setStats] = useState<Stats | null>(null);
  const [encontros, setEncontros] = useState<Encontro[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showNewEncontroModal, setShowNewEncontroModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'overview' || activeTab === 'encontros') {
        await loadEncontros();
      }
      if (activeTab === 'overview' || activeTab === 'avaliacoes') {
        await loadAvaliacoes();
      }
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEncontros = async () => {
    const response = await fetch('/api/encontros', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setEncontros(data.encontros || []);

      // Calculate stats
      const totalEncontros = data.encontros?.length || 0;
      const encontrosAtivos = data.encontros?.filter((e: Encontro) => e.status === 'ativo').length || 0;

      setStats(prev => ({
        ...prev,
        totalEncontros,
        encontrosAtivos,
        totalAvaliacoes: prev?.totalAvaliacoes || 0,
        mediaGeralAvaliacoes: prev?.mediaGeralAvaliacoes || 0
      }));
    }
  };

  const loadAvaliacoes = async () => {
    const response = await fetch('/api/avaliacoes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setAvaliacoes(data.avaliacoes || []);

      // Calculate stats
      const totalAvaliacoes = data.avaliacoes?.length || 0;
      const avaliacoesComMedia = data.avaliacoes?.filter((a: Avaliacao) => a.media_geral) || [];
      const mediaGeralAvaliacoes = avaliacoesComMedia.length > 0
        ? avaliacoesComMedia.reduce((acc: number, a: Avaliacao) => acc + (a.media_geral || 0), 0) / avaliacoesComMedia.length
        : 0;

      setStats(prev => ({
        totalEncontros: prev?.totalEncontros || 0,
        encontrosAtivos: prev?.encontrosAtivos || 0,
        totalAvaliacoes,
        mediaGeralAvaliacoes: Number(mediaGeralAvaliacoes.toFixed(2))
      }));
    }
  };

  const handleExportRelatorio = async () => {
    try {
      const response = await fetch('/api/relatorios/avaliacoes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-avaliacoes-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        setError('Erro ao exportar relatório');
      }
    } catch (err) {
      setError('Erro ao exportar relatório');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel de Administração</h1>
              <p className="text-sm text-gray-500">Olá, {user?.name}</p>
            </div>
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral' },
              { id: 'encontros', label: 'Encontros' },
              { id: 'avaliacoes', label: 'Avaliações' },
              { id: 'relatorios', label: 'Relatórios' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Total de Encontros"
                    value={stats?.totalEncontros || 0}
                    subtitle={`${stats?.encontrosAtivos || 0} ativos`}
                    icon="📅"
                    color="blue"
                  />
                  <StatCard
                    title="Encontros Ativos"
                    value={stats?.encontrosAtivos || 0}
                    subtitle="Em andamento"
                    icon="✅"
                    color="green"
                  />
                  <StatCard
                    title="Total de Avaliações"
                    value={stats?.totalAvaliacoes || 0}
                    subtitle="Respostas recebidas"
                    icon="📝"
                    color="purple"
                  />
                  <StatCard
                    title="Média Geral"
                    value={stats?.mediaGeralAvaliacoes || 0}
                    subtitle="De todas as avaliações"
                    icon="⭐"
                    color="yellow"
                    isDecimal
                  />
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setShowNewEncontroModal(true)}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <span className="text-2xl mb-2 block">➕</span>
                      <span className="font-medium">Novo Encontro</span>
                    </button>
                    <button
                      onClick={handleExportRelatorio}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
                    >
                      <span className="text-2xl mb-2 block">📊</span>
                      <span className="font-medium">Exportar Relatório</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('avaliacoes')}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
                    >
                      <span className="text-2xl mb-2 block">👀</span>
                      <span className="font-medium">Ver Avaliações</span>
                    </button>
                  </div>
                </div>

                {/* Recent Encontros */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Encontros Recentes</h3>
                  {encontros.slice(0, 5).length > 0 ? (
                    <div className="space-y-3">
                      {encontros.slice(0, 5).map((encontro) => (
                        <div key={encontro.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Encontro #{encontro.numero}</p>
                            <p className="text-sm text-gray-500">{encontro.tema}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              encontro.status === 'ativo'
                                ? 'bg-green-100 text-green-800'
                                : encontro.status === 'concluido'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {encontro.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(encontro.data_inicio).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Nenhum encontro cadastrado</p>
                  )}
                </div>
              </div>
            )}

            {/* Encontros Tab */}
            {activeTab === 'encontros' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Gerenciar Encontros</h2>
                  <button
                    onClick={() => setShowNewEncontroModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    + Novo Encontro
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Número
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tema
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Local
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Início
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Fim
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {encontros.map((encontro) => (
                        <tr key={encontro.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">#{encontro.numero}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{encontro.tema}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {encontro.local}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(encontro.data_inicio).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(encontro.data_fim).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              encontro.status === 'ativo'
                                ? 'bg-green-100 text-green-800'
                                : encontro.status === 'concluido'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {encontro.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Avaliacoes Tab */}
            {activeTab === 'avaliacoes' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Avaliações Recebidas</h2>
                  <button
                    onClick={handleExportRelatorio}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                  >
                    📊 Exportar CSV
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Casal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Encontro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Resposta
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Média
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {avaliacoes.map((avaliacao) => (
                        <tr key={avaliacao.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {avaliacao.nome_noivo} & {avaliacao.nome_noiva}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            #{avaliacao.encontro_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(avaliacao.data_resposta).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {avaliacao.media_geral ? (
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">
                                  {avaliacao.media_geral.toFixed(1)}
                                </span>
                                <span className="ml-1 text-yellow-500">⭐</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Relatorios Tab */}
            {activeTab === 'relatorios' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Relatórios e Exportações</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Relatório de Avaliações</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Exporta todas as avaliações recebidas em formato CSV para análise.
                    </p>
                    <button
                      onClick={handleExportRelatorio}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      Baixar CSV
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Estatísticas Gerais</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Visualize estatísticas agregadas de todos os encontros.
                    </p>
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
                    >
                      Em breve
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showNewEncontroModal && (
        <NewEncontroModal
          token={token!}
          onClose={() => setShowNewEncontroModal(false)}
          onSuccess={() => {
            setShowNewEncontroModal(false);
            loadEncontros();
          }}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color, isDecimal = false }: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  isDecimal?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {isDecimal ? value.toFixed(1) : value}
          </p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// New Encontro Modal
function NewEncontroModal({ token, onClose, onSuccess }: {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    numero: '',
    tema: '',
    local: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejado'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/encontros', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          numero: parseInt(formData.numero)
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao criar encontro');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Novo Encontro</h3>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
            <input
              type="number"
              required
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <input
              type="text"
              required
              value={formData.tema}
              onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Comunicação no Casamento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <input
              type="text"
              required
              value={formData.local}
              onChange={(e) => setFormData({ ...formData, local: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Salão Paroquial"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                required
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                required
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="planejado">Planejado</option>
              <option value="ativo">Ativo</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Encontro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
