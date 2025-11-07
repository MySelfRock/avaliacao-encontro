import express from 'express';
import cors from 'cors';
import path from 'path';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  initializeDatabase,
  migrateDatabase,
  seedSuperAdmin,
  insertAvaliacao,
  getAllAvaliacoes,
  getAvaliacaoById,
  getEstatisticas,
  getInteressadosPastoral,
  getTodosContatos,
  getPastoralBySubdomain,
  getPastoralById,
  getAllPastorais,
  createPastoral,
  updatePastoral,
  updatePastoralConfig,
  deletePastoral,
  blockPastoral,
  unblockPastoral,
  createEncontro,
  updateEncontro,
  getAllEncontros,
  getAllEncontrosWithStats,
  getEncontroById,
  getEncontroByCodigo,
  deleteEncontro,
  getEstatisticasEncontro,
  getAvaliacoesByEncontro,
  // Funções de usuários
  createUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  getUsersByPastoral,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  // Funções de auditoria
  createAuditLog,
  getAuditLogs,
  type User,
  type AuditLog
} from './database';
import type { EvaluationData, Encontro } from '../types';
import {
  authenticateUser,
  authenticateUserWithRefresh,
  verifyToken,
  getUserFromToken,
  hashPassword,
  validatePassword,
  validateEmail,
  refreshAccessToken,
  logoutUser,
  initiatePasswordReset,
  resetPasswordWithToken,
  validatePasswordResetToken
} from './auth';

// Carregar variáveis de ambiente
dotenv.config();

