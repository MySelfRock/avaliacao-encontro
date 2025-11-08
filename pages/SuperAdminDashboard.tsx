import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addCsrfHeader } from '../src/hooks/useCsrf';

interface Pastoral {
  id: number;
  nome: string;
  subdominio: string;
  cidade: string;
  estado: string;
  contato_email: string;
  is_active: boolean;
  blocked_reason?: string;
  blocked_at?: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: 'super_admin' | 'pastoral_admin';
  pastoralId?: number | null;
  is_active: boolean;
  last_login?: string;
}

interface Stats {
  totalPastorais: number;
  pastoralAtivas: number;
  totalUsuarios: number;
  usuariosAtivos: number;
}

export default function SuperAdminDashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'pastorais' | 'users' | 'audit'>('overview');

  const [stats, setStats] = useState<Stats | null>(null);
  const [pastorais, setPastorais] = useState<Pastoral[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showNewPastoralModal, setShowNewPastoralModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedPastoral, setSelectedPastoral] = useState<Pastoral | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'overview' || activeTab === 'pastorais') {
        await loadPastorais();
      }
      if (activeTab === 'overview' || activeTab === 'users') {
        await loadUsers();
      }
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPastorais = async () => {
    const response = await fetch('/api/admin/pastorais', {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      setPastorais(data.pastorais || []);

      // Calculate stats
      const totalPastorais = data.pastorais?.length || 0;
      const pastoralAtivas = data.pastorais?.filter((p: Pastoral) => p.is_active).length || 0;

      setStats(prev => ({
        ...prev,
        totalPastorais,
        pastoralAtivas,
        totalUsuarios: prev?.totalUsuarios || 0,
        usuariosAtivos: prev?.usuariosAtivos || 0
      }));
    }
  };

  const loadUsers = async () => {
    const response = await fetch('/api/admin/users', {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      setUsers(data.users || []);

      // Calculate stats
      const totalUsuarios = data.users?.length || 0;
      const usuariosAtivos = data.users?.filter((u: User) => u.is_active).length || 0;

      setStats(prev => ({
        totalPastorais: prev?.totalPastorais || 0,
        pastoralAtivas: prev?.pastoralAtivas || 0,
        totalUsuarios,
        usuariosAtivos
      }));
    }
  };

  const handleBlockPastoral = async (pastoral: Pastoral, reason: string) => {
    try {
      const response = await fetch(`/api/admin/pastorais/${pastoral.id}/block`, {
        method: 'PUT',
        headers: addCsrfHeader({
          'Content-Type': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadPastorais();
        setShowBlockModal(false);
        setSelectedPastoral(null);
      } else {
        setError('Erro ao bloquear pastoral');
      }
    } catch (err) {
      setError('Erro ao bloquear pastoral');
    }
  };

  const handleUnblockPastoral = async (pastoral: Pastoral) => {
    try {
      const response = await fetch(`/api/admin/pastorais/${pastoral.id}/unblock`, {
        method: 'PUT',
        headers: addCsrfHeader({}),
        credentials: 'include'
      });

      if (response.ok) {
        await loadPastorais();
      } else {
        setError('Erro ao desbloquear pastoral');
      }
    } catch (err) {
      setError('Erro ao desbloquear pastoral');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Super Admin</h1>
              <p className="text-sm text-gray-500">Olá, {user?.name}</p>
            </div>
            <div className="flex gap-3">
              <a
                href="/admin/security"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Segurança
              </a>
              <button
                onClick={() => logout()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Visão Geral' },
              { id: 'pastorais', label: 'Pastorais' },
              { id: 'users', label: 'Usuários' },
              { id: 'audit', label: 'Auditoria' }
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
                    title="Total de Pastorais"
                    value={stats?.totalPastorais || 0}
                    subtitle={`${stats?.pastoralAtivas || 0} ativas`}
                    icon="🏛️"
                    color="blue"
                  />
                  <StatCard
                    title="Pastorais Bloqueadas"
                    value={(stats?.totalPastorais || 0) - (stats?.pastoralAtivas || 0)}
                    subtitle="Temporariamente desabilitadas"
                    icon="🚫"
                    color="red"
                  />
                  <StatCard
                    title="Total de Usuários"
                    value={stats?.totalUsuarios || 0}
                    subtitle={`${stats?.usuariosAtivos || 0} ativos`}
                    icon="👥"
                    color="green"
                  />
                  <StatCard
                    title="Usuários Inativos"
                    value={(stats?.totalUsuarios || 0) - (stats?.usuariosAtivos || 0)}
                    subtitle="Contas desativadas"
                    icon="⏸️"
                    color="gray"
                  />
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setShowNewPastoralModal(true)}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <span className="text-2xl mb-2 block">➕</span>
                      <span className="font-medium">Nova Pastoral</span>
                    </button>
                    <button
                      onClick={() => setShowNewUserModal(true)}
                      className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <span className="text-2xl mb-2 block">👤</span>
                      <span className="font-medium">Novo Usuário</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pastorais Tab */}
            {activeTab === 'pastorais' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Gerenciar Pastorais</h2>
                  <button
                    onClick={() => setShowNewPastoralModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    + Nova Pastoral
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pastoral
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subdomínio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Localização
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pastorais.map((pastoral) => (
                        <tr key={pastoral.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{pastoral.nome}</div>
                            <div className="text-sm text-gray-500">{pastoral.contato_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="text-sm text-blue-600">{pastoral.subdominio}</code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {pastoral.cidade}, {pastoral.estado}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pastoral.is_active ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Ativa
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Bloqueada
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {pastoral.is_active ? (
                              <button
                                onClick={() => {
                                  setSelectedPastoral(pastoral);
                                  setShowBlockModal(true);
                                }}
                                className="text-red-600 hover:text-red-900 mr-4"
                              >
                                Bloquear
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnblockPastoral(pastoral)}
                                className="text-green-600 hover:text-green-900 mr-4"
                              >
                                Desbloquear
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Gerenciar Usuários</h2>
                  <button
                    onClick={() => setShowNewUserModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    + Novo Usuário
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pastoral
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Último Login
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((userItem) => (
                        <tr key={userItem.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{userItem.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {userItem.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              userItem.role === 'super_admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {userItem.role === 'super_admin' ? 'Super Admin' : 'Pastoral Admin'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {userItem.pastoralId ? `#${userItem.pastoralId}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {userItem.is_active ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Ativo
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                Inativo
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {userItem.last_login ? new Date(userItem.last_login).toLocaleDateString('pt-BR') : 'Nunca'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Audit Tab */}
            {activeTab === 'audit' && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Logs de Auditoria</h2>
                <p className="text-gray-500">Em desenvolvimento...</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showNewPastoralModal && (
        <NewPastoralModal
          token={token!}
          onClose={() => setShowNewPastoralModal(false)}
          onSuccess={() => {
            setShowNewPastoralModal(false);
            loadPastorais();
          }}
        />
      )}

      {showNewUserModal && (
        <NewUserModal
          token={token!}
          pastorais={pastorais}
          onClose={() => setShowNewUserModal(false)}
          onSuccess={() => {
            setShowNewUserModal(false);
            loadUsers();
          }}
        />
      )}

      {showBlockModal && selectedPastoral && (
        <BlockPastoralModal
          pastoral={selectedPastoral}
          onClose={() => {
            setShowBlockModal(false);
            setSelectedPastoral(null);
          }}
          onConfirm={(reason) => handleBlockPastoral(selectedPastoral, reason)}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  color: 'blue' | 'red' | 'green' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    gray: 'bg-gray-50 text-gray-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// New Pastoral Modal
function NewPastoralModal({ token, onClose, onSuccess }: {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    nome: '',
    subdominio: '',
    cidade: '',
    estado: '',
    contato_email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/pastorais', {
        method: 'POST',
        headers: addCsrfHeader({
          'Content-Type': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao criar pastoral');
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
        <h3 className="text-lg font-semibold mb-4">Nova Pastoral</h3>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subdomínio</label>
            <input
              type="text"
              required
              value={formData.subdominio}
              onChange={(e) => setFormData({ ...formData, subdominio: e.target.value.toLowerCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="exemplo"
            />
            <p className="text-xs text-gray-500 mt-1">URL: {formData.subdominio || 'exemplo'}.seudominio.com</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                required
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <input
                type="text"
                required
                maxLength={2}
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="SP"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contato</label>
            <input
              type="email"
              required
              value={formData.contato_email}
              onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
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
              {loading ? 'Criando...' : 'Criar Pastoral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// New User Modal
function NewUserModal({ token, pastorais, onClose, onSuccess }: {
  token: string;
  pastorais: Pastoral[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'pastoral_admin' as 'super_admin' | 'pastoral_admin',
    pastoralId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: addCsrfHeader({
          'Content-Type': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          pastoralId: formData.pastoralId ? parseInt(formData.pastoralId) : null
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.message || 'Erro ao criar usuário');
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
        <h3 className="text-lg font-semibold mb-4">Novo Usuário</h3>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres, incluindo maiúsculas, minúsculas e números</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pastoral_admin">Pastoral Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {formData.role === 'pastoral_admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pastoral</label>
              <select
                required
                value={formData.pastoralId}
                onChange={(e) => setFormData({ ...formData, pastoralId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione uma pastoral</option>
                {pastorais.map((pastoral) => (
                  <option key={pastoral.id} value={pastoral.id}>
                    {pastoral.nome} ({pastoral.subdominio})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Block Pastoral Modal
function BlockPastoralModal({ pastoral, onClose, onConfirm }: {
  pastoral: Pastoral;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4 text-red-600">Bloquear Pastoral</h3>

        <p className="text-gray-700 mb-4">
          Tem certeza que deseja bloquear a pastoral <strong>{pastoral.nome}</strong>?
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do bloqueio</label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
            rows={3}
            placeholder="Digite o motivo do bloqueio..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Bloquear Pastoral
          </button>
        </div>
      </div>
    </div>
  );
}
