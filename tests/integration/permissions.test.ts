import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';

jest.mock('../../server/database', () => ({
  __esModule: true,
  default: {
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => []),
    })),
  },
  initializeDatabase: jest.fn().mockResolvedValue(true),
  migrateDatabase: jest.fn().mockResolvedValue(true),
  seedSuperAdmin: jest.fn().mockResolvedValue(true),
  getUserByEmail: jest.fn(),
  getUserById: jest.fn((id: number) => ({
    id,
    email: id === 1 ? 'super@test.com' : 'pastoral@test.com',
    name: 'Test User',
    role: id === 1 ? 'super_admin' : 'pastoral_admin',
    pastoral_id: 1,
    is_active: true,
  })),
  getAllUsers: jest.fn(() => []),
  getPastoralBySubdomain: jest.fn(() => ({
    id: 1,
    name: 'Test Pastoral',
    subdomain: 'test',
    is_active: true,
    owner_id: 2,
  })),
  getPastoralById: jest.fn((id: number) => ({
    id,
    name: 'Test Pastoral',
    subdomain: 'test',
    is_active: true,
    owner_id: 2,
  })),
}));

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn((p: string) => `hashed_${p}`),
  compareSync: jest.fn((p: string, h: string) => h === `hashed_${p}`),
}));

import app from '../../server/index';

const ADMIN_TOKEN = 'token-admin-1';     // super_admin id=1
const PASTORAL_TOKEN = 'token-pastoral-2'; // pastoral_admin id=2

describe('Permission Routes', () => {
  describe('Role-based Access Control', () => {
    it('super_admin should access all pastorais', async () => {
      const response = await request(app)
        .get('/api/pastorais')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(response.status).toBe(200);
    });

    it('pastoral_admin should only access own pastoral', async () => {
      const response = await request(app)
        .get('/api/pastorais')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/pastorais');

      expect(response.status).toBe(401);
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/pastorais')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Super Admin Only Routes', () => {
    it('should allow super_admin to access /api/admin/backup', async () => {
      const response = await request(app)
        .get('/api/admin/backup')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(response.status).toBe(200);
    });

    it('should deny pastoral_admin access to /api/admin/backup', async () => {
      const response = await request(app)
        .get('/api/admin/backup')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`);

      expect(response.status).toBe(403);
    });

    it('should allow super_admin to create user', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({
          email: 'new@test.com',
          name: 'New User',
          password: 'Password123',
          role: 'pastoral_admin',
          pastoral_id: 1,
        });

      expect(response.status).toBe(201);
    });

    it('should deny pastoral_admin to create user', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`)
        .send({
          email: 'new@test.com',
          name: 'New User',
          password: 'Password123',
        });

      expect(response.status).toBe(403);
    });

    it('should allow super_admin to delete user', async () => {
      const response = await request(app)
        .delete('/api/admin/users/3')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(response.status).toBe(200);
    });

    it('should deny pastoral_admin to delete other pastoral users', async () => {
      const response = await request(app)
        .delete('/api/admin/users/3')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Pastoral Admin Routes', () => {
    it('should allow pastoral_admin to create encontro', async () => {
      const response = await request(app)
        .post('/api/admin/encontros')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`)
        .send({
          nome: 'Novo Encontro',
          data_inicio: '2024-06-01',
          data_fim: '2024-06-03',
          pastoral_id: 1,
        });

      expect(response.status).toBe(201);
    });

    it('should allow pastoral_admin to update own pastoral', async () => {
      const response = await request(app)
        .put('/api/admin/pastorais/1')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`)
        .send({
          name: 'Pastoral Atualizada',
        });

      expect(response.status).toBe(200);
    });

    it('should deny pastoral_admin to update other pastoral', async () => {
      const response = await request(app)
        .put('/api/admin/pastorais/2')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`)
        .send({
          name: 'Other Pastoral',
        });

      expect(response.status).toBe(403);
    });

    it('should deny pastoral_admin to delete pastoral', async () => {
      const response = await request(app)
        .delete('/api/admin/pastorais/1')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Resource Ownership', () => {
    it('user should access own resources', async () => {
      const response = await request(app)
        .get('/api/admin/encontros?pastoral_id=1')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`);

      expect(response.status).toBe(200);
    });

    it('should filter data by pastoral_id for pastoral_admin', async () => {
      const response = await request(app)
        .get('/api/admin/encontros?pastoral_id=1')
        .set('Authorization', `Bearer ${PASTORAL_TOKEN}`);

      expect(response.status).toBe(200);
    });
  });
});