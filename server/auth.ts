import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById, updateUserLastLogin, getPastoralById, updateUserPassword, type User } from './database';
import { sendPasswordResetEmail } from './services/email.service';

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

// ============================================
// REFRESH TOKENS
// ============================================

const REFRESH_TOKEN_SECRET: string = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key-change-in-production';
const REFRESH_TOKEN_EXPIRES_IN: string = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'; // 30 dias

import { randomBytes } from 'crypto';
import {
  createRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  type RefreshToken
} from './database';

export interface AuthResponseWithRefresh extends AuthResponse {
  refreshToken?: string;
}

/**
 * Gera um refresh token seguro
 */
export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

/**
 * Calcula data de expiração do refresh token
 */
function getRefreshTokenExpiration(): string {
  const expiresIn = parseInt(REFRESH_TOKEN_EXPIRES_IN.replace('d', ''));
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expiresIn);
  return expirationDate.toISOString();
}

/**
 * Autentica usuário e retorna access token + refresh token
 */
export function authenticateUserWithRefresh(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): AuthResponseWithRefresh {
  // Autenticar normalmente
  const authResult = authenticateUser(email, password);

  if (!authResult.success || !authResult.user) {
    return authResult;
  }

  // Gerar refresh token
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiration();

  // Salvar refresh token no banco
  createRefreshToken({
    user_id: authResult.user.id,
    token: refreshToken,
    expires_at: expiresAt,
    ip_address: ipAddress,
    user_agent: userAgent
  });

  return {
    ...authResult,
    refreshToken
  };
}

/**
 * Renova access token usando refresh token
 */
export function refreshAccessToken(refreshToken: string): AuthResponse {
  // Buscar refresh token
  const tokenData = getRefreshToken(refreshToken);

  if (!tokenData) {
    return {
      success: false,
      message: 'Refresh token inválido ou expirado'
    };
  }

  // Verificar se está expirado
  const expiresAt = new Date(tokenData.expires_at);
  if (expiresAt < new Date()) {
    return {
      success: false,
      message: 'Refresh token expirado'
    };
  }

  // Buscar usuário
  const user = getUserById(tokenData.user_id);

  if (!user || !user.is_active) {
    return {
      success: false,
      message: 'Usuário inválido ou inativo'
    };
  }

  // Gerar novo access token
  const newAccessToken = generateToken(user);

  return {
    success: true,
    token: newAccessToken,
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
 * Revoga refresh token (logout)
 */
export function logoutUser(refreshToken: string): void {
  revokeRefreshToken(refreshToken);
}

/**
 * Revoga todos os refresh tokens de um usuário
 */
export function logoutAllSessions(userId: number): void {
  revokeAllUserRefreshTokens(userId);
}

// ============================================
// PASSWORD RESET
// ============================================

import {
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenAsUsed,
  type PasswordResetToken
} from './database';

/**
 * Gera token de reset de senha
 */
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Inicia processo de reset de senha
 */
export async function initiatePasswordReset(email: string, ipAddress?: string): Promise<{ success: boolean; message: string; token?: string }> {
  // Buscar usuário por email
  const user = getUserByEmail(email);

  // Por segurança, sempre retornar sucesso mesmo se email não existir
  // Isso previne enumeration attacks
  if (!user) {
    return {
      success: true,
      message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
    };
  }

  // Gerar token de reset
  const resetToken = generatePasswordResetToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora

  // Salvar token no banco
  createPasswordResetToken({
    user_id: user.id!,
    token: resetToken,
    expires_at: expiresAt.toISOString(),
    ip_address: ipAddress
  });

  // Enviar email com link de reset
  const emailSent = await sendPasswordResetEmail(email, user.name, resetToken);

  if (!emailSent) {
    console.warn(`⚠️  Falha ao enviar email de reset para: ${email}`);
    // Em desenvolvimento, logar no console como fallback
    console.log('========================================');
    console.log('PASSWORD RESET TOKEN (Fallback)');
    console.log('========================================');
    console.log(`Email: ${email}`);
    console.log(`Nome: ${user.name}`);
    console.log(`Token: ${resetToken}`);
    console.log(`Expira em: ${expiresAt.toISOString()}`);
    console.log('========================================');
  } else {
    console.log(`✅ Email de reset enviado com sucesso para: ${email}`);
  }

  return {
    success: true,
    message: 'Se o email existir, você receberá instruções para redefinir sua senha.'
  };
}

/**
 * Valida token de reset de senha
 */
export function validatePasswordResetToken(token: string): { valid: boolean; userId?: number; message?: string } {
  const tokenData = getPasswordResetToken(token);

  if (!tokenData) {
    return {
      valid: false,
      message: 'Token inválido ou expirado'
    };
  }

  return {
    valid: true,
    userId: tokenData.user_id
  };
}

/**
 * Reseta senha usando token
 */
export function resetPasswordWithToken(token: string, newPassword: string): { success: boolean; message: string } {
  // Validar token
  const validation = validatePasswordResetToken(token);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.message || 'Token inválido'
    };
  }

  // Validar nova senha
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return {
      success: false,
      message: passwordValidation.message || 'Senha inválida'
    };
  }

  // Buscar usuário
  const user = getUserById(validation.userId!);
  if (!user) {
    return {
      success: false,
      message: 'Usuário não encontrado'
    };
  }

  // Atualizar senha
  const newPasswordHash = hashPassword(newPassword);
  updateUserPassword(validation.userId!, newPasswordHash);

  // Marcar token como usado
  markPasswordResetTokenAsUsed(token);

  // Revogar todos os refresh tokens do usuário (forçar re-login)
  revokeAllUserRefreshTokens(validation.userId!);

  return {
    success: true,
    message: 'Senha redefinida com sucesso'
  };
}

