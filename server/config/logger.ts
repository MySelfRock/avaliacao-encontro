import winston from 'winston';
import { env } from './env';

/**
 * Configuração do Winston Logger
 * Logs estruturados para melhor rastreabilidade e debugging
 */

// Formato customizado para console (desenvolvimento)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Adicionar metadata se existir
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  })
);

// Formato JSON para produção (melhor para agregadores de logs)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Criar transports baseados no ambiente
const transports: winston.transport[] = [];

if (env.NODE_ENV === 'production') {
  // Em produção: logs em arquivo + console em JSON
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: jsonFormat,
    })
  );
} else if (env.NODE_ENV === 'test') {
  // Em teste: apenas erros no console
  transports.push(
    new winston.transports.Console({
      level: 'error',
      format: consoleFormat,
      silent: true, // Silencioso em testes
    })
  );
} else {
  // Em desenvolvimento: console colorizado
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Criar o logger
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports,
  // Não sair em exceções não tratadas
  exitOnError: false,
});

/**
 * Helpers para logging de eventos específicos
 */
export const logAuth = {
  login: (email: string, success: boolean, ip?: string) => {
    logger.info('Login attempt', {
      event: 'auth.login',
      email,
      success,
      ip,
    });
  },

  logout: (email: string, ip?: string) => {
    logger.info('Logout', {
      event: 'auth.logout',
      email,
      ip,
    });
  },

  passwordReset: (email: string, ip?: string) => {
    logger.info('Password reset requested', {
      event: 'auth.password_reset',
      email,
      ip,
    });
  },

  tokenRefresh: (email: string) => {
    logger.debug('Token refreshed', {
      event: 'auth.token_refresh',
      email,
    });
  },
};

export const logDB = {
  query: (query: string, duration?: number) => {
    logger.debug('Database query', {
      event: 'db.query',
      query: query.substring(0, 100), // Limitar tamanho
      duration,
    });
  },

  error: (error: Error, query?: string) => {
    logger.error('Database error', {
      event: 'db.error',
      error: error.message,
      stack: error.stack,
      query,
    });
  },
};

export const logHTTP = {
  request: (method: string, url: string, statusCode: number, duration: number, ip?: string) => {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'HTTP Request', {
      event: 'http.request',
      method,
      url,
      statusCode,
      duration,
      ip,
    });
  },
};

export const logSecurity = {
  rateLimitHit: (ip: string, endpoint: string) => {
    logger.warn('Rate limit exceeded', {
      event: 'security.rate_limit',
      ip,
      endpoint,
    });
  },

  csrfFailure: (ip: string) => {
    logger.warn('CSRF validation failed', {
      event: 'security.csrf_failure',
      ip,
    });
  },

  unauthorizedAccess: (ip: string, endpoint: string, reason: string) => {
    logger.warn('Unauthorized access attempt', {
      event: 'security.unauthorized',
      ip,
      endpoint,
      reason,
    });
  },
};

export const logEmail = {
  sent: (to: string, subject: string) => {
    logger.info('Email sent', {
      event: 'email.sent',
      to,
      subject,
    });
  },

  failed: (to: string, subject: string, error: string) => {
    logger.error('Email failed', {
      event: 'email.failed',
      to,
      subject,
      error,
    });
  },
};

// Stream para integração com Morgan (HTTP logging middleware)
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
