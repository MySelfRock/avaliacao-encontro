// Configuração da URL da API
// Em desenvolvimento: http://localhost:3001
// Em produção: mesma URL do frontend (API e frontend servidos juntos)

const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment
  ? 'http://localhost:3001'
  : '';

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/api/health`,
  avaliacoes: `${API_BASE_URL}/api/avaliacoes`,
  estatisticas: `${API_BASE_URL}/api/estatisticas`,
  interessados: `${API_BASE_URL}/api/pastoral/interessados`,
  contatos: `${API_BASE_URL}/api/contatos`,
};
