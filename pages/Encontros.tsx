import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import type { EncontroWithStats, EncontroStatus } from '../types';

const STATUS_LABELS: Record<EncontroStatus, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

const STATUS_COLORS: Record<EncontroStatus, string> = {
  planejado: 'bg-blue-100 text-blue-800',
  em_andamento: 'bg-green-100 text-green-800',
  concluido: 'bg-gray-100 text-gray-800',
  cancelado: 'bg-red-100 text-red-800'
};

export function Encontros() {
  const [encontros, setEncontros] = useState<EncontroWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEncontros();
  }, []);

  const fetchEncontros = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_ENDPOINTS.encontros}?stats=true`);

      if (!response.ok) {
        throw new Error('Erro ao buscar encontros');
      }

      const result = await response.json();
      setEncontros(result.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar encontros:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o encontro "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.encontros}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir encontro');
      }

      alert('Encontro excluído com sucesso!');
      fetchEncontros();
    } catch (err) {
      alert(`Erro ao excluir encontro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      console.error('Erro ao excluir encontro:', err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const copyLink = (codigo: string) => {
    const link = `${window.location.origin}/avaliacao/${codigo}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pastoral-blue-600"></div>
            <p className="mt-4 text-gray-600">Carregando encontros...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-pastoral-blue-800">
              Gerenciar Encontros
            </h1>
            <p className="text-gray-600 mt-2">
              Crie e gerencie encontros de noivos
            </p>
          </div>
          <Link
            to="/admin/encontros/novo"
            className="bg-gradient-to-r from-pastoral-blue-600 to-pastoral-blue-700 text-white px-6 py-3 rounded-lg hover:from-pastoral-blue-700 hover:to-pastoral-blue-800 transition-all shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Novo Encontro
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {encontros.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhum encontro cadastrado
            </h3>
            <p className="text-gray-500 mb-6">
              Comece criando seu primeiro encontro de noivos
            </p>
            <Link
              to="/admin/encontros/novo"
              className="inline-flex items-center gap-2 bg-pastoral-blue-600 text-white px-6 py-3 rounded-lg hover:bg-pastoral-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Criar Primeiro Encontro
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {encontros.map((encontro) => (
              <div
                key={encontro.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-pastoral-blue-800">
                        {encontro.nome}
                      </h2>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[encontro.status]}`}>
                        {STATUS_LABELS[encontro.status]}
                      </span>
                    </div>

                    {encontro.descricao && (
                      <p className="text-gray-600 mb-4">{encontro.descricao}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Data de Início</p>
                        <p className="font-semibold text-gray-800">{formatDate(encontro.data_inicio)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Data de Término</p>
                        <p className="font-semibold text-gray-800">{formatDate(encontro.data_fim)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Local</p>
                        <p className="font-semibold text-gray-800">{encontro.local || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tema</p>
                        <p className="font-semibold text-gray-800">{encontro.tema || '-'}</p>
                      </div>
                    </div>

                    <div className="flex gap-4 mb-4">
                      <div className="bg-blue-50 px-4 py-2 rounded-lg">
                        <p className="text-sm text-blue-600">Avaliações</p>
                        <p className="text-2xl font-bold text-blue-800">{encontro.total_avaliacoes}</p>
                      </div>
                      <div className="bg-green-50 px-4 py-2 rounded-lg">
                        <p className="text-sm text-green-600">Média Geral</p>
                        <p className="text-2xl font-bold text-green-800">
                          {encontro.media_geral ? encontro.media_geral.toFixed(1) : '-'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Link Público do Encontro:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                          {window.location.origin}/avaliacao/{encontro.codigo_acesso}
                        </code>
                        <button
                          onClick={() => copyLink(encontro.codigo_acesso)}
                          className="bg-pastoral-blue-600 text-white px-4 py-2 rounded hover:bg-pastoral-blue-700 transition-colors"
                          title="Copiar link"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t">
                  <Link
                    to={`/admin/encontros/${encontro.id}/estatisticas`}
                    className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors text-center font-medium"
                  >
                    Ver Estatísticas
                  </Link>
                  <Link
                    to={`/admin/encontros/${encontro.id}/editar`}
                    className="flex-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors text-center font-medium"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => encontro.id && handleDelete(encontro.id, encontro.nome)}
                    className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors font-medium"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
