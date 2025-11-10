import type { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../config/logger';

// Usar o mesmo banco de dados da aplicação
const dbPath = path.join(process.cwd(), 'avaliacoes.db');
const db = new Database(dbPath);

/**
 * Configurações de monitoramento
 */
const CONFIG = {
  MAX_ATTEMPTS: 5, // Máximo de tentativas antes de bloqueio
  LOCK_DURATION_MINUTES: 15, // Duração do bloqueio em minutos
  WINDOW_MINUTES: 15, // Janela de tempo para contar tentativas
};

/**
 * Interface para tentativa de login
 */
interface LoginAttempt {
  id?: number;
  ip_address: string;
  email: string;
  success: boolean;
  attempted_at: string;
  user_agent?: string;
}

/**
 * Criar tabela de tentativas de login se não existir
 */
export function initializeLoginAttemptsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      email TEXT NOT NULL,
      success BOOLEAN NOT NULL DEFAULT 0,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      INDEX idx_login_attempts_ip (ip_address),
      INDEX idx_login_attempts_email (email),
      INDEX idx_login_attempts_time (attempted_at)
    )
  `);

  logger.info('Login attempts monitoring table initialized');
}

/**
 * Registrar tentativa de login
 */
export function recordLoginAttempt(attempt: LoginAttempt): void {
  const stmt = db.prepare(`
    INSERT INTO login_attempts (ip_address, email, success, attempted_at, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    attempt.ip_address,
    attempt.email,
    attempt.success ? 1 : 0,
    attempt.attempted_at,
    attempt.user_agent || null
  );

  if (!attempt.success) {
    logger.warn('Failed login attempt', {
      event: 'auth.failed_attempt',
      ip: attempt.ip_address,
      email: attempt.email,
    });
  }
}

/**
 * Obter número de tentativas falhadas recentes
 */
export function getRecentFailedAttempts(ipOrEmail: string, isEmail: boolean = false): number {
  const column = isEmail ? 'email' : 'ip_address';
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - CONFIG.WINDOW_MINUTES);

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM login_attempts
    WHERE ${column} = ?
      AND success = 0
      AND attempted_at > ?
  `);

  const result = stmt.get(ipOrEmail, windowStart.toISOString()) as { count: number };
  return result.count;
}

/**
 * Verificar se IP ou email está bloqueado
 */
export function isBlocked(ipOrEmail: string, isEmail: boolean = false): boolean {
  const column = isEmail ? 'email' : 'ip_address';
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - CONFIG.WINDOW_MINUTES);

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM login_attempts
    WHERE ${column} = ?
      AND success = 0
      AND attempted_at > ?
  `);

  const result = stmt.get(ipOrEmail, windowStart.toISOString()) as { count: number };

  if (result.count >= CONFIG.MAX_ATTEMPTS) {
    logger.warn(`Blocked login attempt - too many failures`, {
      event: 'security.account_locked',
      [isEmail ? 'email' : 'ip']: ipOrEmail,
      attempts: result.count,
    });
    return true;
  }

  return false;
}

/**
 * Limpar tentativas antigas (chamar periodicamente)
 */
export function cleanupOldAttempts(): void {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24); // Manter apenas últimas 24h

  const stmt = db.prepare(`
    DELETE FROM login_attempts
    WHERE attempted_at < ?
  `);

  const result = stmt.run(cutoffDate.toISOString());

  if (result.changes > 0) {
    logger.info('Cleaned up old login attempts', {
      event: 'maintenance.cleanup',
      removed: result.changes,
    });
  }
}

/**
 * Middleware para verificar bloqueio antes de tentar login
 */
export function checkLoginAttempts(req: Request, res: Response, next: NextFunction): void {
  const email = req.body.email;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  // Verificar bloqueio por IP
  if (isBlocked(ipAddress, false)) {
    const remainingMinutes = CONFIG.LOCK_DURATION_MINUTES;

    logger.warn('Login blocked - IP locked', {
      event: 'security.login_blocked',
      ip: ipAddress,
      email,
    });

    return res.status(429).json({
      success: false,
      message: `Muitas tentativas de login falhadas. Aguarde ${remainingMinutes} minutos.`,
      lockedUntil: new Date(Date.now() + remainingMinutes * 60 * 1000).toISOString(),
    });
  }

  // Verificar bloqueio por email (se fornecido)
  if (email && isBlocked(email, true)) {
    const remainingMinutes = CONFIG.LOCK_DURATION_MINUTES;

    logger.warn('Login blocked - email locked', {
      event: 'security.login_blocked',
      ip: ipAddress,
      email,
    });

    return res.status(429).json({
      success: false,
      message: `Muitas tentativas de login falhadas para este email. Aguarde ${remainingMinutes} minutos.`,
      lockedUntil: new Date(Date.now() + remainingMinutes * 60 * 1000).toISOString(),
    });
  }

  next();
}

/**
 * Obter estatísticas de tentativas de login
 */
export function getLoginAttemptStats(hours: number = 24) {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
      COUNT(DISTINCT ip_address) as unique_ips,
      COUNT(DISTINCT email) as unique_emails
    FROM login_attempts
    WHERE attempted_at > ?
  `);

  return stmt.get(since.toISOString());
}

// Inicializar tabela quando o módulo for carregado
try {
  initializeLoginAttemptsTable();
} catch (error) {
  logger.error('Failed to initialize login attempts table', {
    event: 'db.error',
    error: error instanceof Error ? error.message : 'Unknown error',
  });
}

// Agendar limpeza automática a cada hora
setInterval(() => {
  try {
    cleanupOldAttempts();
  } catch (error) {
    logger.error('Failed to cleanup old login attempts', {
      event: 'maintenance.error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}, 60 * 60 * 1000); // 1 hora
