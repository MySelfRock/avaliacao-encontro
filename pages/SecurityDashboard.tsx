import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SecurityStats {
  total: number;
  successful: number;
  failed: number;
  unique_ips: number;
  unique_emails: number;
}

export default function SecurityDashboard() {
  const { isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<number>(24);

  // Redirecionar se não for super admin
  useEffect(() => {
    if (!isSuperAdmin()) {
      window.location.href = '/dashboard';
    }
  }, [isSuperAdmin]);

  // Carregar estatísticas
  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/security/stats?hours=${period}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        } else {
          setError('Erro ao carregar estatísticas');
        }
      } else {
        setError('Erro ao conectar com o servidor');
      }
    } catch (err) {
      setError('Erro ao carregar estatísticas');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSuperAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard de Segurança
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Monitoramento de tentativas de login e atividades suspeitas
              </p>
            </div>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
            >
              ← Voltar
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Período:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Última hora</option>
            <option value={6}>Últimas 6 horas</option>
            <option value={24}>Últimas 24 horas</option>
            <option value={72}>Últimos 3 dias</option>
            <option value={168}>Última semana</option>
          </select>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Atualizar
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
            </div>
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              {/* Total Attempts */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Tentativas
                      </dt>
                      <dd className="text-3xl font-bold text-gray-900">
                        {stats.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Successful Attempts */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Bem-sucedidas
                      </dt>
                      <dd className="text-3xl font-bold text-green-600">
                        {stats.successful}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Failed Attempts */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Falhadas
                      </dt>
                      <dd className="text-3xl font-bold text-red-600">
                        {stats.failed}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Unique IPs */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        IPs Únicos
                      </dt>
                      <dd className="text-3xl font-bold text-purple-600">
                        {stats.unique_ips}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              {/* Unique Emails */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Emails Únicos
                      </dt>
                      <dd className="text-3xl font-bold text-yellow-600">
                        {stats.unique_emails}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Análise de Segurança
              </h3>

              {stats.total > 0 ? (
                <>
                  <div className="space-y-4">
                    {/* Success Rate */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Taxa de Sucesso
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {((stats.successful / stats.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(stats.successful / stats.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Failure Rate */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Taxa de Falha
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {((stats.failed / stats.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {stats.failed > stats.successful && (
                    <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Alerta de Segurança
                          </h3>
                          <p className="mt-1 text-sm text-red-700">
                            Número de tentativas falhadas ({stats.failed}) excede tentativas bem-sucedidas ({stats.successful}).
                            Isso pode indicar tentativas de acesso não autorizado.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma tentativa de login registrada no período selecionado.
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
