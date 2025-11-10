import rateLimit from 'express-rate-limit';

/**
 * Rate limiters configurados para diferentes endpoints
 * Protege contra ataques de força bruta e DDoS
 */

// Limiter geral para rotas públicas
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter estrito para login (prevenir brute force)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas de login
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta requests bem-sucedidos
});

// Limiter para reset de senha (prevenir spam)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 solicitações de reset por hora
  message: 'Limite de solicitações de reset atingido. Tente novamente em 1 hora.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para refresh token
export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Máximo 10 renovações em 15 minutos
  message: 'Muitas tentativas de renovação de token. Aguarde alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para rotas administrativas
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // Máximo 50 operações administrativas
  message: 'Limite de operações administrativas atingido. Aguarde alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para criação de recursos (POST)
export const createResourceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 30, // Máximo 30 criações por hora
  message: 'Limite de criações atingido. Aguarde alguns minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter para submissão de avaliações (público)
export const avaliacaoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 avaliações por hora por IP
  message: 'Limite de avaliações atingido. Tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});
