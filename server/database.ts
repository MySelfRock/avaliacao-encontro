import Database from 'better-sqlite3';
import path from 'path';
import type { EvaluationData, Encontro, EncontroStatus } from '../types';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'avaliacoes.db');
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Função para gerar código único de acesso
function generateCodigoAcesso(): string {
  return randomBytes(8).toString('hex');
}

// Criar tabelas
export function initializeDatabase() {
  // Tabela de pastorais (multi-tenant)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pastorais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subdomain TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      config TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de encontros (vinculada à pastoral)
  db.exec(`
    CREATE TABLE IF NOT EXISTS encontros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pastoral_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      data_inicio TEXT NOT NULL,
      data_fim TEXT NOT NULL,
      local TEXT,
      tema TEXT,
      codigo_acesso TEXT UNIQUE NOT NULL,
      status TEXT CHECK(status IN ('planejado', 'em_andamento', 'concluido', 'cancelado')) DEFAULT 'planejado',
      max_participantes INTEGER,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE CASCADE
    )
  `);

  // Tabela principal de avaliações (vinculada ao encontro)
  db.exec(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      encontro_id INTEGER,
      couple_name TEXT,
      encounter_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (encontro_id) REFERENCES encontros(id) ON DELETE SET NULL
    )
  `);

  // Tabela de avaliações pré-encontro
  db.exec(`
    CREATE TABLE IF NOT EXISTS pre_encontro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      communication_clarity INTEGER CHECK(communication_clarity >= 0 AND communication_clarity <= 5),
      registration_ease INTEGER CHECK(registration_ease >= 0 AND registration_ease <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de palestras
  db.exec(`
    CREATE TABLE IF NOT EXISTS palestras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      relevance INTEGER CHECK(relevance >= 0 AND relevance <= 5),
      clarity INTEGER CHECK(clarity >= 0 AND clarity <= 5),
      duration INTEGER CHECK(duration >= 0 AND duration <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de ambientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS ambientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      comfort INTEGER CHECK(comfort >= 0 AND comfort <= 5),
      cleanliness INTEGER CHECK(cleanliness >= 0 AND cleanliness <= 5),
      decoration INTEGER CHECK(decoration >= 0 AND decoration <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de refeições
  db.exec(`
    CREATE TABLE IF NOT EXISTS refeicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      quality INTEGER CHECK(quality >= 0 AND quality <= 5),
      organization INTEGER CHECK(organization >= 0 AND organization <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de músicas
  db.exec(`
    CREATE TABLE IF NOT EXISTS musicas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      suitability INTEGER CHECK(suitability >= 0 AND suitability <= 5),
      quality INTEGER CHECK(quality >= 0 AND quality <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações da equipe
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      availability INTEGER CHECK(availability >= 0 AND availability <= 5),
      organization INTEGER CHECK(organization >= 0 AND organization <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliação geral
  db.exec(`
    CREATE TABLE IF NOT EXISTS avaliacao_geral (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      expectations INTEGER CHECK(expectations >= 0 AND expectations <= 5),
      overall_rating INTEGER CHECK(overall_rating >= 0 AND overall_rating <= 5),
      recommendation INTEGER CHECK(recommendation >= 0 AND recommendation <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de interesse pastoral
  db.exec(`
    CREATE TABLE IF NOT EXISTS pastoral (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      interest TEXT CHECK(interest IN ('sim', 'talvez', 'nao', '')),
      contact_info TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de mensagem final
  db.exec(`
    CREATE TABLE IF NOT EXISTS mensagem_final (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      message TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de usuários (admins do sistema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('super_admin', 'pastoral_admin')) NOT NULL,
      pastoral_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE CASCADE
    )
  `);

  // Índices para performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_pastoral_id ON users(pastoral_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);

  // Tabela de logs de auditoria
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pastoral_id INTEGER,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE SET NULL
    )
  `);

  // Índice para consultas de auditoria
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_pastoral_id ON audit_logs(pastoral_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at)`);

  // Tabela de refresh tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked_at DATETIME,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Índices para refresh tokens
  db.exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)`);

  // Tabela de tokens de reset de senha
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      used_at DATETIME,
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Índices para password reset tokens
  db.exec(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON password_reset_tokens(expires_at)`);

  console.log('✅ Banco de dados inicializado com sucesso!');
}

// Função para migrar banco existente (adicionar pastoral_id aos encontros se não existir)
export function migrateDatabase() {
  try {
    // Verificar se a tabela pastorais existe
    const tablesPastorais = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pastorais'").get();

    if (tablesPastorais) {
      // Verificar se a coluna pastoral_id já existe na tabela encontros
      const encontrosTableInfo = db.prepare("PRAGMA table_info(encontros)").all() as any[];
      const hasPastoralId = encontrosTableInfo.some((col: any) => col.name === 'pastoral_id');

      if (!hasPastoralId) {
        console.log('🔄 Iniciando migração - adicionando pastoral_id aos encontros...');

        // Criar pastoral padrão se não existir
        const defaultPastoral = db.prepare('SELECT * FROM pastorais WHERE subdomain = ?').get('default');
        let pastoralId: number;

        if (!defaultPastoral) {
          const result = db.prepare(`
            INSERT INTO pastorais (name, subdomain, config)
            VALUES (?, ?, ?)
          `).run('Paróquia São Benedito', 'default', JSON.stringify({
            primaryColor: '#1e40af',
            secondaryColor: '#3b82f6',
            logoUrl: '',
            welcomeMessage: 'Bem-vindo ao Sistema de Avaliação do Encontro de Noivos'
          }));
          pastoralId = result.lastInsertRowid as number;
          console.log('✅ Pastoral padrão criada com ID:', pastoralId);
        } else {
          pastoralId = (defaultPastoral as any).id;
          console.log('✅ Pastoral padrão já existe com ID:', pastoralId);
        }

        // Adicionar coluna pastoral_id à tabela encontros
        db.exec(`ALTER TABLE encontros ADD COLUMN pastoral_id INTEGER`);
        console.log('✅ Coluna pastoral_id adicionada à tabela encontros');

        // Atualizar todos os encontros existentes com o ID da pastoral padrão
        db.prepare('UPDATE encontros SET pastoral_id = ?').run(pastoralId);
        console.log('✅ Encontros existentes vinculados à pastoral padrão');

        console.log('✅ Migração concluída com sucesso!');
      } else {
        console.log('✅ Banco de dados já está atualizado');
      }

      // Verificar se a coluna encontro_id existe na tabela avaliacoes
      const avaliacoesTableInfo = db.prepare("PRAGMA table_info(avaliacoes)").all() as any[];
      const hasEncontroId = avaliacoesTableInfo.some((col: any) => col.name === 'encontro_id');

      if (!hasEncontroId) {
        console.log('🔄 Adicionando coluna encontro_id à tabela avaliacoes...');
        db.exec(`ALTER TABLE avaliacoes ADD COLUMN encontro_id INTEGER REFERENCES encontros(id) ON DELETE SET NULL`);
        console.log('✅ Coluna encontro_id adicionada à tabela avaliacoes');
      }

      // Verificar se as colunas de status existem na tabela pastorais
      const pastoraisTableInfo = db.prepare("PRAGMA table_info(pastorais)").all() as any[];
      const hasIsActive = pastoraisTableInfo.some((col: any) => col.name === 'is_active');
      const hasBlockedReason = pastoraisTableInfo.some((col: any) => col.name === 'blocked_reason');
      const hasBlockedAt = pastoraisTableInfo.some((col: any) => col.name === 'blocked_at');

      if (!hasIsActive) {
        console.log('🔄 Adicionando coluna is_active à tabela pastorais...');
        db.exec(`ALTER TABLE pastorais ADD COLUMN is_active BOOLEAN DEFAULT 1`);
        console.log('✅ Coluna is_active adicionada à tabela pastorais');
      }

      if (!hasBlockedReason) {
        console.log('🔄 Adicionando coluna blocked_reason à tabela pastorais...');
        db.exec(`ALTER TABLE pastorais ADD COLUMN blocked_reason TEXT`);
        console.log('✅ Coluna blocked_reason adicionada à tabela pastorais');
      }

      if (!hasBlockedAt) {
        console.log('🔄 Adicionando coluna blocked_at à tabela pastorais...');
        db.exec(`ALTER TABLE pastorais ADD COLUMN blocked_at DATETIME`);
        console.log('✅ Coluna blocked_at adicionada à tabela pastorais');
      }
    } else {
      console.log('✅ Banco de dados novo - nenhuma migração necessária');
    }
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE PASTORAIS ====================

export function createPastoral(data: {
  name: string;
  subdomain: string;
  logoUrl?: string;
  config?: any;
}) {
  const insert = db.prepare(`
    INSERT INTO pastorais (name, subdomain, logo_url, config)
    VALUES (?, ?, ?, ?)
  `);

  const result = insert.run(
    data.name,
    data.subdomain,
    data.logoUrl || null,
    JSON.stringify(data.config || {})
  );

  return result.lastInsertRowid;
}

export function getPastoralBySubdomain(subdomain: string) {
  const pastoral = db.prepare('SELECT * FROM pastorais WHERE subdomain = ?').get(subdomain) as any;

  if (pastoral && pastoral.config) {
    try {
      pastoral.config = JSON.parse(pastoral.config);
    } catch (e) {
      pastoral.config = {};
    }
  }

  return pastoral;
}

export function getPastoralById(id: number) {
  const pastoral = db.prepare('SELECT * FROM pastorais WHERE id = ?').get(id) as any;

  if (pastoral && pastoral.config) {
    try {
      pastoral.config = JSON.parse(pastoral.config);
    } catch (e) {
      pastoral.config = {};
    }
  }

  return pastoral;
}

export function getAllPastorais() {
  const pastorais = db.prepare('SELECT * FROM pastorais ORDER BY created_at DESC').all() as any[];

  return pastorais.map(pastoral => {
    if (pastoral.config) {
      try {
        pastoral.config = JSON.parse(pastoral.config);
      } catch (e) {
        pastoral.config = {};
      }
    }
    return pastoral;
  });
}

export function updatePastoralConfig(id: number, config: any) {
  const update = db.prepare(`
    UPDATE pastorais
    SET config = ?
    WHERE id = ?
  `);

  return update.run(JSON.stringify(config), id);
}

export function updatePastoral(id: number, data: {
  name?: string;
  subdomain?: string;
  logoUrl?: string;
  config?: any;
}) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }

  if (data.subdomain !== undefined) {
    fields.push('subdomain = ?');
    values.push(data.subdomain);
  }

  if (data.logoUrl !== undefined) {
    fields.push('logo_url = ?');
    values.push(data.logoUrl);
  }

  if (data.config !== undefined) {
    fields.push('config = ?');
    values.push(JSON.stringify(data.config));
  }

  if (fields.length === 0) return;

  values.push(id);

  const update = db.prepare(`
    UPDATE pastorais
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  return update.run(...values);
}

export function deletePastoral(id: number) {
  const del = db.prepare('DELETE FROM pastorais WHERE id = ?');
  return del.run(id);
}

export function blockPastoral(id: number, reason: string) {
  const update = db.prepare(`
    UPDATE pastorais
    SET is_active = 0,
        blocked_reason = ?,
        blocked_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return update.run(reason, id);
}

export function unblockPastoral(id: number) {
  const update = db.prepare(`
    UPDATE pastorais
    SET is_active = 1,
        blocked_reason = NULL,
        blocked_at = NULL
    WHERE id = ?
  `);
  return update.run(id);
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS ====================

export interface User {
  id?: number;
  email: string;
  password_hash?: string;
  name: string;
  role: 'super_admin' | 'pastoral_admin';
  pastoral_id?: number | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string | null;
}

export function createUser(user: User): number {
  const insert = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, pastoral_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    user.email,
    user.password_hash,
    user.name,
    user.role,
    user.pastoral_id || null,
    user.is_active !== false ? 1 : 0
  );

  return result.lastInsertRowid as number;
}

export function getUserByEmail(email: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function getAllUsers(): User[] {
  const stmt = db.prepare(`
    SELECT u.*, p.name as pastoral_name, p.subdomain as pastoral_subdomain
    FROM users u
    LEFT JOIN pastorais p ON u.pastoral_id = p.id
    ORDER BY u.created_at DESC
  `);
  return stmt.all() as User[];
}

export function getUsersByPastoral(pastoralId: number): User[] {
  const stmt = db.prepare(`
    SELECT * FROM users
    WHERE pastoral_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(pastoralId) as User[];
}

export function updateUser(id: number, data: Partial<User>) {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }

  if (data.email !== undefined) {
    fields.push('email = ?');
    values.push(data.email);
  }

  if (data.password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push(data.password_hash);
  }

  if (data.role !== undefined) {
    fields.push('role = ?');
    values.push(data.role);
  }

  if (data.pastoral_id !== undefined) {
    fields.push('pastoral_id = ?');
    values.push(data.pastoral_id);
  }

  if (data.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(data.is_active ? 1 : 0);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');

  if (fields.length === 0) {
    throw new Error('Nenhum campo para atualizar');
  }

  const update = db.prepare(`
    UPDATE users
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  values.push(id);
  return update.run(...values);
}

export function updateUserLastLogin(id: number) {
  const update = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
  return update.run(id);
}

export function deleteUser(id: number) {
  const del = db.prepare('DELETE FROM users WHERE id = ?');
  return del.run(id);
}

export function deactivateUser(id: number) {
  const update = db.prepare('UPDATE users SET is_active = 0 WHERE id = ?');
  return update.run(id);
}

export function activateUser(id: number) {
  const update = db.prepare('UPDATE users SET is_active = 1 WHERE id = ?');
  return update.run(id);
}

export function updateUserPassword(id: number, passwordHash: string) {
  const update = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  return update.run(passwordHash, id);
}

// ==================== FUNÇÕES DE AUDITORIA ====================

export interface AuditLog {
  id?: number;
  user_id: number;
  pastoral_id?: number | null;
  action: string;
  resource_type: string;
  resource_id?: number | null;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export function createAuditLog(log: AuditLog): number {
  const insert = db.prepare(`
    INSERT INTO audit_logs (
      user_id, pastoral_id, action, resource_type, resource_id,
      details, ip_address, user_agent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    log.user_id,
    log.pastoral_id || null,
    log.action,
    log.resource_type,
    log.resource_id || null,
    log.details || null,
    log.ip_address || null,
    log.user_agent || null
  );

  return result.lastInsertRowid as number;
}

export function getAuditLogs(filters?: {
  userId?: number;
  pastoralId?: number;
  limit?: number;
  offset?: number;
}): AuditLog[] {
  let query = `
    SELECT a.*, u.name as user_name, u.email as user_email
    FROM audit_logs a
    JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (filters?.userId) {
    query += ' AND a.user_id = ?';
    params.push(filters.userId);
  }

  if (filters?.pastoralId) {
    query += ' AND a.pastoral_id = ?';
    params.push(filters.pastoralId);
  }

  query += ' ORDER BY a.created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as AuditLog[];
}

// ==================== SEED DE SUPER ADMIN ====================

export function seedSuperAdmin() {
  // Verificar se já existe um super admin
  const existingSuperAdmin = db.prepare(`
    SELECT * FROM users WHERE role = 'super_admin' LIMIT 1
  `).get();

  if (existingSuperAdmin) {
    console.log('✅ Super admin já existe');
    return;
  }

  // Criar super admin padrão
  // IMPORTANTE: Em produção, trocar essa senha imediatamente!
  const passwordHash = bcrypt.hashSync('admin123', 10);

  const insert = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, pastoral_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = insert.run(
    'admin@sistema.com',
    passwordHash,
    'Administrador do Sistema',
    'super_admin',
    null,
    1
  );

  console.log('✅ Super admin criado com sucesso!');
  console.log('   Email: admin@sistema.com');
  console.log('   Senha: admin123');
  console.log('   ⚠️  IMPORTANTE: Troque essa senha imediatamente em produção!');
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE ENCONTROS ====================

export function createEncontro(encontro: Encontro, pastoralId: number): number {
  const codigoAcesso = generateCodigoAcesso();

  const stmt = db.prepare(`
    INSERT INTO encontros (
      pastoral_id, nome, descricao, data_inicio, data_fim, local, tema,
      codigo_acesso, status, max_participantes, observacoes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
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
    encontro.observacoes || null
  );

  return result.lastInsertRowid as number;
}

export function updateEncontro(id: number, encontro: Partial<Encontro>): boolean {
  const stmt = db.prepare(`
    UPDATE encontros
    SET nome = COALESCE(?, nome),
        descricao = COALESCE(?, descricao),
        data_inicio = COALESCE(?, data_inicio),
        data_fim = COALESCE(?, data_fim),
        local = COALESCE(?, local),
        tema = COALESCE(?, tema),
        status = COALESCE(?, status),
        max_participantes = COALESCE(?, max_participantes),
        observacoes = COALESCE(?, observacoes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = stmt.run(
    encontro.nome || null,
    encontro.descricao !== undefined ? encontro.descricao : null,
    encontro.data_inicio || null,
    encontro.data_fim || null,
    encontro.local !== undefined ? encontro.local : null,
    encontro.tema !== undefined ? encontro.tema : null,
    encontro.status || null,
    encontro.max_participantes !== undefined ? encontro.max_participantes : null,
    encontro.observacoes !== undefined ? encontro.observacoes : null,
    id
  );

  return result.changes > 0;
}

export function getAllEncontros(pastoralId?: number) {
  if (pastoralId) {
    const encontros = db.prepare(`
      SELECT * FROM encontros
      WHERE pastoral_id = ?
      ORDER BY data_inicio DESC
    `).all(pastoralId);
    return encontros;
  }

  const encontros = db.prepare(`
    SELECT * FROM encontros
    ORDER BY data_inicio DESC
  `).all();

  return encontros;
}

export function getAllEncontrosWithStats(pastoralId?: number) {
  if (pastoralId) {
    const encontros = db.prepare(`
      SELECT
        e.*,
        COUNT(a.id) as total_avaliacoes,
        COALESCE(AVG(ag.overall_rating), 0) as media_geral
      FROM encontros e
      LEFT JOIN avaliacoes a ON e.id = a.encontro_id
      LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
      WHERE e.pastoral_id = ?
      GROUP BY e.id
      ORDER BY e.data_inicio DESC
    `).all(pastoralId);
    return encontros;
  }

  const encontros = db.prepare(`
    SELECT
      e.*,
      COUNT(a.id) as total_avaliacoes,
      COALESCE(AVG(ag.overall_rating), 0) as media_geral
    FROM encontros e
    LEFT JOIN avaliacoes a ON e.id = a.encontro_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    GROUP BY e.id
    ORDER BY e.data_inicio DESC
  `).all();

  return encontros;
}

export function getEncontroById(id: number, pastoralId?: number) {
  if (pastoralId) {
    const encontro = db.prepare('SELECT * FROM encontros WHERE id = ? AND pastoral_id = ?').get(id, pastoralId);
    return encontro;
  }

  const encontro = db.prepare('SELECT * FROM encontros WHERE id = ?').get(id);
  return encontro;
}

export function getEncontroByCodigo(codigo: string) {
  const encontro = db.prepare('SELECT * FROM encontros WHERE codigo_acesso = ?').get(codigo);
  return encontro;
}

export function deleteEncontro(id: number): boolean {
  const stmt = db.prepare('DELETE FROM encontros WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getEstatisticasEncontro(encontroId: number) {
  const totalAvaliacoes = db.prepare(
    'SELECT COUNT(*) as total FROM avaliacoes WHERE encontro_id = ?'
  ).get(encontroId) as { total: number };

  const mediaPreEncontro = db.prepare(`
    SELECT
      AVG(pe.communication_clarity) as avg_communication,
      AVG(pe.registration_ease) as avg_registration
    FROM pre_encontro pe
    JOIN avaliacoes a ON pe.avaliacao_id = a.id
    WHERE a.encontro_id = ?
  `).get(encontroId);

  const mediaPalestras = db.prepare(`
    SELECT
      AVG(p.relevance) as avg_relevance,
      AVG(p.clarity) as avg_clarity,
      AVG(p.duration) as avg_duration
    FROM palestras p
    JOIN avaliacoes a ON p.avaliacao_id = a.id
    WHERE a.encontro_id = ?
  `).get(encontroId);

  const mediaAmbientes = db.prepare(`
    SELECT
      AVG(amb.comfort) as avg_comfort,
      AVG(amb.cleanliness) as avg_cleanliness,
      AVG(amb.decoration) as avg_decoration
    FROM ambientes amb
    JOIN avaliacoes a ON amb.avaliacao_id = a.id
    WHERE a.encontro_id = ?
  `).get(encontroId);

  const mediaRefeicoes = db.prepare(`
    SELECT
      AVG(r.quality) as avg_quality,
      AVG(r.organization) as avg_organization
    FROM refeicoes r
    JOIN avaliacoes a ON r.avaliacao_id = a.id
    WHERE a.encontro_id = ?
  `).get(encontroId);

  const mediaMusicas = db.prepare(`
    SELECT
      AVG(m.suitability) as avg_suitability,
      AVG(m.quality) as avg_quality
    FROM musicas m
    JOIN avaliacoes a ON m.avaliacao_id = a.id
    WHERE a.encontro_id = ?
  `).get(encontroId);

  const mediaEquipe = db.prepare(`
    SELECT
      AVG(e.availability) as avg_availability,
      AVG(e.organization) as avg_organization
    FROM equipe e
    JOIN avaliacoes a ON e.avaliacao_id = a.id
    WHERE a.encontro_id = ?
  `).get(encontroId);

  const mediaAvaliacaoGeral = db.prepare(`
    SELECT
      AVG(ag.expectations) as avg_expectations,
      AVG(ag.overall_rating) as avg_overall,
      AVG(ag.recommendation) as avg_recommendation
    FROM avaliacao_geral ag
    JOIN avaliacoes a ON ag.avaliacao_id = a.id
    WHERE a.encontro_id = ?
  `).get(encontroId);

  const interestePastoral = db.prepare(`
    SELECT
      p.interest,
      COUNT(*) as count
    FROM pastoral p
    JOIN avaliacoes a ON p.avaliacao_id = a.id
    WHERE a.encontro_id = ?
    GROUP BY p.interest
  `).all(encontroId);

  return {
    totalAvaliacoes: totalAvaliacoes.total,
    mediaPreEncontro,
    mediaPalestras,
    mediaAmbientes,
    mediaRefeicoes,
    mediaMusicas,
    mediaEquipe,
    mediaAvaliacaoGeral,
    interestePastoral,
  };
}

// ==================== FUNÇÕES DE GERENCIAMENTO DE AVALIAÇÕES ====================

export function insertAvaliacao(data: EvaluationData): number {
  const transaction = db.transaction(() => {
    // Inserir informações básicas
    const insertAvaliacao = db.prepare(`
      INSERT INTO avaliacoes (encontro_id, couple_name, encounter_date)
      VALUES (?, ?, ?)
    `);
    const result = insertAvaliacao.run(
      data.encontroId || null,
      data.basicInfo.coupleName || null,
      data.basicInfo.encounterDate || null
    );
    const avaliacaoId = result.lastInsertRowid as number;

    // Inserir pré-encontro
    db.prepare(`
      INSERT INTO pre_encontro (avaliacao_id, communication_clarity, registration_ease, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.preEncontro.communicationClarity,
      data.preEncontro.registrationEase,
      data.preEncontro.comments || null
    );

    // Inserir palestras
    db.prepare(`
      INSERT INTO palestras (avaliacao_id, relevance, clarity, duration, comments)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.palestras.relevance,
      data.duranteEncontro.palestras.clarity,
      data.duranteEncontro.palestras.duration,
      data.duranteEncontro.palestras.comments || null
    );

    // Inserir ambientes
    db.prepare(`
      INSERT INTO ambientes (avaliacao_id, comfort, cleanliness, decoration, comments)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.ambientes.comfort,
      data.duranteEncontro.ambientes.cleanliness,
      data.duranteEncontro.ambientes.decoration,
      data.duranteEncontro.ambientes.comments || null
    );

    // Inserir refeições
    db.prepare(`
      INSERT INTO refeicoes (avaliacao_id, quality, organization, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.refeicoes.quality,
      data.duranteEncontro.refeicoes.organization,
      data.duranteEncontro.refeicoes.comments || null
    );

    // Inserir músicas
    db.prepare(`
      INSERT INTO musicas (avaliacao_id, suitability, quality, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.musicas.suitability,
      data.duranteEncontro.musicas.quality,
      data.duranteEncontro.musicas.comments || null
    );

    // Inserir equipe
    db.prepare(`
      INSERT INTO equipe (avaliacao_id, availability, organization, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.equipe.availability,
      data.duranteEncontro.equipe.organization,
      data.duranteEncontro.equipe.comments || null
    );

    // Inserir avaliação geral
    db.prepare(`
      INSERT INTO avaliacao_geral (avaliacao_id, expectations, overall_rating, recommendation, comments)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.posEncontro.geral.expectations,
      data.posEncontro.geral.overallRating,
      data.posEncontro.geral.recommendation,
      data.posEncontro.geral.comments || null
    );

    // Inserir pastoral
    db.prepare(`
      INSERT INTO pastoral (avaliacao_id, interest, contact_info)
      VALUES (?, ?, ?)
    `).run(
      avaliacaoId,
      data.posEncontro.pastoral.interest || '',
      data.posEncontro.pastoral.contactInfo || null
    );

    // Inserir mensagem final
    db.prepare(`
      INSERT INTO mensagem_final (avaliacao_id, message)
      VALUES (?, ?)
    `).run(
      avaliacaoId,
      data.posEncontro.finalMessage || null
    );

    return avaliacaoId;
  });

  return transaction();
}

export function getAllAvaliacoes(pastoralId?: number) {
  if (pastoralId) {
    const avaliacoes = db.prepare(`
      SELECT a.* FROM avaliacoes a
      JOIN encontros e ON a.encontro_id = e.id
      WHERE e.pastoral_id = ?
      ORDER BY a.created_at DESC
    `).all(pastoralId);
    return avaliacoes;
  }

  const avaliacoes = db.prepare('SELECT * FROM avaliacoes ORDER BY created_at DESC').all();
  return avaliacoes;
}

export function getAvaliacaoById(id: number, pastoralId?: number) {
  let avaliacao;

  if (pastoralId) {
    avaliacao = db.prepare(`
      SELECT a.* FROM avaliacoes a
      JOIN encontros e ON a.encontro_id = e.id
      WHERE a.id = ? AND e.pastoral_id = ?
    `).get(id, pastoralId);
  } else {
    avaliacao = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(id);
  }

  if (!avaliacao) return null;

  const preEncontro = db.prepare('SELECT * FROM pre_encontro WHERE avaliacao_id = ?').get(id);
  const palestras = db.prepare('SELECT * FROM palestras WHERE avaliacao_id = ?').get(id);
  const ambientes = db.prepare('SELECT * FROM ambientes WHERE avaliacao_id = ?').get(id);
  const refeicoes = db.prepare('SELECT * FROM refeicoes WHERE avaliacao_id = ?').get(id);
  const musicas = db.prepare('SELECT * FROM musicas WHERE avaliacao_id = ?').get(id);
  const equipe = db.prepare('SELECT * FROM equipe WHERE avaliacao_id = ?').get(id);
  const avaliacaoGeral = db.prepare('SELECT * FROM avaliacao_geral WHERE avaliacao_id = ?').get(id);
  const pastoral = db.prepare('SELECT * FROM pastoral WHERE avaliacao_id = ?').get(id);
  const mensagemFinal = db.prepare('SELECT * FROM mensagem_final WHERE avaliacao_id = ?').get(id);

  return {
    avaliacao,
    preEncontro,
    palestras,
    ambientes,
    refeicoes,
    musicas,
    equipe,
    avaliacaoGeral,
    pastoral,
    mensagemFinal,
  };
}

export function getEstatisticas(pastoralId?: number) {
  const whereClause = pastoralId ? 'WHERE e.pastoral_id = ?' : '';
  const params = pastoralId ? [pastoralId] : [];

  const totalAvaliacoes = pastoralId
    ? db.prepare(`
        SELECT COUNT(*) as total FROM avaliacoes a
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId) as { total: number }
    : db.prepare('SELECT COUNT(*) as total FROM avaliacoes').get() as { total: number };

  const mediaPreEncontro = pastoralId
    ? db.prepare(`
        SELECT
          AVG(pe.communication_clarity) as avg_communication,
          AVG(pe.registration_ease) as avg_registration
        FROM pre_encontro pe
        JOIN avaliacoes a ON pe.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId)
    : db.prepare(`
        SELECT
          AVG(communication_clarity) as avg_communication,
          AVG(registration_ease) as avg_registration
        FROM pre_encontro
      `).get();

  const mediaPalestras = pastoralId
    ? db.prepare(`
        SELECT
          AVG(p.relevance) as avg_relevance,
          AVG(p.clarity) as avg_clarity,
          AVG(p.duration) as avg_duration
        FROM palestras p
        JOIN avaliacoes a ON p.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId)
    : db.prepare(`
        SELECT
          AVG(relevance) as avg_relevance,
          AVG(clarity) as avg_clarity,
          AVG(duration) as avg_duration
        FROM palestras
      `).get();

  const mediaAmbientes = pastoralId
    ? db.prepare(`
        SELECT
          AVG(amb.comfort) as avg_comfort,
          AVG(amb.cleanliness) as avg_cleanliness,
          AVG(amb.decoration) as avg_decoration
        FROM ambientes amb
        JOIN avaliacoes a ON amb.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId)
    : db.prepare(`
        SELECT
          AVG(comfort) as avg_comfort,
          AVG(cleanliness) as avg_cleanliness,
          AVG(decoration) as avg_decoration
        FROM ambientes
      `).get();

  const mediaRefeicoes = pastoralId
    ? db.prepare(`
        SELECT
          AVG(r.quality) as avg_quality,
          AVG(r.organization) as avg_organization
        FROM refeicoes r
        JOIN avaliacoes a ON r.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId)
    : db.prepare(`
        SELECT
          AVG(quality) as avg_quality,
          AVG(organization) as avg_organization
        FROM refeicoes
      `).get();

  const mediaMusicas = pastoralId
    ? db.prepare(`
        SELECT
          AVG(m.suitability) as avg_suitability,
          AVG(m.quality) as avg_quality
        FROM musicas m
        JOIN avaliacoes a ON m.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId)
    : db.prepare(`
        SELECT
          AVG(suitability) as avg_suitability,
          AVG(quality) as avg_quality
        FROM musicas
      `).get();

  const mediaEquipe = pastoralId
    ? db.prepare(`
        SELECT
          AVG(eq.availability) as avg_availability,
          AVG(eq.organization) as avg_organization
        FROM equipe eq
        JOIN avaliacoes a ON eq.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId)
    : db.prepare(`
        SELECT
          AVG(availability) as avg_availability,
          AVG(organization) as avg_organization
        FROM equipe
      `).get();

  const mediaAvaliacaoGeral = pastoralId
    ? db.prepare(`
        SELECT
          AVG(ag.expectations) as avg_expectations,
          AVG(ag.overall_rating) as avg_overall,
          AVG(ag.recommendation) as avg_recommendation
        FROM avaliacao_geral ag
        JOIN avaliacoes a ON ag.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
      `).get(pastoralId)
    : db.prepare(`
        SELECT
          AVG(expectations) as avg_expectations,
          AVG(overall_rating) as avg_overall,
          AVG(recommendation) as avg_recommendation
        FROM avaliacao_geral
      `).get();

  const interestePastoral = pastoralId
    ? db.prepare(`
        SELECT
          p.interest,
          COUNT(*) as count
        FROM pastoral p
        JOIN avaliacoes a ON p.avaliacao_id = a.id
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
        GROUP BY p.interest
      `).all(pastoralId)
    : db.prepare(`
        SELECT
          interest,
          COUNT(*) as count
        FROM pastoral
        GROUP BY interest
      `).all();

  return {
    totalAvaliacoes: totalAvaliacoes.total,
    mediaPreEncontro,
    mediaPalestras,
    mediaAmbientes,
    mediaRefeicoes,
    mediaMusicas,
    mediaEquipe,
    mediaAvaliacaoGeral,
    interestePastoral,
  };
}

export function getInteressadosPastoral(pastoralId?: number) {
  const whereClause = pastoralId
    ? 'WHERE p.interest IN (\'sim\', \'talvez\') AND p.contact_info IS NOT NULL AND p.contact_info != \'\' AND e.pastoral_id = ?'
    : 'WHERE p.interest IN (\'sim\', \'talvez\') AND p.contact_info IS NOT NULL AND p.contact_info != \'\'';

  const query = `
    SELECT
      a.id as avaliacao_id,
      a.couple_name as nome_casal,
      a.encounter_date as data_encontro,
      a.created_at as data_avaliacao,
      p.interest as nivel_interesse,
      p.contact_info as contato,
      ag.overall_rating as nota_geral
    FROM avaliacoes a
    JOIN encontros e ON a.encontro_id = e.id
    JOIN pastoral p ON a.id = p.avaliacao_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    ${whereClause}
    ORDER BY
      CASE p.interest
        WHEN 'sim' THEN 1
        WHEN 'talvez' THEN 2
      END,
      a.created_at DESC
  `;

  const interessados = pastoralId
    ? db.prepare(query).all(pastoralId)
    : db.prepare(query).all();

  return interessados;
}

export function getTodosContatos(pastoralId?: number) {
  const whereClause = pastoralId
    ? 'WHERE p.contact_info IS NOT NULL AND p.contact_info != \'\' AND e.pastoral_id = ?'
    : 'WHERE p.contact_info IS NOT NULL AND p.contact_info != \'\'';

  const query = `
    SELECT
      a.id as avaliacao_id,
      a.couple_name as nome_casal,
      a.encounter_date as data_encontro,
      a.created_at as data_avaliacao,
      p.interest as nivel_interesse,
      p.contact_info as contato,
      ag.overall_rating as nota_geral,
      ag.recommendation as recomendacao
    FROM avaliacoes a
    JOIN encontros e ON a.encontro_id = e.id
    JOIN pastoral p ON a.id = p.avaliacao_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    ${whereClause}
    ORDER BY a.created_at DESC
  `;

  const contatos = pastoralId
    ? db.prepare(query).all(pastoralId)
    : db.prepare(query).all();

  return contatos;
}

export function getAllAvaliacoesDetalhadas(pastoralId?: number) {
  const avaliacoes = pastoralId
    ? db.prepare(`
        SELECT a.* FROM avaliacoes a
        JOIN encontros e ON a.encontro_id = e.id
        WHERE e.pastoral_id = ?
        ORDER BY a.created_at DESC
      `).all(pastoralId) as any[]
    : db.prepare('SELECT * FROM avaliacoes ORDER BY created_at DESC').all() as any[];

  return avaliacoes.map((avaliacao) => {
    const id = avaliacao.id;

    const preEncontro = db.prepare('SELECT * FROM pre_encontro WHERE avaliacao_id = ?').get(id);
    const palestras = db.prepare('SELECT * FROM palestras WHERE avaliacao_id = ?').get(id);
    const ambientes = db.prepare('SELECT * FROM ambientes WHERE avaliacao_id = ?').get(id);
    const refeicoes = db.prepare('SELECT * FROM refeicoes WHERE avaliacao_id = ?').get(id);
    const musicas = db.prepare('SELECT * FROM musicas WHERE avaliacao_id = ?').get(id);
    const equipe = db.prepare('SELECT * FROM equipe WHERE avaliacao_id = ?').get(id);
    const avaliacaoGeral = db.prepare('SELECT * FROM avaliacao_geral WHERE avaliacao_id = ?').get(id);
    const pastoral = db.prepare('SELECT * FROM pastoral WHERE avaliacao_id = ?').get(id);
    const mensagemFinal = db.prepare('SELECT * FROM mensagem_final WHERE avaliacao_id = ?').get(id);

    return {
      avaliacao,
      preEncontro,
      palestras,
      ambientes,
      refeicoes,
      musicas,
      equipe,
      avaliacaoGeral,
      pastoral,
      mensagemFinal,
    };
  });
}

export function getAvaliacoesByEncontro(encontroId: number) {
  const avaliacoes = db.prepare('SELECT * FROM avaliacoes WHERE encontro_id = ? ORDER BY created_at DESC').all(encontroId);
  return avaliacoes;
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
  revoked_at?: string | null;
  ip_address?: string;
  user_agent?: string;
}

export function createRefreshToken(refreshToken: RefreshToken): number {
  const result = db.prepare(`
    INSERT INTO refresh_tokens (user_id, token, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    refreshToken.user_id,
    refreshToken.token,
    refreshToken.expires_at,
    refreshToken.ip_address,
    refreshToken.user_agent
  );

  return result.lastInsertRowid as number;
}

export function getRefreshToken(token: string): RefreshToken | undefined {
  return db.prepare(`
    SELECT * FROM refresh_tokens
    WHERE token = ? AND revoked_at IS NULL
  `).get(token) as RefreshToken | undefined;
}

export function revokeRefreshToken(token: string): void {
  db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE token = ?
  `).run(token);
}

export function revokeAllUserRefreshTokens(userId: number): void {
  db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(userId);
}

export function cleanupExpiredRefreshTokens(): void {
  db.prepare(`
    DELETE FROM refresh_tokens
    WHERE datetime(expires_at) < datetime('now')
  `).run();
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
  used_at?: string | null;
  ip_address?: string;
}

export function createPasswordResetToken(resetToken: PasswordResetToken): number {
  // Invalidar tokens anteriores do mesmo usuário
  db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND used_at IS NULL
  `).run(resetToken.user_id);

  const result = db.prepare(`
    INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address)
    VALUES (?, ?, ?, ?)
  `).run(
    resetToken.user_id,
    resetToken.token,
    resetToken.expires_at,
    resetToken.ip_address
  );

  return result.lastInsertRowid as number;
}

export function getPasswordResetToken(token: string): PasswordResetToken | undefined {
  return db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')
  `).get(token) as PasswordResetToken | undefined;
}

export function markPasswordResetTokenAsUsed(token: string): void {
  db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = CURRENT_TIMESTAMP
    WHERE token = ?
  `).run(token);
}

export function cleanupExpiredPasswordResetTokens(): void {
  db.prepare(`
    DELETE FROM password_reset_tokens
    WHERE datetime(expires_at) < datetime('now')
    OR used_at IS NOT NULL
  `).run();
}

export default db;