// Estender o tipo Request do Express para incluir a pastoral e o user
declare global {
  namespace Express {
    interface Request {
      pastoral?: any;
      user?: {
        userId: number;
        email: string;
        role: 'super_admin' | 'pastoral_admin';
        pastoralId?: number | null;
      };
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// ========================================
// SEGURANÇA - HELMET
// ========================================
// Helmet ajuda a proteger contra vulnerabilidades web conhecidas
app.use(helmet({
  // Content Security Policy - define fontes confiáveis de conteúdo
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Permite CSS inline (necessário para React)
      scriptSrc: ["'self'", "'unsafe-inline'"], // Permite JS inline
      imgSrc: ["'self'", "data:", "https:"], // Permite imagens de qualquer HTTPS
      connectSrc: ["'self'"], // Permite requisições AJAX apenas para mesma origem
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Outras proteções do Helmet
  crossOriginEmbedderPolicy: false, // Desabilitar para permitir recursos externos
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permite recursos cross-origin
}));

// ========================================
// SEGURANÇA - RATE LIMITING
// ========================================

// Rate Limiter Geral - todas as requisições
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requisições por IP a cada 15 minutos
  message: {
    error: 'Muitas requisições',
    message: 'Você excedeu o limite de requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
});

// Rate Limiter para POST/PUT/DELETE - operações de escrita
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // Máximo 30 operações de escrita a cada 15 minutos
  message: {
    error: 'Muitas operações de escrita',
    message: 'Você excedeu o limite de operações. Tente novamente em alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter para rotas Admin - mais restritivo
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // Máximo 50 requisições admin a cada 15 minutos
  message: {
    error: 'Muitas requisições administrativas',
    message: 'Limite de operações administrativas excedido. Tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar rate limiter geral a todas as rotas da API
app.use('/api/', generalLimiter);

// ========================================
// CORS COM CONTROLE DE ORIGEM POR SUBDOMÍNIO
// ========================================

// Configuração dinâmica de CORS baseada em subdomínios cadastrados
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Em desenvolvimento, permitir localhost
    if (!isProduction) {
      const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
      if (localhostPattern.test(origin)) {
        return callback(null, true);
      }
    }

    // Em produção, validar origem baseada nos subdomínios cadastrados
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      // Extrair subdomínio da origem
      const parts = hostname.split('.');

      // Se for um subdomínio (ex: saobenedito.avaliacoes.com)
      if (parts.length > 2) {
        const subdomain = parts[0];

        // Verificar se existe pastoral com este subdomínio
        const pastoral = getPastoralBySubdomain(subdomain);

        if (pastoral) {
          console.log(`✅ CORS permitido para origem: ${origin} (pastoral: ${pastoral.name})`);
          return callback(null, true);
        }
      }

      // Se chegou aqui, a origem não é permitida
      console.warn(`⚠️  CORS bloqueado para origem não autorizada: ${origin}`);
      callback(new Error('Origem não permitida por CORS'));
    } catch (error) {
      console.error('❌ Erro ao validar origem CORS:', error);
      callback(new Error('Origem inválida'));
    }
  },
  credentials: true, // Permite envio de cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Servir arquivos estáticos do build do frontend em produção
if (isProduction) {
  const staticPath = path.join(__dirname, '../../');
  // Servir arquivos estáticos (JS, CSS, imagens, etc.)
  // index: false - não serve index.html automaticamente (faremos manualmente depois)
  app.use(express.static(staticPath, { index: false }));
}

// Inicializar e migrar banco de dados
initializeDatabase();
migrateDatabase();
seedSuperAdmin(); // Criar super admin padrão se não existir

// Middleware Multi-Tenant
// Detecta a pastoral pelo subdomínio e injeta no request
app.use((req, res, next) => {
  // Rotas de admin e health não precisam de pastoral
  if (req.path.startsWith('/api/admin') || req.path === '/api/health') {
    return next();
  }

  const host = req.hostname;
  console.log('🌐 Hostname:', host);

  // Em desenvolvimento ou localhost, usar 'default'
  // Em produção, extrair subdomínio (ex: saobenedito.avaliacoes.com -> saobenedito)
  let subdomain = 'default';

  if (host && host !== 'localhost' && !host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    const parts = host.split('.');
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  console.log('🏛️  Subdomínio detectado:', subdomain);

  const pastoral = getPastoralBySubdomain(subdomain);

  if (!pastoral) {
    console.warn(`⚠️  Pastoral não encontrada para subdomínio: ${subdomain}`);
    return res.status(404).json({
      error: 'Pastoral não encontrada',
      message: `Nenhuma pastoral cadastrada para o subdomínio: ${subdomain}`
    });
  }

  console.log('✅ Pastoral encontrada:', pastoral.name);
  req.pastoral = pastoral;
  next();
});

// ========================================
// MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
// ========================================

/**
 * Middleware de Autenticação JWT
 * Valida o token JWT e injeta os dados do usuário em req.user
 */
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    console.warn('🔒 Tentativa de acesso sem token');
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Token de autenticação não fornecido'
    });
  }

  const payload = verifyToken(token);

  if (!payload) {
    console.warn('🔒 Tentativa de acesso com token inválido');
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Token inválido ou expirado'
    });
  }

  // Verificar se usuário está ativo
  const user = getUserById(payload.userId);

  if (!user || !user.is_active) {
    console.warn(`🔒 Usuário inativo tentou acessar: ${payload.email}`);
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Usuário desativado. Entre em contato com o administrador.'
    });
  }

  // Injetar dados do usuário no request
  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    pastoralId: payload.pastoralId
  };

  next();
};

/**
 * Middleware para verificar roles permitidas
 * Uso: requireRole('super_admin') ou requireRole('super_admin', 'pastoral_admin')
 */
const requireRole = (...allowedRoles: Array<'super_admin' | 'pastoral_admin'>) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado',
        message: 'Usuário não autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`🔒 Acesso negado: ${req.user.email} (${req.user.role}) tentou acessar rota de ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar se usuário pode acessar recurso da pastoral
 * Super admin pode acessar tudo
 * Pastoral admin só pode acessar sua própria pastoral
 */
const requireOwnPastoral = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Usuário não autenticado'
    });
  }

  // Super admin pode acessar qualquer pastoral
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Pastoral admin só pode acessar sua própria pastoral
  if (req.user.role === 'pastoral_admin') {
    if (!req.pastoral || req.pastoral.id !== req.user.pastoralId) {
      console.warn(`🔒 ${req.user.email} tentou acessar pastoral diferente da sua`);
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar esta pastoral'
      });
    }
  }

  next();
};

