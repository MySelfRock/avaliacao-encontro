/**
 * Setup global para testes
 */

// Configurar variáveis de ambiente para testes ANTES de qualquer import
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret-for-testing-purposes-only';
process.env.REFRESH_TOKEN_EXPIRES_IN = '30d';
process.env.COOKIE_SECRET = 'test-cookie-secret-for-testing-purposes-only';
process.env.SENDGRID_API_KEY = 'SG.test-api-key';
process.env.SENDGRID_FROM_EMAIL = 'test@example.com';
process.env.SENDGRID_FROM_NAME = 'Test System';

// Mock do dotenv para não tentar carregar .env em testes
jest.mock('dotenv', () => ({
  config: jest.fn(),
  __esModule: true,
  default: {
    config: jest.fn(),
  },
}));

// Mock do SendGrid para evitar chamadas reais em testes
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202, body: '', headers: {} }]),
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{ statusCode: 202, body: '', headers: {} }]),
  },
}));

// Aumentar timeout para testes de integração
jest.setTimeout(10000);

// Limpar mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});
