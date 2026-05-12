import { z } from 'zod';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Schema de validação para variáveis de ambiente
 * Garante que todas as variáveis críticas estejam configuradas
 */
const envSchema = z.object({
  // Servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(5000),

  // Frontend URL (para links de reset de senha)
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // JWT - OBRIGATÓRIO EM PRODUÇÃO
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Refresh Token - OBRIGATÓRIO EM PRODUÇÃO
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET deve ter no mínimo 32 caracteres'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // Banco de Dados - MySQL
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).default(3306),
  DB_USER: z.string().min(1, 'DB_USER é obrigatório'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD é obrigatório'),
  DB_NAME: z.string().min(1, 'DB_NAME é obrigatório'),

  // SendGrid - OBRIGATÓRIO para reset de senha
  SENDGRID_API_KEY: z.string().min(10, 'SENDGRID_API_KEY é obrigatório'),
  SENDGRID_FROM_EMAIL: z.string().email(),
  SENDGRID_FROM_NAME: z.string().default('Sistema de Avaliações'),

  // Opcional - Admin Token (deprecado, manter por compatibilidade)
  ADMIN_TOKEN: z.string().optional(),

  // Cookie Secret para CSRF
  COOKIE_SECRET: z.string().min(32).default('change-this-cookie-secret-in-production'),
});

/**
 * Valida e exporta variáveis de ambiente tipadas
 */
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);

    // Avisos de segurança em produção
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.includes('change') || env.JWT_SECRET.includes('secret')) {
        console.warn('⚠️  ATENÇÃO: JWT_SECRET parece ser um valor padrão. Use uma chave forte em produção!');
      }

      if (env.REFRESH_TOKEN_SECRET.includes('change') || env.REFRESH_TOKEN_SECRET.includes('secret')) {
        console.warn('⚠️  ATENÇÃO: REFRESH_TOKEN_SECRET parece ser um valor padrão. Use uma chave forte em produção!');
      }

      if (env.COOKIE_SECRET.includes('change')) {
        console.warn('⚠️  ATENÇÃO: COOKIE_SECRET parece ser um valor padrão. Use uma chave forte em produção!');
      }
    }

    return env;
  } catch (error) {
    console.error('❌ Erro de configuração - Variáveis de ambiente inválidas:');

    if (error instanceof z.ZodError) {
      error.issues.forEach((issue: any) => {
        console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
      });
    } else if (error instanceof Error) {
      console.error(`   - ${error.message}`);
    }

    console.error('\n📝 Verifique o arquivo .env e certifique-se de que todas as variáveis obrigatórias estão configuradas.');
    console.error('   Consulte o arquivo .env.example para referência.\n');
    throw new Error('Falha na validação de variáveis de ambiente');
  }
}

// Exportar variáveis validadas
export const env = validateEnv();

// Type-safe access
export type Env = z.infer<typeof envSchema>;