/**
 * Middleware para verificar se a pastoral está ativa
 */
const checkPastoralActive = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Super admin não é bloqueado
  if (req.user?.role === 'super_admin') {
    return next();
  }

  // Verificar se pastoral está ativa
  if (req.pastoral && !req.pastoral.is_active) {
    console.warn(`🔒 Tentativa de acesso a pastoral bloqueada: ${req.pastoral.name}`);
    return res.status(403).json({
      error: 'Pastoral bloqueada',
      message: req.pastoral.blocked_reason || 'Esta pastoral está temporariamente desabilitada. Entre em contato com o suporte.',
      blockedAt: req.pastoral.blocked_at
    });
  }

  next();
};

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API de Avaliações - Pastoral Familiar',
    timestamp: new Date().toISOString()
  });
});

// ========================================
// ROTAS DE AUTENTICAÇÃO
// ========================================

// POST /api/auth/login - Login de usuários
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    // Validações
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    // Autenticar usuário com refresh token
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = authenticateUserWithRefresh(email, password, ipAddress, userAgent);

    if (!result.success) {
      // Log de tentativa de login falha
      console.warn(`⚠️  Tentativa de login falhou: ${email}`);

      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    // Log de sucesso
    console.log(`✅ Login bem-sucedido: ${result.user?.email} (${result.user?.role})`);

    // Criar log de auditoria
    if (result.user) {
      createAuditLog({
        user_id: result.user.id,
        pastoral_id: result.user.pastoralId || null,
        action: 'login',
        resource_type: 'auth',
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// GET /api/auth/me - Obter dados do usuário logado
app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    const user = getUserFromToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }

    // Retornar dados do usuário (sem password_hash)
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        pastoralId: user.pastoral_id,
        isActive: user.is_active,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    console.error('❌ Erro ao obter usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// POST /api/auth/logout - Logout com revogação de refresh token
app.post('/api/auth/logout', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const { refreshToken } = req.body;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Revogar refresh token se fornecido
        if (refreshToken) {
          logoutUser(refreshToken);
          console.log(`🔒 Refresh token revogado para: ${payload.email}`);
        }

        // Criar log de auditoria
        createAuditLog({
          user_id: payload.userId,
          pastoral_id: payload.pastoralId || null,
          action: 'logout',
          resource_type: 'auth',
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.headers['user-agent']
        });

        console.log(`✅ Logout: ${payload.email}`);
      }
    }

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// POST /api/auth/refresh - Renovar access token com refresh token
app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token não fornecido'
      });
    }

    // Renovar access token
    const result = refreshAccessToken(refreshToken);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    console.log(`🔄 Token renovado para: ${result.user?.email}`);

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao renovar token:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// POST /api/auth/forgot-password - Solicitar reset de senha
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = initiatePasswordReset(email, ipAddress);

    console.log(`📧 Reset de senha solicitado para: ${email}`);

    // Sempre retornar sucesso para prevenir enumeration attacks
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Erro ao solicitar reset de senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// POST /api/auth/reset-password - Resetar senha com token
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token e nova senha são obrigatórios'
      });
    }

    // Resetar senha
    const result = resetPasswordWithToken(token, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    console.log(`🔐 Senha resetada com sucesso`);

    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no servidor'
    });
  }
});

// GET /api/auth/validate-reset-token - Validar token de reset
app.get('/api/auth/validate-reset-token', (req, res) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: 'Token não fornecido'
      });
    }

    const validation = validatePasswordResetToken(token);

    res.json(validation);
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    res.status(500).json({
      valid: false,
      message: 'Erro interno no servidor'
    });
  }
});

// ========================================
// ROTAS DE GERENCIAMENTO DE USUÁRIOS (SUPER ADMIN)
// ========================================

