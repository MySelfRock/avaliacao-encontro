import { doubleCsrf } from 'csrf-csrf';
import { env } from '../config/env';
import type { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection usando csrf-csrf
 * Protege contra ataques Cross-Site Request Forgery
 */

const {
  invalidCsrfTokenError,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  getSessionIdentifier: (req) => (req as any).user?.userId?.toString() || 'anonymous',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  },
  size: 64,
});

/**
 * Middleware para gerar e validar CSRF token
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Middleware para gerar token CSRF
 * Use em rota GET para obter o token
 */
export function generateCsrfToken(_req: Request, _res: Response, next: NextFunction) {
  // CSRF tokens são gerenciados automaticamente pela biblioteca
  next();
}

/**
 * Middleware de erro CSRF customizado
 */
export function csrfErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err === invalidCsrfTokenError) {
    return res.status(403).json({
      success: false,
      message: 'Token CSRF inválido ou ausente'
    });
  }
  next(err);
}

/**
 * Middleware para rotas que não precisam de CSRF
 * (ex: rotas públicas de leitura, webhooks)
 */
export function skipCsrf(_req: Request, _res: Response, next: NextFunction) {
  next();
}
