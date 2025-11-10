import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock do database antes de importar o app
jest.mock('../../server/database', () => {
  const mockDb = {
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => []),
    })),
    exec: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockDb,
    initializeDatabase: jest.fn(),
    migrateDatabase: jest.fn(),
    seedSuperAdmin: jest.fn(),
    getUserByEmail: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    getAllUsers: jest.fn(() => []),
    createAuditLog: jest.fn(),
    getPastoralBySubdomain: jest.fn(() => ({
      id: 1,
      name: 'Test Pastoral',
      subdomain: 'test',
      is_active: true,
    })),
    getPastoralById: jest.fn(),
    insertAvaliacao: jest.fn(),
    getAllAvaliacoes: jest.fn(() => []),
  };
});

// Mock do bcrypt para testes determinísticos
jest.mock('bcryptjs', () => ({
  hashSync: jest.fn((password: string) => `hashed_${password}`),
  compareSync: jest.fn((password: string, hash: string) => {
    return hash === `hashed_${password}`;
  }),
}));

// Importar o app após os mocks
import app from '../../server/index';
import { getUserByEmail, createAuditLog } from '../../server/database';

describe('Authentication Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'Dados inválidos',
      });
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'Dados inválidos',
      });
    });

    it('should enforce rate limiting on login endpoint', async () => {
      // Mock user não encontrado para falhar rapidamente
      (getUserByEmail as jest.Mock).mockReturnValue(null);

      // Fazer 6 tentativas (limite é 5)
      const requests = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong',
          })
      );

      const responses = await Promise.all(requests);

      // A 6ª tentativa deve ser bloqueada pelo rate limiter
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });

    it('should set HTTP-only cookies on successful login', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@test.com',
        password_hash: 'hashed_admin123',
        name: 'Test Admin',
        role: 'super_admin',
        pastoral_id: null,
        is_active: true,
        last_login: null,
      };

      (getUserByEmail as jest.Mock).mockReturnValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        user: {
          email: 'admin@test.com',
          role: 'super_admin',
        },
      });

      // Verificar se os cookies foram definidos
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const accessCookie = cookies?.find((c: string) => c.startsWith('accessToken='));
      const refreshCookie = cookies?.find((c: string) => c.startsWith('refreshToken='));

      expect(accessCookie).toMatch(/HttpOnly/);
      expect(accessCookie).toMatch(/SameSite=Strict/);
      expect(refreshCookie).toMatch(/HttpOnly/);
      expect(refreshCookie).toMatch(/SameSite=Strict/);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'not-an-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should always return success to prevent user enumeration', async () => {
      (getUserByEmail as jest.Mock).mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Se o email existir'),
      });
    });

    it('should enforce rate limiting on forgot password', async () => {
      // Fazer 4 tentativas (limite é 3 por hora)
      const requests = Array(4).fill(null).map(() =>
        request(app)
          .post('/api/auth/forgot-password')
          .send({
            email: 'test@example.com',
          })
      );

      const responses = await Promise.all(requests);

      // A 4ª tentativa deve ser bloqueada
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear auth cookies on logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Logout realizado com sucesso',
      });

      // Verificar se os cookies foram limpos
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const accessCookie = cookies.find((c: string) => c.startsWith('accessToken='));
        const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));

        // Cookies de logout devem ter Max-Age=0 ou estar vazios
        if (accessCookie) expect(accessCookie).toMatch(/Max-Age=0|accessToken=;/);
        if (refreshCookie) expect(refreshCookie).toMatch(/Max-Age=0|refreshToken=;/);
      }
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 400 when no refresh token provided', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        message: 'Refresh token não fornecido',
      });
    });

    it('should enforce rate limiting on token refresh', async () => {
      // Fazer 11 tentativas (limite é 10 por 15min)
      const requests = Array(11).fill(null).map(() =>
        request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid' })
      );

      const responses = await Promise.all(requests);

      // A 11ª tentativa deve ser bloqueada
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });
  });
});
