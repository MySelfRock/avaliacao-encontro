import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface Estatisticas {
  total_avaliacoes: number;
  total_encontros: number;
  media_avaliacao: number;
  interessados_pastoral: number;
  talvez_interessados: number;
}

interface Encontro {
  id: number;
  nome: string;
  data_inicio: string;
  status: string;
  total_avaliacoes: number;
  media_avaliacao: number;
}

export function Export() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [encontros, setEncontros] = useState<Encontro[]>([]);
  const [selectedEncontros, setSelectedEncontros] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportType, setExportType] = useState<'avaliacoes' | 'encontros' | 'interessados'>('avaliacoes');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, encontrosRes] = await Promise.all([
        fetch(API_ENDPOINTS.estatisticas),
        fetch(`${API_ENDPOINTS.encontros}?stats=true&limit=100`)
      ]);

      const [statsData, encontrosData] = await Promise.all([
        statsRes.json(),
        encontrosRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (encontrosData.success) setEncontros(encontrosData.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);

    try {
      let endpoint = '';
      let body: Record<string, any> = { format: exportFormat };

      switch (exportType) {
        case 'avaliacoes':
          endpoint = API_ENDPOINTS.avaliacoes + '/export';
          body.startDate = dateRange.start;
          body.endDate = dateRange.end;
          if (selectedEncontros.length > 0) {
            body.encontroId = selectedEncontros[0];
          }
          break;
        case 'encontros':
          endpoint = API_ENDPOINTS.encontros + '/export';
          body.status = '';
          break;
        case 'interessados':
          endpoint = '/api/pastoral/interessados/export';
          body.startDate = dateRange.start;
          body.endDate = dateRange.end;
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      success(`Exportação concluída! Arquivo: ${a.download}`);
    } catch (err) {
      error('Erro ao exportar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEncontro = (id: number) => {
    setSelectedEncontros(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="text-pastoral-blue-600 hover:text-pastoral-blue-800 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Exportar Dados
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Exporte avaliações, encontros ou interessados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estatísticas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Resumo Geral
            </h2>
            {stats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-3xl font-bold text-pastoral-blue-600">{stats.total_avaliacoes}</p>
                  <p className="text-sm text-gray-500">Avaliações</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-3xl font-bold text-pastoral-blue-600">{stats.total_encontros}</p>
                  <p className="text-sm text-gray-500">Encontros</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {renderStars(stats.media_avaliacao)}
                  <p className="text-sm text-gray-500">Média Geral</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{stats.interessados_pastoral}</p>
                  <p className="text-sm text-gray-500">Interessados</p>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            )}
          </div>

          {/* Opções de Exportação */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Opções de Exportação
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Dados
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'avaliacoes', label: 'Avaliações' },
                    { value: 'encontros', label: 'Encontros' },
                    { value: 'interessados', label: 'Interessados' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExportType(opt.value as any)}
                      className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                        exportType === opt.value
                          ? 'bg-pastoral-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Formato
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      exportFormat === 'csv'
                        ? 'bg-pastoral-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => setExportFormat('json')}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      exportFormat === 'json'
                        ? 'bg-pastoral-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>

              {exportType === 'avaliacoes' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Período
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exportando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Baixar Arquivo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Encontros */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Encontros Realizados
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Sel.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Data</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Avaliações</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {encontros.map(enc => (
                  <tr key={enc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedEncontros.includes(enc.id)}
                        onChange={() => toggleEncontro(enc.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{enc.nome}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {new Date(enc.data_inicio).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        enc.status === 'concluido' ? 'bg-green-100 text-green-800' :
                        enc.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {enc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{enc.total_avaliacoes || 0}</td>
                    <td className="px-4 py-3">{renderStars(enc.media_avaliacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}