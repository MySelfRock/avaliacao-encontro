import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Classes de erro customizadas
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(409, message);
  }
}

/**
 * Middleware global de tratamento de erros
 * Deve ser o último middleware adicionado
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log do erro
  console.error('❌ Erro capturado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.email || 'anônimo'
  });

  // Erro customizado (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Erros do JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Erros do bcrypt
  if (err.message.includes('bcrypt')) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao processar senha'
    });
  }

  // Erros de validação do express-validator
  if (err.message.includes('validation')) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos'
    });
  }

  // Erros do banco de dados (SQLite)
  if (err.message.includes('UNIQUE constraint failed')) {
    const field = err.message.split(':')[1]?.trim() || 'campo';
    return res.status(409).json({
      success: false,
      message: `${field} já está em uso`
    });
  }

  if (err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({
      success: false,
      message: 'Referência inválida a outro recurso'
    });
  }

  if (err.message.includes('NOT NULL constraint failed')) {
    const field = err.message.split(':')[1]?.trim() || 'Campo obrigatório';
    return res.status(400).json({
      success: false,
      message: `${field} é obrigatório`
    });
  }

  // Erro genérico de produção vs desenvolvimento
  return res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Middleware para capturar requisições 404
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.path}`
  });
}

/**
 * Wrapper async para rotas
 * Evita try-catch em cada rota
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
