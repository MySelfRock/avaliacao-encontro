import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';

jest.mock('../../server/database', () => {
  const mockDb = {
    prepare: jest.fn(() => ({
      run: jest.fn().mockReturnValue({ insertId: 1, changes: 1 }),
      get: jest.fn(),
      all: jest.fn(() => []),
    })),
    exec: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockDb,
    initializeDatabase: jest.fn().mockResolvedValue(true),
    migrateDatabase: jest.fn().mockResolvedValue(true),
    seedSuperAdmin: jest.fn().mockResolvedValue(true),
    getAllEncontros: jest.fn(() => [
      { id: 1, nome: 'Encontro 1', tema: 'Casamento', data_inicio: '2024-01-01', data_fim: '2024-01-03', local: 'Local 1', status: 'concluido', total_avaliacoes: 5, media_avaliacao: 4.2 },
      { id: 2, nome: 'Encontro 2', tema: 'Família', data_inicio: '2024-02-01', data_fim: '2024-02-03', local: 'Local 2', status: 'planejado', total_avaliacoes: 0, media_avaliacao: null },
    ]),
    getEncontroById: jest.fn((id: number) => ({
      id,
      nome: 'Encontro Teste',
      tema: 'Teste',
      data_inicio: '2024-01-01',
      data_fim: '2024-01-03',
      local: 'Local Teste',
      status: 'concluido',
      codigo_acesso: 'TEST123',
    })),
    getEncontroByCodigo: jest.fn((codigo: string) => ({
      id: 1,
      nome: 'Encontro Teste',
      tema: 'Teste',
      data_inicio: '2024-01-01',
      data_fim: '2024-01-03',
      local: 'Local Teste',
      codigo_acesso: codigo,
    })),
    insertEncontro: jest.fn().mockResolvedValue(1),
    updateEncontro: jest.fn().mockReturnValue({ changes: 1 }),
    deleteEncontro: jest.fn().mockReturnValue({ changes: 1 }),
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

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn((password: string) => `hashed_${password}`),
  compareSync: jest.fn((password: string, hash: string) => hash === `hashed_${password}`),
}));

import app from '../../server/index';
import { getAllEncontros, getEncontroById, insertEncontro, updateEncontro, deleteEncontro } from '../../server/database';

describe('Encontros CRUD Routes', () => {
  const adminToken = 'admin-token';
  const pastoralAdminToken = 'pastoral-admin-token';

  describe('GET /api/encontros', () => {
    it('should return all encontros for admin', async () => {
      const response = await request(app)
        .get('/api/encontros')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination params', async () => {
      const response = await request(app)
        .get('/api/encontros?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should support date filter', async () => {
      const response = await request(app)
        .get('/api/encontros?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should support status filter', async () => {
      const response = await request(app)
        .get('/api/encontros?status=concluido')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should support search filter', async () => {
      const response = await request(app)
        .get('/api/encontros?search=casamento')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .get('/api/encontros');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/encontros/:id', () => {
    it('should return encontro by id', async () => {
      const response = await request(app)
        .get('/api/encontros/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        nome: 'Encontro Teste',
      });
    });

    it('should return 404 for non-existent encontro', async () => {
      (getEncontroById as jest.Mock).mockReturnValue(null);

      const response = await request(app)
        .get('/api/encontros/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/encontros/codigo/:codigo', () => {
    it('should return encontro by access code (public)', async () => {
      const response = await request(app)
        .get('/api/encontros/codigo/TEST123');

      expect(response.status).toBe(200);
      expect(response.body.codigo_acesso).toBe('TEST123');
    });

    it('should return 404 for invalid code', async () => {
      const response = await request(app)
        .get('/api/encontros/codigo/INVALID');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/admin/encontros', () => {
    it('should create encontro with valid data', async () => {
      const newEncontro = {
        nome: 'Novo Encontro',
        tema: 'Amor',
        data_inicio: '2024-06-01',
        data_fim: '2024-06-03',
        local: 'Nova Igreja',
        pastoral_id: 1,
      };

      const response = await request(app)
        .post('/api/admin/encontros')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEncontro);

      expect(response.status).toBe(201);
      expect(insertEncontro).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/admin/encontros')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Incompleto' });

      expect(response.status).toBe(400);
    });

    it('should return 401 without admin role', async () => {
      const response = await request(app)
        .post('/api/admin/encontros')
        .set('Authorization', `Bearer ${pastoralAdminToken}`)
        .send({
          nome: 'Test',
          data_inicio: '2024-06-01',
          data_fim: '2024-06-03',
        });

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post('/api/admin/encontros')
        .send({ nome: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/admin/encontros/:id', () => {
    it('should update encontro with valid data', async () => {
      const updates = {
        nome: 'Nome Atualizado',
        status: 'concluido',
      };

      const response = await request(app)
        .put('/api/admin/encontros/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent encontro', async () => {
      (updateEncontro as jest.Mock).mockReturnValue({ changes: 0 });

      const response = await request(app)
        .put('/api/admin/encontros/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nome: 'Atualizado' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without admin role', async () => {
      const response = await request(app)
        .put('/api/admin/encontros/1')
        .set('Authorization', `Bearer ${pastoralAdminToken}`)
        .send({ nome: 'Atualizado' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/encontros/:id', () => {
    it('should delete encontro', async () => {
      (deleteEncontro as jest.Mock).mockReturnValue({ changes: 1 });

      const response = await request(app)
        .delete('/api/admin/encontros/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(deleteEncontro).toHaveBeenCalled();
    });

    it('should return 404 for non-existent encontro', async () => {
      (deleteEncontro as jest.Mock).mockReturnValue({ changes: 0 });

      const response = await request(app)
        .delete('/api/admin/encontros/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without admin role', async () => {
      const response = await request(app)
        .delete('/api/admin/encontros/1')
        .set('Authorization', `Bearer ${pastoralAdminToken}`);

      expect(response.status).toBe(403);
    });
  });
});