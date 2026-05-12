import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';

const SECRET_KEY = process.env.TOTP_SECRET_KEY || 'default-dev-key-change-in-production';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
}

export interface TwoFactorVerifyResult {
  valid: boolean;
  message: string;
}

export function generateSecret(): string {
  return authenticator.generateSecret({
    name: process.env.APP_NAME || 'AvaliacaoEncontro',
    issuer: process.env.TOTP_ISSUER || 'ParoquiaSãoBenedito'
  });
}

export function generateTwoFactorSetup(userEmail: string): TwoFactorSetup {
  const secret = generateSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, 'AvaliacaoEncontro', secret);
  
  return {
    secret,
    otpauthUrl,
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
  };
}

export function verifyTwoFactorToken(secret: string, token: string): TwoFactorVerifyResult {
  try {
    const isValid = authenticator.verify({ token, secret });
    
    return {
      valid: isValid,
      message: isValid ? 'Token válido' : 'Token inválido ou expirado'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Erro ao verificar token'
    };
  }
}

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

export function verifyBackupCode(codes: string[], code: string): boolean {
  const index = codes.indexOf(code.toUpperCase());
  if (index === -1) return false;
  
  codes.splice(index, 1);
  return true;
}