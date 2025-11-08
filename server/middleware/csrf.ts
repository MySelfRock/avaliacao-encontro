import { doubleCsrf } from 'csrf-csrf';
import { env } from '../config/env';
import type { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection usando csrf-csrf
 * Protege contra ataques Cross-Site Request Forgery
 */

const {
  invalidCsrfTokenError,
  generateToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

/**
 * Middleware para gerar e validar CSRF token
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Middleware para gerar token CSRF
 * Use em rota GET para obter o token
 */
export function generateCsrfToken(req: Request, res: Response, next: NextFunction) {
  const token = generateToken(req, res);
  (req as any).csrfToken = token;
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
export function skipCsrf(req: Request, res: Response, next: NextFunction) {
  next();
}
