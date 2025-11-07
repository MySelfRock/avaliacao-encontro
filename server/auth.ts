import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById, updateUserLastLogin, type User } from './database';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'; // 7 dias por padrão

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'super_admin' | 'pastoral_admin';
  pastoralId?: number | null;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    pastoralId?: number | null;
  };
  message?: string;
}

/**
 * Gera um hash bcrypt para senha
 */
export function hashPassword(password: string): string {
  const saltRounds = 10;
  return bcrypt.hashSync(password, saltRounds);
}

/**
 * Verifica se senha corresponde ao hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Gera um token JWT com dados do usuário
 */
export function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id!,
    email: user.email,
    role: user.role,
    pastoralId: user.pastoral_id
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  } as SignOptions);
}

/**
 * Verifica e decodifica um token JWT
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Autentica usuário com email e senha
 */
export function authenticateUser(email: string, password: string): AuthResponse {
  // Buscar usuário por email
  const user = getUserByEmail(email);

  if (!user) {
    return {
      success: false,
      message: 'Email ou senha incorretos'
    };
  }

  // Verificar se usuário está ativo
  if (!user.is_active) {
    return {
      success: false,
      message: 'Usuário desativado. Entre em contato com o administrador.'
    };
  }

  // Verificar senha
  if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
    return {
      success: false,
      message: 'Email ou senha incorretos'
    };
  }

  // Se usuário é admin de pastoral, verificar se pastoral está ativa
  if (user.role === 'pastoral_admin' && user.pastoral_id) {
    // Importar getPastoralById para verificar status
    const { getPastoralById } = require('./database');
    const pastoral = getPastoralById(user.pastoral_id);

    if (!pastoral || !pastoral.is_active) {
      return {
        success: false,
        message: 'Pastoral desativada. Entre em contato com o administrador do sistema.'
      };
    }
  }

  // Gerar token
  const token = generateToken(user);

  // Atualizar último login
  updateUserLastLogin(user.id!);

  // Retornar sucesso
  return {
    success: true,
    token,
    user: {
      id: user.id!,
      email: user.email,
      name: user.name,
      role: user.role,
      pastoralId: user.pastoral_id
    }
  };
}

/**
 * Obtém dados do usuário a partir do token
 */
export function getUserFromToken(token: string): User | null {
  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  const user = getUserById(payload.userId);

  if (!user || !user.is_active) {
    return null;
  }

  return user;
}

/**
 * Valida força da senha
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Senha deve ter no mínimo 8 caracteres'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos uma letra minúscula'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos uma letra maiúscula'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Senha deve conter pelo menos um número'
    };
  }

  return { valid: true };
}

/**
 * Valida formato de email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