// POST /api/admin/users - Criar novo usuário (admin de pastoral)
app.post('/api/admin/users',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
    try {
      const { email, password, name, role, pastoralId } = req.body;

      // Validações
      if (!email || !password || !name || !role) {
        return res.status(400).json({
          success: false,
          message: 'Email, senha, nome e role são obrigatórios'
        });
      }

      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }

      if (role !== 'super_admin' && role !== 'pastoral_admin') {
        return res.status(400).json({
          success: false,
          message: 'Role deve ser "super_admin" ou "pastoral_admin"'
        });
      }

      // Se é pastoral_admin, precisa de pastoralId
      if (role === 'pastoral_admin' && !pastoralId) {
        return res.status(400).json({
          success: false,
          message: 'pastoralId é obrigatório para pastoral_admin'
        });
      }

      // Verificar se email já existe
      const existingUser = getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Já existe um usuário com este email'
        });
      }

      // Verificar se pastoral existe (se for pastoral_admin)
      if (role === 'pastoral_admin') {
        const pastoral = getPastoralById(pastoralId);
        if (!pastoral) {
          return res.status(404).json({
            success: false,
            message: 'Pastoral não encontrada'
          });
        }
      }

      // Criar usuário
      const passwordHash = hashPassword(password);
      const userId = createUser({
        email,
        password_hash: passwordHash,
        name,
        role,
        pastoral_id: role === 'pastoral_admin' ? pastoralId : null,
        is_active: true
      });

      // Log de auditoria
      createAuditLog({
        user_id: req.user!.userId,
        pastoral_id: role === 'pastoral_admin' ? pastoralId : null,
        action: 'create_user',
        resource_type: 'user',
        resource_id: userId,
        details: JSON.stringify({ email, name, role }),
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      console.log(`✅ Novo usuário criado: ${email} (${role}) por ${req.user!.email}`);

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        userId
      });
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  }
);

