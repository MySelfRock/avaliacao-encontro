import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import type { EvaluationData, Encontro, EncontroStatus } from '../types';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from './config/env';
import { logger } from './config/logger';

// MySQL connection pool
let pool: Pool | null = null;

/**
 * Initialize MySQL connection pool
 */
export function initializePool(): Pool {
  if (pool) return pool;

  const poolConfig: any = {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };

  pool = mysql.createPool(poolConfig);

  logger.info('MySQL connection pool initialized', {
    event: 'db.pool_init',
    host: env.DB_HOST,
    database: env.DB_NAME,
  });

  return pool;
}

/**
 * Get pool instance
 */
function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Convert ISO 8601 date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
 */
export function toMySQLDate(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Função para gerar código único de acesso
 */
function generateCodigoAcesso(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

/**
 * Criar tabelas
 */
export async function initializeDatabase(): Promise<void> {
  const conn = getPool();

  try {
    // Tabela de pastorais (multi-tenant)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pastorais (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        logo_url VARCHAR(500),
        config JSON,
        is_active BOOLEAN DEFAULT TRUE,
        blocked_reason VARCHAR(500),
        blocked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pastoral_subdomain (subdomain)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de encontros (vinculada à pastoral)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS encontros (
        id INT PRIMARY KEY AUTO_INCREMENT,
        pastoral_id INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        data_inicio VARCHAR(50) NOT NULL,
        data_fim VARCHAR(50) NOT NULL,
        local VARCHAR(255),
        tema VARCHAR(255),
        codigo_acesso VARCHAR(50) UNIQUE NOT NULL,
        status ENUM('planejado', 'em_andamento', 'concluido', 'cancelado') DEFAULT 'planejado',
        max_participantes INT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE CASCADE,
        INDEX idx_encontro_pastoral_id (pastoral_id),
        INDEX idx_encontro_codigo (codigo_acesso)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela principal de avaliações (vinculada ao encontro)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS avaliacoes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        encontro_id INT,
        couple_name VARCHAR(255),
        encounter_date VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (encontro_id) REFERENCES encontros(id) ON DELETE SET NULL,
        INDEX idx_avaliacao_encontro_id (encontro_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de avaliações pré-encontro
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pre_encontro (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        communication_clarity INT CHECK (communication_clarity >= 0 AND communication_clarity <= 5),
        registration_ease INT CHECK (registration_ease >= 0 AND registration_ease <= 5),
        comments TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_pre_encontro_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de avaliações de palestras
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS palestras (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        relevance INT CHECK (relevance >= 0 AND relevance <= 5),
        clarity INT CHECK (clarity >= 0 AND clarity <= 5),
        duration INT CHECK (duration >= 0 AND duration <= 5),
        comments TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_palestras_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de avaliações de ambientes
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ambientes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        comfort INT CHECK (comfort >= 0 AND comfort <= 5),
        cleanliness INT CHECK (cleanliness >= 0 AND cleanliness <= 5),
        decoration INT CHECK (decoration >= 0 AND decoration <= 5),
        comments TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_ambientes_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de avaliações de refeições
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS refeicoes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        quality INT CHECK (quality >= 0 AND quality <= 5),
        organization INT CHECK (organization >= 0 AND organization <= 5),
        comments TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_refeicoes_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de avaliações de músicas
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS musicas (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        suitability INT CHECK (suitability >= 0 AND suitability <= 5),
        quality INT CHECK (quality >= 0 AND quality <= 5),
        comments TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_musicas_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de avaliações da equipe
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS equipe (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        availability INT CHECK (availability >= 0 AND availability <= 5),
        organization INT CHECK (organization >= 0 AND organization <= 5),
        comments TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_equipe_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de avaliação geral
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS avaliacao_geral (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        expectations INT CHECK (expectations >= 0 AND expectations <= 5),
        overall_rating INT CHECK (overall_rating >= 0 AND overall_rating <= 5),
        recommendation INT CHECK (recommendation >= 0 AND recommendation <= 5),
        comments TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_avaliacao_geral_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de interesse pastoral
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pastoral (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        interest ENUM('sim', 'talvez', 'nao', '') DEFAULT '',
        contact_info VARCHAR(255),
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_pastoral_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de mensagem final
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS mensagem_final (
        id INT PRIMARY KEY AUTO_INCREMENT,
        avaliacao_id INT NOT NULL,
        message TEXT,
        FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE,
        INDEX idx_mensagem_final_avaliacao_id (avaliacao_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de usuários (admins do sistema)
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'pastoral_admin') NOT NULL,
        pastoral_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login DATETIME,
        FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE CASCADE,
        INDEX idx_users_email (email),
        INDEX idx_users_pastoral_id (pastoral_id),
        INDEX idx_users_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de logs de auditoria
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        pastoral_id INT,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id INT,
        details JSON,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE CASCADE,
        INDEX idx_audit_logs_user_id (user_id),
        INDEX idx_audit_logs_pastoral_id (pastoral_id),
        INDEX idx_audit_logs_action (action),
        INDEX idx_audit_logs_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de refresh tokens
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked_at DATETIME,
        ip_address VARCHAR(50),
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_refresh_tokens_user_id (user_id),
        INDEX idx_refresh_tokens_token (token),
        INDEX idx_refresh_tokens_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tabela de password reset tokens
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME,
        ip_address VARCHAR(50),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_password_reset_tokens_user_id (user_id),
        INDEX idx_password_reset_tokens_token (token),
        INDEX idx_password_reset_tokens_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', {
      event: 'db.init_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Migrate database schema
 */
export async function migrateDatabase(): Promise<void> {
  const conn = getPool();

  try {
    // Check if 'is_active' column exists in pastorais table
    const [columns] = await conn.query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'pastorais' AND COLUMN_NAME = 'is_active'`
    );

    if (columns.length === 0) {
      await conn.execute(`
        ALTER TABLE pastorais
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
        ADD COLUMN blocked_reason VARCHAR(500),
        ADD COLUMN blocked_at DATETIME
      `);
      logger.info('Migrated pastorais table: added is_active, blocked_reason, blocked_at columns');
    }

    // Check for status enum in encontros
    const [statusCheck] = await conn.query<any[]>(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'encontros' AND COLUMN_NAME = 'status'`
    );

    if (statusCheck.length > 0 && !statusCheck[0].COLUMN_TYPE.includes('enum')) {
      await conn.execute(`
        ALTER TABLE encontros
        MODIFY COLUMN status ENUM('planejado', 'em_andamento', 'concluido', 'cancelado') DEFAULT 'planejado'
      `);
      logger.info('Migrated encontros table: status column type updated');
    }

    // Check and add 2FA columns to users table
    const [userColumns] = await conn.query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'two_factor_enabled'`
    );

    if (userColumns.length === 0) {
      await conn.execute(`
        ALTER TABLE users
        ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN two_factor_secret VARCHAR(255),
        ADD COLUMN backup_codes JSON,
        ADD COLUMN two_factorVerified_at DATETIME
      `);
      logger.info('Migrated users table: added 2FA columns');
    }

    // Check and add login_attempts table
    const [attemptsTable] = await conn.query<any[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_NAME = 'login_attempts'`
    );

    if (attemptsTable.length === 0) {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id INT PRIMARY KEY AUTO_INCREMENT,
          ip_address VARCHAR(50) NOT NULL,
          email VARCHAR(255),
          success BOOLEAN DEFAULT FALSE,
          attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_agent TEXT,
          INDEX idx_login_attempts_ip (ip_address),
          INDEX idx_login_attempts_email (email),
          INDEX idx_login_attempts_at (attempted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      logger.info('Created login_attempts table');
    }

    logger.info('Database migration completed');
  } catch (error) {
    logger.error('Failed to migrate database', {
      event: 'db.migration_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================
// PASTORAL MANAGEMENT
// ============================================

export interface Pastoral {
  id?: number;
  name: string;
  subdomain: string;
  logo_url?: string;
  config?: any;
  is_active?: boolean;
  blocked_reason?: string;
  blocked_at?: string;
  created_at?: string;
}

export async function createPastoral(data: Pastoral): Promise<number> {
  const conn = getPool();
  const config = typeof data.config === 'string' ? data.config : JSON.stringify(data.config || {});

  const [result] = await conn.execute<any>(
    `INSERT INTO pastorais (name, subdomain, logo_url, config)
     VALUES (?, ?, ?, ?)`,
    [data.name, data.subdomain, data.logo_url || null, config]
  );

  return result.insertId;
}

export async function getPastoralBySubdomain(subdomain: string): Promise<Pastoral | undefined> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM pastorais WHERE subdomain = ?`,
    [subdomain]
  );

  if (rows.length === 0) return undefined;

  const row = rows[0];
  return {
    ...row,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
  };
}

export async function getPastoralById(id: number): Promise<Pastoral | undefined> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM pastorais WHERE id = ?`,
    [id]
  );

  if (rows.length === 0) return undefined;

  const row = rows[0];
  return {
    ...row,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
  };
}

export async function getAllPastorais(): Promise<Pastoral[]> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(`SELECT * FROM pastorais`);

  return rows.map(row => ({
    ...row,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
  }));
}

export async function updatePastoral(id: number, data: Partial<Pastoral>): Promise<boolean> {
  const conn = getPool();

  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.logo_url !== undefined) {
    fields.push('logo_url = ?');
    values.push(data.logo_url);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }

  if (fields.length === 0) return true;

  values.push(id);

  const [result] = await conn.execute<any>(
    `UPDATE pastorais SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

export async function updatePastoralConfig(id: number, config: any): Promise<boolean> {
  const conn = getPool();
  const configStr = typeof config === 'string' ? config : JSON.stringify(config);

  const [result] = await conn.execute<any>(
    `UPDATE pastorais SET config = ? WHERE id = ?`,
    [configStr, id]
  );

  return result.affectedRows > 0;
}

export async function deletePastoral(id: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `DELETE FROM pastorais WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

export async function blockPastoral(id: number, reason: string): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE pastorais SET is_active = FALSE, blocked_reason = ?, blocked_at = NOW() WHERE id = ?`,
    [reason, id]
  );

  return result.affectedRows > 0;
}

export async function unblockPastoral(id: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE pastorais SET is_active = TRUE, blocked_reason = NULL, blocked_at = NULL WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

export async function updatePastoralLogo(id: number, logoUrl: string): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE pastorais SET logo_url = ? WHERE id = ?`,
    [logoUrl, id]
  );

  return result.affectedRows > 0;
}

// ============================================
// USER MANAGEMENT
// ============================================

export interface User {
  id?: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'super_admin' | 'pastoral_admin';
  pastoral_id?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  two_factor_enabled?: boolean;
  two_factor_secret?: string;
  backup_codes?: string[];
  two_factorVerified_at?: string;
}

export async function createUser(user: User): Promise<number> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `INSERT INTO users (email, password_hash, name, role, pastoral_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.email, user.password_hash, user.name, user.role, user.pastoral_id || null, user.is_active !== false]
  );

  return result.insertId;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  );

  return rows.length > 0 ? rows[0] : undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM users WHERE id = ?`,
    [id]
  );

  return rows.length > 0 ? rows[0] : undefined;
}

export async function getAllUsers(): Promise<User[]> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT u.*, p.name as pastoral_name FROM users u
     LEFT JOIN pastorais p ON u.pastoral_id = p.id`
  );

  return rows;
}

export async function getUsersByPastoral(pastoralId: number): Promise<User[]> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM users WHERE pastoral_id = ?`,
    [pastoralId]
  );

  return rows;
}

export async function updateUser(id: number, data: Partial<User>): Promise<boolean> {
  const conn = getPool();

  const fields: string[] = [];
  const values: any[] = [];

  if (data.email !== undefined) {
    fields.push('email = ?');
    values.push(data.email);
  }
  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.role !== undefined) {
    fields.push('role = ?');
    values.push(data.role);
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }
  if (data.pastoral_id !== undefined) {
    fields.push('pastoral_id = ?');
    values.push(data.pastoral_id);
  }

  if (fields.length === 0) return true;

  values.push(id);

  const [result] = await conn.execute<any>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

export async function updateUserLastLogin(id: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE users SET last_login = NOW() WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

export async function updateUserPassword(id: number, passwordHash: string): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
    [passwordHash, id]
  );

  return result.affectedRows > 0;
}

export async function deleteUser(id: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `DELETE FROM users WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

export async function deactivateUser(id: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE users SET is_active = FALSE WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

export async function activateUser(id: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE users SET is_active = TRUE WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

export async function enableTwoFactor(
  userId: number,
  secret: string,
  backupCodes: string[]
): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE users SET two_factor_enabled = TRUE, two_factor_secret = ?, backup_codes = ?, two_factorVerified_at = NOW() WHERE id = ?`,
    [secret, JSON.stringify(backupCodes), userId]
  );

  return result.affectedRows > 0;
}

export async function disableTwoFactor(userId: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL, backup_codes = NULL, two_factorVerified_at = NULL WHERE id = ?`,
    [userId]
  );

  return result.affectedRows > 0;
}

export async function useBackupCode(userId: number, code: string): Promise<boolean> {
  const conn = getPool();

  const user = await getUserById(userId);
  if (!user || !user.backup_codes) return false;

  const codes = user.backup_codes;
  const index = codes.indexOf(code.toUpperCase());
  if (index === -1) return false;

  codes.splice(index, 1);

  const [result] = await conn.execute<any>(
    `UPDATE users SET backup_codes = ? WHERE id = ?`,
    [JSON.stringify(codes), userId]
  );

  return result.affectedRows > 0;
}

export async function recordLoginAttempt(
  ipAddress: string,
  email: string | null,
  success: boolean,
  userAgent?: string
): Promise<void> {
  const conn = getPool();

  await conn.execute(
    `INSERT INTO login_attempts (ip_address, email, success, user_agent) VALUES (?, ?, ?, ?)`,
    [ipAddress, email, success, userAgent || null]
  );
}

export async function getLoginAttempts(
  ipAddress: string,
  hours: number = 24
): Promise<number> {
  const conn = getPool();

  const [result] = await conn.execute<any[]>(
    `SELECT COUNT(*) as total FROM login_attempts 
     WHERE ip_address = ? AND attempted_at >= DATE_SUB(NOW(), INTERVAL ? HOUR) AND success = FALSE`,
    [ipAddress, hours]
  );

  return result[0]?.total || 0;
}

// ============================================
// AUDIT LOGGING
// ============================================

export interface AuditLog {
  id?: number;
  user_id?: number;
  pastoral_id: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export async function createAuditLog(log: AuditLog): Promise<number> {
  const conn = getPool();
  const details = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {});

  const [result] = await conn.execute<any>(
    `INSERT INTO audit_logs (user_id, pastoral_id, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      log.user_id || null,
      log.pastoral_id,
      log.action,
      log.resource_type,
      log.resource_id || null,
      details,
      log.ip_address || null,
      log.user_agent || null,
    ]
  );

  return result.insertId;
}

interface AuditLogFilters {
  user_id?: number;
  pastoral_id?: number;
  action?: string;
  resource_type?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
  const conn = getPool();

  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];

  if (filters?.user_id) {
    query += ` AND user_id = ?`;
    params.push(filters.user_id);
  }
  if (filters?.pastoral_id) {
    query += ` AND pastoral_id = ?`;
    params.push(filters.pastoral_id);
  }
  if (filters?.action) {
    query += ` AND action = ?`;
    params.push(filters.action);
  }
  if (filters?.resource_type) {
    query += ` AND resource_type = ?`;
    params.push(filters.resource_type);
  }

  query += ` ORDER BY created_at DESC`;

  if (filters?.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
    if (filters?.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }

  const [rows] = await conn.execute<any[]>(query, params);

  return rows.map(row => ({
    ...row,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
  }));
}

// ============================================
// SEEDING
// ============================================

export async function seedDefaultPastoral(): Promise<void> {
  const conn = getPool();

  try {
    // Check if default pastoral exists
    const [existing] = await conn.execute<any[]>(
      `SELECT * FROM pastorais WHERE subdomain = 'default' LIMIT 1`
    );

    if (existing.length > 0) {
      logger.info('Default pastoral already exists');
      return;
    }

    // Create default pastoral
    const config = {
      location: 'Alto da Ponte - Araçatuba, SP',
      contact: {
        phone: '(18) 3636-0000',
        email: 'contato@paroquiasaobenedito.com.br',
      },
      website: 'https://paroquiasaobenedito.com.br',
    };

    const [result] = await conn.execute<any>(
      `INSERT INTO pastorais (name, subdomain, config) VALUES (?, ?, ?)`,
      [
        'Paróquia São Benedito - Alto da Ponte',
        'default',
        JSON.stringify(config),
      ]
    );

    logger.info('Default pastoral created', {
      event: 'db.pastoral_created',
      pastoral_id: result.insertId,
    });
  } catch (error) {
    logger.error('Failed to seed default pastoral', {
      event: 'db.seed_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function seedSuperAdmin(): Promise<void> {
  const conn = getPool();

  try {
    // Check if super admin exists
    const [existing] = await conn.execute<any[]>(
      `SELECT * FROM users WHERE email = 'admin@sistema.com' LIMIT 1`
    );

    if (existing.length > 0) {
      logger.info('Super admin already exists');
      return;
    }

    // Create super admin
    const passwordHash = await bcrypt.hash('admin123', 10);

    const [result] = await conn.execute<any>(
      `INSERT INTO users (email, password_hash, name, role, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'admin@sistema.com',
        passwordHash,
        'Administrador do Sistema',
        'super_admin',
        1,
      ]
    );

    logger.info('Super admin created', {
      event: 'db.user_created',
      user_id: result.insertId,
    });
  } catch (error) {
    logger.error('Failed to seed super admin', {
      event: 'db.seed_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================
// ENCOUNTER MANAGEMENT
// ============================================

export async function createEncontro(encontro: Encontro, pastoralId: number): Promise<number> {
  const conn = getPool();

  const codigoAcesso = generateCodigoAcesso();

  const [result] = await conn.execute<any>(
    `INSERT INTO encontros (pastoral_id, nome, descricao, data_inicio, data_fim, local, tema, codigo_acesso, status, max_participantes, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pastoralId,
      encontro.nome,
      encontro.descricao || null,
      encontro.data_inicio,
      encontro.data_fim,
      encontro.local || null,
      encontro.tema || null,
      codigoAcesso,
      encontro.status || 'planejado',
      encontro.max_participantes || null,
      encontro.observacoes || null,
    ]
  );

  return result.insertId;
}

export async function updateEncontro(id: number, encontro: Partial<Encontro>): Promise<boolean> {
  const conn = getPool();

  const fields: string[] = [];
  const values: any[] = [];

  if (encontro.nome !== undefined) {
    fields.push('nome = ?');
    values.push(encontro.nome);
  }
  if (encontro.descricao !== undefined) {
    fields.push('descricao = ?');
    values.push(encontro.descricao);
  }
  if (encontro.data_inicio !== undefined) {
    fields.push('data_inicio = ?');
    values.push(encontro.data_inicio);
  }
  if (encontro.data_fim !== undefined) {
    fields.push('data_fim = ?');
    values.push(encontro.data_fim);
  }
  if (encontro.local !== undefined) {
    fields.push('local = ?');
    values.push(encontro.local);
  }
  if (encontro.tema !== undefined) {
    fields.push('tema = ?');
    values.push(encontro.tema);
  }
  if (encontro.status !== undefined) {
    fields.push('status = ?');
    values.push(encontro.status);
  }
  if (encontro.max_participantes !== undefined) {
    fields.push('max_participantes = ?');
    values.push(encontro.max_participantes);
  }
  if (encontro.observacoes !== undefined) {
    fields.push('observacoes = ?');
    values.push(encontro.observacoes);
  }

  if (fields.length === 0) return true;

  fields.push('updated_at = NOW()');
  values.push(id);

  const [result] = await conn.execute<any>(
    `UPDATE encontros SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

export async function getAllEncontros(pastoralId?: number): Promise<Encontro[]> {
  const conn = getPool();

  let query = `SELECT * FROM encontros`;
  const params: any[] = [];

  if (pastoralId) {
    query += ` WHERE pastoral_id = ?`;
    params.push(pastoralId);
  }

  query += ` ORDER BY data_inicio DESC`;

  const [rows] = await conn.execute<any[]>(query, params);

  return rows;
}

export async function getAllEncontrosWithStats(pastoralId?: number): Promise<any[]> {
  const conn = getPool();

  let query = `
    SELECT
      e.*,
      COUNT(DISTINCT a.id) as total_avaliacoes,
      COUNT(DISTINCT CASE WHEN ag.overall_rating IS NOT NULL THEN ag.overall_rating END) as total_ratings
    FROM encontros e
    LEFT JOIN avaliacoes a ON e.id = a.encontro_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
  `;

  const params: any[] = [];

  if (pastoralId) {
    query += ` WHERE e.pastoral_id = ?`;
    params.push(pastoralId);
  }

  query += ` GROUP BY e.id ORDER BY e.data_inicio DESC`;

  const [rows] = await conn.execute<any[]>(query, params);

  return rows;
}

export async function getEncontroById(id: number, pastoralId?: number): Promise<Encontro | undefined> {
  const conn = getPool();

  let query = `SELECT * FROM encontros WHERE id = ?`;
  const params: any[] = [id];

  if (pastoralId) {
    query += ` AND pastoral_id = ?`;
    params.push(pastoralId);
  }

  const [rows] = await conn.execute<any[]>(query, params);

  return rows.length > 0 ? rows[0] : undefined;
}

export async function getEncontroByCodigo(codigo: string): Promise<Encontro | undefined> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM encontros WHERE codigo_acesso = ?`,
    [codigo]
  );

  return rows.length > 0 ? rows[0] : undefined;
}

export async function deleteEncontro(id: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `DELETE FROM encontros WHERE id = ?`,
    [id]
  );

  return result.affectedRows > 0;
}

export async function getEstatisticasEncontro(encontroId: number): Promise<any> {
  const conn = getPool();

  const [stats] = await conn.execute<any[]>(
    `SELECT
      COUNT(DISTINCT a.id) as total_avaliacoes,
      AVG(ag.overall_rating) as media_avaliacao,
      AVG(ag.recommendation) as media_recomendacao,
      COUNT(DISTINCT CASE WHEN p.interest = 'sim' THEN p.id END) as interessados,
      COUNT(DISTINCT CASE WHEN p.interest = 'talvez' THEN p.id END) as talvez_interessados
    FROM encontros e
    LEFT JOIN avaliacoes a ON e.id = a.encontro_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    LEFT JOIN pastoral p ON a.id = p.avaliacao_id
    WHERE e.id = ?`,
    [encontroId]
  );

  return stats.length > 0 ? stats[0] : null;
}

// ============================================
// EVALUATION MANAGEMENT
// ============================================

export async function insertAvaliacao(data: EvaluationData): Promise<number> {
  const conn = getPool();

  // Start transaction
  const connection = await conn.getConnection();

  try {
    await connection.beginTransaction();

    // Insert main evaluation
    const [avaliacao] = await connection.execute<any>(
      `INSERT INTO avaliacoes (encontro_id, couple_name, encounter_date)
       VALUES (?, ?, ?)`,
      [data.encontroId || null, data.basicInfo.coupleName || null, data.basicInfo.encounterDate || null]
    );

    const avaliacaoId = avaliacao.insertId;

    // Insert pre-encounter evaluation
    if (data.preEncontro) {
      await connection.execute(
        `INSERT INTO pre_encontro (avaliacao_id, communication_clarity, registration_ease, comments)
         VALUES (?, ?, ?, ?)`,
        [
          avaliacaoId,
          data.preEncontro.communicationClarity || null,
          data.preEncontro.registrationEase || null,
          data.preEncontro.comments || null,
        ]
      );
    }

    // Insert lecture evaluation
    if (data.duranteEncontro?.palestras) {
      await connection.execute(
        `INSERT INTO palestras (avaliacao_id, relevance, clarity, duration, comments)
         VALUES (?, ?, ?, ?, ?)`,
        [
          avaliacaoId,
          data.duranteEncontro.palestras.relevance || null,
          data.duranteEncontro.palestras.clarity || null,
          data.duranteEncontro.palestras.duration || null,
          data.duranteEncontro.palestras.comments || null,
        ]
      );
    }

    // Insert environment evaluation
    if (data.duranteEncontro?.ambientes) {
      await connection.execute(
        `INSERT INTO ambientes (avaliacao_id, comfort, cleanliness, decoration, comments)
         VALUES (?, ?, ?, ?, ?)`,
        [
          avaliacaoId,
          data.duranteEncontro.ambientes.comfort || null,
          data.duranteEncontro.ambientes.cleanliness || null,
          data.duranteEncontro.ambientes.decoration || null,
          data.duranteEncontro.ambientes.comments || null,
        ]
      );
    }

    // Insert meal evaluation
    if (data.duranteEncontro?.refeicoes) {
      await connection.execute(
        `INSERT INTO refeicoes (avaliacao_id, quality, organization, comments)
         VALUES (?, ?, ?, ?)`,
        [
          avaliacaoId,
          data.duranteEncontro.refeicoes.quality || null,
          data.duranteEncontro.refeicoes.organization || null,
          data.duranteEncontro.refeicoes.comments || null,
        ]
      );
    }

    // Insert music evaluation
    if (data.duranteEncontro?.musicas) {
      await connection.execute(
        `INSERT INTO musicas (avaliacao_id, suitability, quality, comments)
         VALUES (?, ?, ?, ?)`,
        [
          avaliacaoId,
          data.duranteEncontro.musicas.suitability || null,
          data.duranteEncontro.musicas.quality || null,
          data.duranteEncontro.musicas.comments || null,
        ]
      );
    }

    // Insert team evaluation
    if (data.duranteEncontro?.equipe) {
      await connection.execute(
        `INSERT INTO equipe (avaliacao_id, availability, organization, comments)
         VALUES (?, ?, ?, ?)`,
        [
          avaliacaoId,
          data.duranteEncontro.equipe.availability || null,
          data.duranteEncontro.equipe.organization || null,
          data.duranteEncontro.equipe.comments || null,
        ]
      );
    }

    // Insert overall evaluation
    if (data.posEncontro?.geral) {
      await connection.execute(
        `INSERT INTO avaliacao_geral (avaliacao_id, expectations, overall_rating, recommendation, comments)
         VALUES (?, ?, ?, ?, ?)`,
        [
          avaliacaoId,
          data.posEncontro.geral.expectations || null,
          data.posEncontro.geral.overallRating || null,
          data.posEncontro.geral.recommendation || null,
          data.posEncontro.geral.comments || null,
        ]
      );
    }

    // Insert pastoral interest
    if (data.posEncontro?.pastoral) {
      await connection.execute(
        `INSERT INTO pastoral (avaliacao_id, interest, contact_info)
         VALUES (?, ?, ?)`,
        [
          avaliacaoId,
          data.posEncontro.pastoral.interest || '',
          data.posEncontro.pastoral.contactInfo || null,
        ]
      );
    }

    // Insert final message
    if (data.posEncontro?.finalMessage) {
      await connection.execute(
        `INSERT INTO mensagem_final (avaliacao_id, message)
         VALUES (?, ?)`,
        [avaliacaoId, data.posEncontro.finalMessage || null]
      );
    }

    await connection.commit();
    logger.info('Evaluation inserted successfully', {
      event: 'db.avaliacao_created',
      avaliacao_id: avaliacaoId,
    });

    return avaliacaoId;
  } catch (error) {
    await connection.rollback();
    logger.error('Failed to insert evaluation', {
      event: 'db.avaliacao_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    connection.release();
  }
}

export async function getAllAvaliacoes(pastoralId?: number): Promise<any[]> {
  const conn = getPool();

  let query = `
    SELECT
      a.*,
      e.nome as encontro_nome,
      e.pastoral_id
    FROM avaliacoes a
    LEFT JOIN encontros e ON a.encontro_id = e.id
  `;

  const params: any[] = [];

  if (pastoralId) {
    query += ` WHERE e.pastoral_id = ?`;
    params.push(pastoralId);
  }

  query += ` ORDER BY a.created_at DESC`;

  const [rows] = await conn.execute<any[]>(query, params);

  return rows;
}

export async function getAvaliacaoById(id: number, pastoralId?: number): Promise<any | undefined> {
  const conn = getPool();

  let query = `
    SELECT a.*, e.pastoral_id
    FROM avaliacoes a
    LEFT JOIN encontros e ON a.encontro_id = e.id
    WHERE a.id = ?
  `;

  const params: any[] = [id];

  if (pastoralId) {
    query += ` AND e.pastoral_id = ?`;
    params.push(pastoralId);
  }

  const [rows] = await conn.execute<any[]>(query, params);

  if (rows.length === 0) return undefined;

  const avaliacao = rows[0];

  // Fetch all related data in parallel
  const [preEncontro, palestras, ambientes, refeicoes, musicas, equipe, avaliacaoGeral, pastoral, mensagemFinal] = await Promise.all([
    conn.execute<any[]>(`SELECT * FROM pre_encontro WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM palestras WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM ambientes WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM refeicoes WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM musicas WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM equipe WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM avaliacao_geral WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM pastoral WHERE avaliacao_id = ?`, [id]),
    conn.execute<any[]>(`SELECT * FROM mensagem_final WHERE avaliacao_id = ?`, [id]),
  ]);

  return {
    ...avaliacao,
    pre_encontro: preEncontro[0].length > 0 ? preEncontro[0][0] : null,
    palestras: palestras[0].length > 0 ? palestras[0][0] : null,
    ambientes: ambientes[0].length > 0 ? ambientes[0][0] : null,
    refeicoes: refeicoes[0].length > 0 ? refeicoes[0][0] : null,
    musicas: musicas[0].length > 0 ? musicas[0][0] : null,
    equipe: equipe[0].length > 0 ? equipe[0][0] : null,
    avaliacao_geral: avaliacaoGeral[0].length > 0 ? avaliacaoGeral[0][0] : null,
    pastoral: pastoral[0].length > 0 ? pastoral[0][0] : null,
    mensagem_final: mensagemFinal[0].length > 0 ? mensagemFinal[0][0] : null,
  };
}

export async function getEstatisticas(pastoralId?: number): Promise<any> {
  const conn = getPool();

  let query = `
    SELECT
      COUNT(DISTINCT a.id) as total_avaliacoes,
      COUNT(DISTINCT e.id) as total_encontros,
      AVG(ag.overall_rating) as media_avaliacao,
      COUNT(DISTINCT CASE WHEN p.interest = 'sim' THEN p.id END) as interessados_pastoral,
      COUNT(DISTINCT CASE WHEN p.interest = 'talvez' THEN p.id END) as talvez_interessados
    FROM encontros e
    LEFT JOIN avaliacoes a ON e.id = a.encontro_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    LEFT JOIN pastoral p ON a.id = p.avaliacao_id
  `;

  const params: any[] = [];

  if (pastoralId) {
    query += ` WHERE e.pastoral_id = ?`;
    params.push(pastoralId);
  }

  const [rows] = await conn.execute<any[]>(query, params);

  return rows.length > 0 ? rows[0] : null;
}

export async function getInteressadosPastoral(pastoralId?: number): Promise<any[]> {
  const conn = getPool();

  let query = `
    SELECT
      a.id,
      a.couple_name,
      p.contact_info,
      e.nome as encontro_nome,
      e.data_inicio
    FROM pastoral p
    JOIN avaliacoes a ON p.avaliacao_id = a.id
    LEFT JOIN encontros e ON a.encontro_id = e.id
    WHERE p.interest = 'sim'
  `;

  const params: any[] = [];

  if (pastoralId) {
    query += ` AND e.pastoral_id = ?`;
    params.push(pastoralId);
  }

  query += ` ORDER BY e.data_inicio DESC`;

  const [rows] = await conn.execute<any[]>(query, params);

  return rows;
}

export async function getTodosContatos(pastoralId?: number): Promise<any[]> {
  const conn = getPool();

  let query = `
    SELECT
      a.id,
      a.couple_name,
      p.contact_info,
      p.interest,
      e.nome as encontro_nome,
      e.data_inicio
    FROM pastoral p
    JOIN avaliacoes a ON p.avaliacao_id = a.id
    LEFT JOIN encontros e ON a.encontro_id = e.id
    WHERE p.contact_info IS NOT NULL
  `;

  const params: any[] = [];

  if (pastoralId) {
    query += ` AND e.pastoral_id = ?`;
    params.push(pastoralId);
  }

  query += ` ORDER BY p.interest DESC, e.data_inicio DESC`;

  const [rows] = await conn.execute<any[]>(query, params);

  return rows;
}

export async function getAllAvaliacoesDetalhadas(pastoralId?: number): Promise<any[]> {
  const conn = getPool();

  let query = `
    SELECT
      a.*,
      e.nome as encontro_nome,
      pre.communication_clarity,
      pre.registration_ease,
      pal.relevance as palestra_relevance,
      amb.comfort,
      ref.quality as refeicao_quality,
      mus.suitability,
      eq.availability as team_availability,
      ag.overall_rating,
      ag.recommendation,
      p.interest as pastoral_interest
    FROM avaliacoes a
    LEFT JOIN encontros e ON a.encontro_id = e.id
    LEFT JOIN pre_encontro pre ON a.id = pre.avaliacao_id
    LEFT JOIN palestras pal ON a.id = pal.avaliacao_id
    LEFT JOIN ambientes amb ON a.id = amb.avaliacao_id
    LEFT JOIN refeicoes ref ON a.id = ref.avaliacao_id
    LEFT JOIN musicas mus ON a.id = mus.avaliacao_id
    LEFT JOIN equipe eq ON a.id = eq.avaliacao_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    LEFT JOIN pastoral p ON a.id = p.avaliacao_id
  `;

  const params: any[] = [];

  if (pastoralId) {
    query += ` WHERE e.pastoral_id = ?`;
    params.push(pastoralId);
  }

  query += ` ORDER BY a.created_at DESC`;

  const [rows] = await conn.execute<any[]>(query, params);

  return rows;
}

export async function getAvaliacoesByEncontro(encontroId: number): Promise<any[]> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM avaliacoes WHERE encontro_id = ? ORDER BY created_at DESC`,
    [encontroId]
  );

  return rows;
}

// ============================================
// REFRESH TOKENS
// ============================================

export interface RefreshToken {
  id?: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at?: string;
  revoked_at?: string;
  ip_address?: string;
  user_agent?: string;
}

export async function createRefreshToken(refreshToken: RefreshToken): Promise<number> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [
      refreshToken.user_id,
      refreshToken.token,
      toMySQLDate(refreshToken.expires_at),
      refreshToken.ip_address || null,
      refreshToken.user_agent || null,
    ]
  );

  return result.insertId;
}

export async function getRefreshToken(token: string): Promise<RefreshToken | undefined> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM refresh_tokens WHERE token = ? AND revoked_at IS NULL`,
    [token]
  );

  return rows.length > 0 ? rows[0] : undefined;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const conn = getPool();

  await conn.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ?`,
    [token]
  );
}

export async function revokeAllUserRefreshTokens(userId: number): Promise<void> {
  const conn = getPool();

  await conn.execute(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
    [userId]
  );
}

export async function cleanupExpiredRefreshTokens(): Promise<void> {
  const conn = getPool();

  await conn.execute(
    `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
  );

  logger.info('Cleaned up expired refresh tokens');
}

// ============================================
// PASSWORD RESET TOKENS
// ============================================

export interface PasswordResetToken {
  id?: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at?: string;
  used_at?: string;
  ip_address?: string;
}

export async function createPasswordResetToken(resetToken: PasswordResetToken): Promise<number> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
     VALUES (?, ?, ?, ?)`,
    [
      resetToken.user_id,
      resetToken.token,
      toMySQLDate(resetToken.expires_at),
      resetToken.ip_address || null,
    ]
  );

  return result.insertId;
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > NOW()`,
    [token]
  );

  return rows.length > 0 ? rows[0] : undefined;
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  const conn = getPool();

  await conn.execute(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ?`,
    [token]
  );
}

export async function cleanupExpiredPasswordResetTokens(): Promise<void> {
  const conn = getPool();

  await conn.execute(
    `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
  );

  logger.info('Cleaned up expired password reset tokens');
}

export async function getUserRefreshTokens(userId: number): Promise<RefreshToken[]> {
  const conn = getPool();

  const [rows] = await conn.execute<any[]>(
    `SELECT * FROM refresh_tokens WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

export async function revokeRefreshTokenById(tokenId: number, userId: number): Promise<boolean> {
  const conn = getPool();

  const [result] = await conn.execute<any>(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND user_id = ?`,
    [tokenId, userId]
  );

  return result.affectedRows > 0;
}
