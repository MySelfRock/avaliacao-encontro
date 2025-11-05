import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import type { Encontro, EncontroStatus } from '../types';

const initialFormData: Encontro = {
  nome: '',
  descricao: '',
  data_inicio: '',
  data_fim: '',
  local: '',
  tema: '',
  codigo_acesso: '',
  status: 'planejado',
  max_participantes: undefined,
  observacoes: ''
};

export function EncontroForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [formData, setFormData] = useState<Encontro>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      fetchEncontro();
    }
  }, [id]);

  const fetchEncontro = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`${API_ENDPOINTS.encontros}/${id}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar encontro');
      }

      const result = await response.json();
      setFormData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar encontro:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = isEditing
        ? `${API_ENDPOINTS.encontros}/${id}`
        : API_ENDPOINTS.encontros;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar encontro');
      }

      alert(isEditing ? 'Encontro atualizado com sucesso!' : 'Encontro criado com sucesso!');
      navigate('/admin/encontros');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao salvar encontro:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pastoral-blue-600"></div>
            <p className="mt-4 text-gray-600">Carregando encontro...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pastoral-blue-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/encontros')}
            className="text-pastoral-blue-600 hover:text-pastoral-blue-800 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para Encontros
          </button>

          <h1 className="text-4xl font-bold text-pastoral-blue-800">
            {isEditing ? 'Editar Encontro' : 'Novo Encontro'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditing
              ? 'Atualize as informações do encontro'
              : 'Preencha os dados para criar um novo encontro de noivos'}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome do Encontro *
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                placeholder="Ex: Encontro de Noivos - Março 2024"
              />
            </div>

            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                placeholder="Breve descrição do encontro..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Início *
                </label>
                <input
                  type="date"
                  id="data_inicio"
                  name="data_inicio"
                  required
                  value={formData.data_inicio}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                />
              </div>

              <div>
                <label htmlFor="data_fim" className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Término *
                </label>
                <input
                  type="date"
                  id="data_fim"
                  name="data_fim"
                  required
                  value={formData.data_fim}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="local" className="block text-sm font-medium text-gray-700 mb-2">
                  Local
                </label>
                <input
                  type="text"
                  id="local"
                  name="local"
                  value={formData.local}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                  placeholder="Ex: Salão Paroquial"
                />
              </div>

              <div>
                <label htmlFor="tema" className="block text-sm font-medium text-gray-700 mb-2">
                  Tema
                </label>
                <input
                  type="text"
                  id="tema"
                  name="tema"
                  value={formData.tema}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                  placeholder="Ex: Preparação para o Sacramento do Matrimônio"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                >
                  <option value="planejado">Planejado</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label htmlFor="max_participantes" className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Participantes
                </label>
                <input
                  type="number"
                  id="max_participantes"
                  name="max_participantes"
                  value={formData.max_participantes || ''}
                  onChange={handleChange}
                  min="1"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                  placeholder="Ex: 50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                id="observacoes"
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                rows={4}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pastoral-blue-500 focus:border-pastoral-blue-500 transition-all"
                placeholder="Observações adicionais sobre o encontro..."
              />
            </div>
          </div>

          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/encontros')}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-pastoral-blue-600 to-pastoral-blue-700 text-white px-6 py-3 rounded-lg hover:from-pastoral-blue-700 hover:to-pastoral-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium"
            >
              {isLoading ? 'Salvando...' : isEditing ? 'Atualizar Encontro' : 'Criar Encontro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