// GET /api/admin/users - Listar todos os usuários
app.get('/api/admin/users',
  authMiddleware,
  requireRole('super_admin'),
  (req, res) => {
    try {
      const users = getAllUsers();

      // Remover password_hash de todos os usuários
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        pastoralId: user.pastoral_id,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }));

      res.json({
        success: true,
        total: safeUsers.length,
        users: safeUsers
      });
    } catch (error) {
      console.error('❌ Erro ao listar usuários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  }
);

// PUT /api/admin/users/:id - Atualizar usuário
app.put('/api/admin/users/:id',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, isActive, pastoralId } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuário inválido'
        });
      }

      const user = getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Atualizar usuário
      updateUser(userId, {
        name: name !== undefined ? name : user.name,
        email: email !== undefined ? email : user.email,
        is_active: isActive !== undefined ? isActive : user.is_active,
        pastoral_id: pastoralId !== undefined ? pastoralId : user.pastoral_id
      });

      // Log de auditoria
      createAuditLog({
        user_id: req.user!.userId,
        pastoral_id: user.pastoral_id || null,
        action: 'update_user',
        resource_type: 'user',
        resource_id: userId,
        details: JSON.stringify({ name, email, isActive }),
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      console.log(`✅ Usuário ${userId} atualizado por ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Usuário atualizado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  }
);

// PUT /api/admin/pastorais/:id/block - Bloquear pastoral
app.put('/api/admin/pastorais/:id/block',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
    try {
      const pastoralId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(pastoralId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de pastoral inválido'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Motivo do bloqueio é obrigatório'
        });
      }

      const pastoral = getPastoralById(pastoralId);
      if (!pastoral) {
        return res.status(404).json({
          success: false,
          message: 'Pastoral não encontrada'
        });
      }

      blockPastoral(pastoralId, reason);

      // Log de auditoria
      createAuditLog({
        user_id: req.user!.userId,
        pastoral_id: pastoralId,
        action: 'block_pastoral',
        resource_type: 'pastoral',
        resource_id: pastoralId,
        details: JSON.stringify({ reason }),
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      console.log(`✅ Pastoral ${pastoral.name} bloqueada por ${req.user!.email}: ${reason}`);

      res.json({
        success: true,
        message: 'Pastoral bloqueada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao bloquear pastoral:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  }
);

// PUT /api/admin/pastorais/:id/unblock - Desbloquear pastoral
app.put('/api/admin/pastorais/:id/unblock',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
    try {
      const pastoralId = parseInt(req.params.id);

      if (isNaN(pastoralId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de pastoral inválido'
        });
      }

      const pastoral = getPastoralById(pastoralId);
      if (!pastoral) {
        return res.status(404).json({
          success: false,
          message: 'Pastoral não encontrada'
        });
      }

      unblockPastoral(pastoralId);

      // Log de auditoria
      createAuditLog({
        user_id: req.user!.userId,
        pastoral_id: pastoralId,
        action: 'unblock_pastoral',
        resource_type: 'pastoral',
        resource_id: pastoralId,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      console.log(`✅ Pastoral ${pastoral.name} desbloqueada por ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Pastoral desbloqueada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao desbloquear pastoral:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  }
);

// GET /api/admin/audit-logs - Ver logs de auditoria
app.get('/api/admin/audit-logs',
  authMiddleware,
  requireRole('super_admin'),
  (req, res) => {
    try {
      const { userId, pastoralId, limit = 100, offset = 0 } = req.query;

      const logs = getAuditLogs({
        userId: userId ? parseInt(userId as string) : undefined,
        pastoralId: pastoralId ? parseInt(pastoralId as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        total: logs.length,
        logs
      });
    } catch (error) {
      console.error('❌ Erro ao buscar logs de auditoria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  }
);

// PUT /api/auth/change-password - Trocar própria senha
app.put('/api/auth/change-password',
  authMiddleware,
  (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senha atual e nova senha são obrigatórias'
        });
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }

      const user = getUserById(req.user!.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Verificar senha atual
      const { verifyPassword } = require('./auth');
      if (!verifyPassword(currentPassword, user.password_hash!)) {
        return res.status(401).json({
          success: false,
          message: 'Senha atual incorreta'
        });
      }

      // Atualizar senha
      const newPasswordHash = hashPassword(newPassword);
      updateUser(req.user!.userId, {
        password_hash: newPasswordHash
      });

      // Log de auditoria
      createAuditLog({
        user_id: req.user!.userId,
        pastoral_id: req.user!.pastoralId || null,
        action: 'change_password',
        resource_type: 'user',
        resource_id: req.user!.userId,
        ip_address: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      console.log(`✅ ${req.user!.email} trocou sua senha`);

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao trocar senha:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno no servidor'
      });
    }
  }
);

// POST - Criar nova avaliação
app.post('/api/avaliacoes', writeLimiter, (req, res) => {
  try {
    const data: EvaluationData = req.body;

    // Validação básica
    if (!data) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Os dados da avaliação são obrigatórios'
      });
    }

    const avaliacaoId = insertAvaliacao(data);

    console.log(`✅ Nova avaliação criada com ID: ${avaliacaoId}`);
    console.log(`   Casal: ${data.basicInfo.coupleName || 'Anônimo'}`);
    console.log(`   Data do encontro: ${data.basicInfo.encounterDate || 'Não informada'}`);
    console.log(`   Nota geral: ${data.posEncontro.geral.overallRating} estrelas`);

    res.status(201).json({
      success: true,
      message: 'Avaliação salva com sucesso!',
      id: avaliacaoId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao salvar avaliação:', error);
    res.status(500).json({
      error: 'Erro ao salvar avaliação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Listar todas as avaliações (resumo)
app.get('/api/avaliacoes',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const avaliacoes = getAllAvaliacoes(pastoralId);

    res.json({
      success: true,
      total: avaliacoes.length,
      data: avaliacoes,
      pastoral: req.pastoral?.name
    });
  } catch (error) {
    console.error('❌ Erro ao buscar avaliações:', error);
    res.status(500).json({
      error: 'Erro ao buscar avaliações',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar todas as avaliações detalhadas (para relatório completo)
// IMPORTANTE: Este endpoint deve vir ANTES de /api/avaliacoes/:id
// Comentado temporariamente - função não implementada no database.ts
// app.get('/api/avaliacoes/detalhadas', (req, res) => {
//   try {
//     const avaliacoes = getAllAvaliacoesDetalhadas();
//     console.log(`📋 Buscando avaliações detalhadas: ${avaliacoes.length} encontrada(s)`);
//     res.json({
//       success: true,
//       total: avaliacoes.length,
//       data: avaliacoes,
//       message: `${avaliacoes.length} avaliação(ões) encontrada(s)`
//     });
//   } catch (error) {
//     console.error('❌ Erro ao buscar avaliações detalhadas:', error);
//     res.status(500).json({
//       error: 'Erro ao buscar avaliações detalhadas',
//       message: error instanceof Error ? error.message : 'Erro desconhecido'
//     });
//   }
// });

// GET - Buscar avaliação específica por ID (completa)
app.get('/api/avaliacoes/:id',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pastoralId = req.pastoral?.id;

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const avaliacao = getAvaliacaoById(id, pastoralId);

    if (!avaliacao) {
      return res.status(404).json({
        error: 'Avaliação não encontrada',
        message: `Nenhuma avaliação encontrada com ID ${id}`
      });
    }

    res.json({
      success: true,
      data: avaliacao
    });
  } catch (error) {
    console.error('❌ Erro ao buscar avaliação:', error);
    res.status(500).json({
      error: 'Erro ao buscar avaliação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Obter estatísticas das avaliações
app.get('/api/estatisticas',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const stats = getEstatisticas(pastoralId);

    res.json({
      success: true,
      data: stats,
      pastoral: req.pastoral?.name
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar interessados na Pastoral Familiar (com contato)
app.get('/api/pastoral/interessados',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const interessados = getInteressadosPastoral(pastoralId);

    console.log(`📋 Buscando interessados na Pastoral: ${interessados.length} encontrado(s)`);

    res.json({
      success: true,
      total: interessados.length,
      data: interessados,
      message: `${interessados.length} pessoa(s) interessada(s) encontrada(s)`
    });
  } catch (error) {
    console.error('❌ Erro ao buscar interessados:', error);
    res.status(500).json({
      error: 'Erro ao buscar interessados',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar todos os contatos (independente do interesse)
app.get('/api/contatos',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const contatos = getTodosContatos(pastoralId);

    console.log(`📞 Buscando todos os contatos: ${contatos.length} encontrado(s)`);

    res.json({
      success: true,
      total: contatos.length,
      data: contatos,
      message: `${contatos.length} contato(s) encontrado(s)`
    });
  } catch (error) {
    console.error('❌ Erro ao buscar contatos:', error);
    res.status(500).json({
      error: 'Erro ao buscar contatos',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ========================================
// ROTAS DE GERENCIAMENTO DE ENCONTROS
// ========================================

// POST - Criar novo encontro
app.post('/api/encontros',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  writeLimiter,
  (req, res) => {
  try {
    const encontro: Encontro = req.body;
    const pastoralId = req.pastoral?.id;

    // Validação básica
    if (!encontro.nome || !encontro.data_inicio || !encontro.data_fim) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Nome, data de início e data de fim são obrigatórios'
      });
    }

    if (!pastoralId) {
      return res.status(400).json({
        error: 'Pastoral não identificada',
        message: 'Não foi possível identificar a pastoral'
      });
    }

    const encontroId = createEncontro(encontro, pastoralId);
    const novoEncontro = getEncontroById(encontroId, pastoralId) as Encontro | undefined;

    console.log(`✅ Novo encontro criado com ID: ${encontroId}`);
    console.log(`   Nome: ${encontro.nome}`);
    console.log(`   Pastoral: ${req.pastoral.name}`);
    console.log(`   Código de acesso: ${novoEncontro?.codigo_acesso}`);

    res.status(201).json({
      success: true,
      message: 'Encontro criado com sucesso!',
      data: novoEncontro
    });
  } catch (error) {
    console.error('❌ Erro ao criar encontro:', error);
    res.status(500).json({
      error: 'Erro ao criar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Listar todos os encontros
app.get('/api/encontros',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const withStats = req.query.stats === 'true';
    const encontros = withStats ? getAllEncontrosWithStats(pastoralId) : getAllEncontros(pastoralId);

    res.json({
      success: true,
      total: encontros.length,
      data: encontros
    });
  } catch (error) {
    console.error('❌ Erro ao buscar encontros:', error);
    res.status(500).json({
      error: 'Erro ao buscar encontros',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar encontro por ID
app.get('/api/encontros/:id',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pastoralId = req.pastoral?.id;

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const encontro = getEncontroById(id, pastoralId);

    if (!encontro) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com ID ${id}`
      });
    }

    res.json({
      success: true,
      data: encontro
    });
  } catch (error) {
    console.error('❌ Erro ao buscar encontro:', error);
    res.status(500).json({
      error: 'Erro ao buscar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar encontro por código de acesso
app.get('/api/encontros/codigo/:codigo', (req, res) => {
  try {
    const codigo = req.params.codigo;
    const encontro = getEncontroByCodigo(codigo);

    if (!encontro) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com o código ${codigo}`
      });
    }

    res.json({
      success: true,
      data: encontro
    });
  } catch (error) {
    console.error('❌ Erro ao buscar encontro por código:', error);
    res.status(500).json({
      error: 'Erro ao buscar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT - Atualizar encontro
app.put('/api/encontros/:id',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  writeLimiter,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const encontro: Partial<Encontro> = req.body;
    const success = updateEncontro(id, encontro);

    if (!success) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com ID ${id}`
      });
    }

    const encontroAtualizado = getEncontroById(id);

    console.log(`✅ Encontro ${id} atualizado com sucesso`);

    res.json({
      success: true,
      message: 'Encontro atualizado com sucesso!',
      data: encontroAtualizado
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar encontro:', error);
    res.status(500).json({
      error: 'Erro ao atualizar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// DELETE - Deletar encontro
app.delete('/api/encontros/:id',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  writeLimiter,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const success = deleteEncontro(id);

    if (!success) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com ID ${id}`
      });
    }

    console.log(`✅ Encontro ${id} deletado com sucesso`);

    res.json({
      success: true,
      message: 'Encontro deletado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar encontro:', error);
    res.status(500).json({
      error: 'Erro ao deletar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Obter estatísticas de um encontro específico
app.get('/api/encontros/:id/estatisticas',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const stats = getEstatisticasEncontro(id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas do encontro:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar avaliações de um encontro específico
app.get('/api/encontros/:id/avaliacoes',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const avaliacoes = getAvaliacoesByEncontro(id);

    res.json({
      success: true,
      total: avaliacoes.length,
      data: avaliacoes
    });
  } catch (error) {
    console.error('❌ Erro ao buscar avaliações do encontro:', error);
    res.status(500).json({
      error: 'Erro ao buscar avaliações',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ========================================
// ROTAS DE ADMINISTRAÇÃO DE PASTORAIS
// ========================================

// GET - Obter configuração da pastoral atual
app.get('/api/config', (req, res) => {
  try {
    const pastoral = req.pastoral;

    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: 'Não foi possível identificar a pastoral'
      });
    }

    res.json({
      success: true,
      data: {
        id: pastoral.id,
        name: pastoral.name,
        subdomain: pastoral.subdomain,
        logoUrl: pastoral.logo_url,
        config: pastoral.config
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar configuração:', error);
    res.status(500).json({
      error: 'Erro ao buscar configuração',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Listar todas as pastorais (Admin)
app.get('/api/admin/pastorais',
  authMiddleware,
  requireRole('super_admin'),
  (req, res) => {
  try {
    const pastorais = getAllPastorais();

    res.json({
      success: true,
      total: pastorais.length,
      data: pastorais
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pastorais:', error);
    res.status(500).json({
      error: 'Erro ao buscar pastorais',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar pastoral por ID (Admin)
app.get('/api/admin/pastorais/:id',
  authMiddleware,
  requireRole('super_admin'),
  (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const pastoral = getPastoralById(id);

    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    res.json({
      success: true,
      data: pastoral
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pastoral:', error);
    res.status(500).json({
      error: 'Erro ao buscar pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST - Criar nova pastoral (Admin)
app.post('/api/admin/pastorais',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
  try {
    const { name, subdomain, logoUrl, config } = req.body;

    // Validações
    if (!name || !subdomain) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Nome e subdomínio são obrigatórios'
      });
    }

    // Verificar se o subdomínio já existe
    const existingPastoral = getPastoralBySubdomain(subdomain);
    if (existingPastoral) {
      return res.status(409).json({
        error: 'Subdomínio já existe',
        message: `O subdomínio "${subdomain}" já está em uso`
      });
    }

    const pastoralId = createPastoral({
      name,
      subdomain,
      logoUrl,
      config
    });

    console.log(`✅ Nova pastoral criada com ID: ${pastoralId}`);
    console.log(`   Nome: ${name}`);
    console.log(`   Subdomínio: ${subdomain}`);

    res.status(201).json({
      success: true,
      message: 'Pastoral criada com sucesso!',
      id: pastoralId
    });
  } catch (error) {
    console.error('❌ Erro ao criar pastoral:', error);
    res.status(500).json({
      error: 'Erro ao criar pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT - Atualizar pastoral (Admin)
app.put('/api/admin/pastorais/:id',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, subdomain, logoUrl, config } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    // Verificar se a pastoral existe
    const pastoral = getPastoralById(id);
    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    // Se está alterando o subdomínio, verificar se não existe outro com o mesmo
    if (subdomain && subdomain !== pastoral.subdomain) {
      const existingPastoral = getPastoralBySubdomain(subdomain);
      if (existingPastoral) {
        return res.status(409).json({
          error: 'Subdomínio já existe',
          message: `O subdomínio "${subdomain}" já está em uso`
        });
      }
    }

    updatePastoral(id, { name, subdomain, logoUrl, config });

    console.log(`✅ Pastoral ${id} atualizada com sucesso`);

    res.json({
      success: true,
      message: 'Pastoral atualizada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar pastoral:', error);
    res.status(500).json({
      error: 'Erro ao atualizar pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT - Atualizar configuração da pastoral (Admin)
app.put('/api/admin/pastorais/:id/config',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { config } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    if (!config) {
      return res.status(400).json({
        error: 'Configuração inválida',
        message: 'A configuração é obrigatória'
      });
    }

    // Verificar se a pastoral existe
    const pastoral = getPastoralById(id);
    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    updatePastoralConfig(id, config);

    console.log(`✅ Configuração da pastoral ${id} atualizada`);

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error);
    res.status(500).json({
      error: 'Erro ao atualizar configuração',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// DELETE - Excluir pastoral (Admin)
app.delete('/api/admin/pastorais/:id',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    // Verificar se a pastoral existe
    const pastoral = getPastoralById(id);
    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    // Não permitir excluir a pastoral default
    if (pastoral.subdomain === 'default') {
      return res.status(403).json({
        error: 'Operação não permitida',
        message: 'Não é possível excluir a pastoral padrão'
      });
    }

    deletePastoral(id);

    console.log(`✅ Pastoral ${id} excluída com sucesso`);

    res.json({
      success: true,
      message: 'Pastoral excluída com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao excluir pastoral:', error);
    res.status(500).json({
      error: 'Erro ao excluir pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ========================================
// FIM DAS ROTAS
// ========================================

// Em produção, servir o SPA para rotas não encontradas (HTML5 routing)
// Isso permite que o React Router funcione com URLs diretas
if (isProduction) {
  // Fallback para SPA - serve index.html para todas as rotas GET que não sejam /api/*
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
  });
} else {
  // Rota 404 apenas em desenvolvimento
  app.use((req, res) => {
    res.status(404).json({
      error: 'Rota não encontrada',
      message: `A rota ${req.method} ${req.path} não existe`
    });
  });
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🙏 API - Avaliação do Encontro de Noivos');
  console.log('  📍 Paróquia São Benedito - Alto da Ponte');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅ Servidor rodando em: http://localhost:${PORT}`);
  console.log(`  📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`  💾 Banco de dados: SQLite (avaliacoes.db)`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

export default app;
