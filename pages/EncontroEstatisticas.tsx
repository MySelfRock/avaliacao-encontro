import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import type { Encontro } from '../types';

export function EncontroEstatisticas() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [encontro, setEncontro] = useState<Encontro | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const [encontroRes, statsRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.encontros}/${id}`),
        fetch(`${API_ENDPOINTS.encontros}/${id}/estatisticas`)
      ]);

      if (!encontroRes.ok || !statsRes.ok) {
        throw new Error('Erro ao buscar dados');
      }

      const encontroData = await encontroRes.json();
      const statsData = await statsRes.json();

      setEncontro(encontroData.data);
      setStats(statsData.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatRating = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pastoral-blue-600"></div>
            <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !encontro || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Erro ao carregar dados'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/admin/encontros')}
          className="text-pastoral-blue-600 hover:text-pastoral-blue-800 flex items-center gap-2 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Encontros
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-pastoral-blue-800 mb-2">
            Estatísticas - {encontro.nome}
          </h1>
          <p className="text-gray-600">
            Total de avaliações: {stats.totalAvaliacoes}
          </p>
        </div>

        {stats.totalAvaliacoes === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Nenhuma avaliação registrada
            </h3>
            <p className="text-gray-500">
              As estatísticas aparecerão aqui quando houver avaliações para este encontro.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pré-Encontro */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">Pré-Encontro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Clareza da Comunicação</p>
                  <p className="text-3xl font-bold text-blue-800">
                    {formatRating(stats.mediaPreEncontro?.avg_communication)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">Facilidade de Inscrição</p>
                  <p className="text-3xl font-bold text-blue-800">
                    {formatRating(stats.mediaPreEncontro?.avg_registration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Palestras */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">Palestras</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Relevância</p>
                  <p className="text-3xl font-bold text-green-800">
                    {formatRating(stats.mediaPalestras?.avg_relevance)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Clareza</p>
                  <p className="text-3xl font-bold text-green-800">
                    {formatRating(stats.mediaPalestras?.avg_clarity)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 mb-1">Duração</p>
                  <p className="text-3xl font-bold text-green-800">
                    {formatRating(stats.mediaPalestras?.avg_duration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Ambientes */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">Ambientes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">Conforto</p>
                  <p className="text-3xl font-bold text-purple-800">
                    {formatRating(stats.mediaAmbientes?.avg_comfort)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">Limpeza</p>
                  <p className="text-3xl font-bold text-purple-800">
                    {formatRating(stats.mediaAmbientes?.avg_cleanliness)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 mb-1">Decoração</p>
                  <p className="text-3xl font-bold text-purple-800">
                    {formatRating(stats.mediaAmbientes?.avg_decoration)}
                  </p>
                </div>
              </div>
            </div>

            {/* Refeições */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">Refeições</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 mb-1">Qualidade</p>
                  <p className="text-3xl font-bold text-orange-800">
                    {formatRating(stats.mediaRefeicoes?.avg_quality)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-orange-600 mb-1">Organização</p>
                  <p className="text-3xl font-bold text-orange-800">
                    {formatRating(stats.mediaRefeicoes?.avg_organization)}
                  </p>
                </div>
              </div>
            </div>

            {/* Músicas */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">Músicas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <p className="text-sm text-pink-600 mb-1">Adequação</p>
                  <p className="text-3xl font-bold text-pink-800">
                    {formatRating(stats.mediaMusicas?.avg_suitability)}
                  </p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg">
                  <p className="text-sm text-pink-600 mb-1">Qualidade</p>
                  <p className="text-3xl font-bold text-pink-800">
                    {formatRating(stats.mediaMusicas?.avg_quality)}
                  </p>
                </div>
              </div>
            </div>

            {/* Equipe */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">Equipe</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-teal-50 p-4 rounded-lg">
                  <p className="text-sm text-teal-600 mb-1">Disponibilidade</p>
                  <p className="text-3xl font-bold text-teal-800">
                    {formatRating(stats.mediaEquipe?.avg_availability)}
                  </p>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg">
                  <p className="text-sm text-teal-600 mb-1">Organização</p>
                  <p className="text-3xl font-bold text-teal-800">
                    {formatRating(stats.mediaEquipe?.avg_organization)}
                  </p>
                </div>
              </div>
            </div>

            {/* Avaliação Geral */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">Avaliação Geral</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 mb-1">Expectativas</p>
                  <p className="text-3xl font-bold text-yellow-800">
                    {formatRating(stats.mediaAvaliacaoGeral?.avg_expectations)}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 mb-1">Nota Geral</p>
                  <p className="text-3xl font-bold text-yellow-800">
                    {formatRating(stats.mediaAvaliacaoGeral?.avg_overall)}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600 mb-1">Recomendação</p>
                  <p className="text-3xl font-bold text-yellow-800">
                    {formatRating(stats.mediaAvaliacaoGeral?.avg_recommendation)}
                  </p>
                </div>
              </div>
            </div>

            {/* Interesse Pastoral */}
            {stats.interestePastoral && stats.interestePastoral.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-pastoral-blue-800 mb-4">
                  Interesse na Pastoral Familiar
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.interestePastoral.map((item: any) => (
                    <div key={item.interest} className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-indigo-600 mb-1 capitalize">
                        {item.interest === 'sim'
                          ? 'Sim'
                          : item.interest === 'talvez'
                          ? 'Talvez'
                          : item.interest === 'nao'
                          ? 'Não'
                          : 'Não informado'}
                      </p>
                      <p className="text-3xl font-bold text-indigo-800">{item.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
