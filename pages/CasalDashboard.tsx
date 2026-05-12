import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import { useToast } from '../contexts/ToastContext';
import type { EvaluationData, Rating } from '../types';

interface Encontro {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  tema: string;
  status: string;
}

interface Avaliacao {
  id: number;
  couple_name: string;
  encounter_date: string;
  overall_rating: number;
  recommendation: number;
  interest: string;
  created_at: string;
}

export function CasalDashboard() {
  const navigate = useNavigate();
  const { codigo } = useParams<{ codigo: string }>();
  const { success, error } = useToast();
  
  const [encontro, setEncontro] = useState<Encontro | null>(null);
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avaliacaoDetails, setAvaliacaoDetails] = useState<EvaluationData | null>(null);

  useEffect(() => {
    if (codigo) {
      fetchEncontro();
    }
  }, [codigo]);

  const fetchEncontro = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.encontros}/codigo/${codigo}`);
      
      if (!response.ok) {
        throw new Error('Encontro não encontrado');
      }

      const result = await response.json();
      setEncontro(result.data);
      
      if (result.data.couple_name) {
        setAvaliacao(result.data.couple_name);
      }
    } catch (err) {
      error('Erro ao carregar encontro');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvaliacao = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.avaliacoes}?search=${encodeURIComponent(codigo || '')}&limit=1`);
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        setAvaliacao(result.data[0]);
        
        const detailsResponse = await fetch(`${API_ENDPOINTS.avaliacoes}/${result.data[0].id}`);
        const details = await detailsResponse.json();
        setAvaliacaoDetails(details.data);
      }
    } catch (err) {
      console.error('Erro ao buscar avaliação:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      planejado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      em_andamento: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      concluido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    const labels: Record<string, string> = {
      planejado: 'Planejado',
      em_andamento: 'Em Andamento',
      concluido: 'Concluído',
      cancelado: 'Cancelado'
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.planejado}`}>
        {labels[status] || status}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pastoral-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!encontro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Encountero não encontrado
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            O código de acesso fornecido não é válido ou pode ter expirado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {encontro.nome}
            </h1>
            {getStatusBadge(encontro.status)}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Data</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(encontro.data_inicio).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Local</p>
              <p className="font-medium text-gray-900 dark:text-white">{encontro.local || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Tema</p>
              <p className="font-medium text-gray-900 dark:text-white">{encontro.tema || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Código</p>
              <p className="font-mono text-gray-900 dark:text-white">{codigo}</p>
            </div>
          </div>
        </div>

        {avaliacao ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Sua Avaliação
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Nota Geral</p>
                {renderStars(avaliacao.overall_rating)}
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {avaliacao.overall_rating}/5
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Recomendação</p>
                {renderStars(avaliacao.recommendation)}
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {avaliacao.recommendation}/5
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Interesse na Pastoral</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {avaliacao.interest === 'sim' ? '✓ Sim' : avaliacao.interest === 'talvez' ? '? Talvez' : '✗ Não'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Avaliado em: {new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Você ainda não avaliou este encontro
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Sua avaliação é muito importante para melhorarmos nossos encontros.
            </p>
            <button
              onClick={() => navigate(`/avaliacao/${codigo}`)}
              className="inline-flex items-center px-6 py-3 bg-pastoral-blue-600 text-white font-medium rounded-lg hover:bg-pastoral-blue-700 transition-colors"
            >
              Fazer Avaliação
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-pastoral-blue-600 hover:text-pastoral-blue-800 font-medium"
          >
            Acessar como administrador
          </button>
        </div>
      </div>
    </div>
  );
}