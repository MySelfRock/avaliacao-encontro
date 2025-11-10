import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Configurações de cookies seguros
 */
const COOKIE_OPTIONS = {
  httpOnly: true, // Não acessível via JavaScript (proteção XSS)
  secure: env.NODE_ENV === 'production', // Apenas HTTPS em produção
  sameSite: 'strict' as const, // Proteção CSRF
  path: '/',
};

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * Define access token em cookie HTTP-Only
 */
export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

/**
 * Define refresh token em cookie HTTP-Only
 */
export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  });
}

/**
 * Remove todos os cookies de autenticação
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);
}

/**
 * Extrai access token do cookie ou header
 * Prioriza cookie (mais seguro), mas mantém compatibilidade com header
 */
export function getAccessToken(req: Request): string | null {
  // 1. Tentar pegar do cookie (mais seguro)
  if (req.cookies && req.cookies[ACCESS_TOKEN_COOKIE]) {
    return req.cookies[ACCESS_TOKEN_COOKIE];
  }

  // 2. Fallback para header Authorization (compatibilidade)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Extrai refresh token do cookie ou body
 */
export function getRefreshToken(req: Request): string | null {
  // 1. Tentar pegar do cookie (mais seguro)
  if (req.cookies && req.cookies[REFRESH_TOKEN_COOKIE]) {
    return req.cookies[REFRESH_TOKEN_COOKIE];
  }

  // 2. Fallback para body (compatibilidade)
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }

  return null;
}

/**
 * Middleware para extrair tokens de cookies
 * Adiciona req.accessToken e req.refreshToken
 */
export function extractTokensFromCookies(req: Request, res: Response, next: NextFunction) {
  (req as any).accessToken = getAccessToken(req);
  (req as any).refreshToken = getRefreshToken(req);
  next();
}
