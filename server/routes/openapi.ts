import { Router } from 'express';
import { authMiddleware, requireRole } from '../server/middleware/auth';
import { getAllPastorais, getAllEncontros, getAllAvaliacoes, getAllUsers, getInteressadosPastoral } from '../server/database';
import { exportToCSV, exportToJSON, setExportHeaders } from '../server/utils/export';
import { getPaginationParams, buildPaginatedResponse } from '../server/utils/pagination';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Avaliação do Encontro de Noivos API',
      version: '1.0.0',
      description: 'API REST para sistema de avaliações de encontros de noivos',
      contact: {
        name: 'Suporte',
        email: 'suporte@avaliacoes.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'https://api.avaliacoes.com',
        description: 'Servidor de produção'
      }
    ],
    tags: [
      { name: 'auth', description: 'Autenticação' },
      { name: 'avaliacoes', description: 'Avaliações' },
      { name: 'encontros', description: 'Encontros' },
      { name: 'pastorais', description: 'Pastorais' },
      { name: 'interessados', description: 'Interessados' },
      { name: 'admin', description: 'Administração' }
    ],
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'Login de usuário',
          description: 'Autentica usuário e retorna token JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login bem-sucedido',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      token: { type: 'string' },
                      user: { type: 'object' }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Credenciais inválidas'
            }
          }
        }
      },
      '/api/auth/register': {
        post: {
          tags: ['auth'],
          summary: 'Registrar novo usuário',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string', enum: ['super_admin', 'pastoral_admin'] },
                    pastoral_id: { type: 'integer' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Usuário criado' },
            '400': { description: 'Dados inválidos' },
            '409': { description: 'Email já existe' }
          }
        }
      },
      '/api/auth/forgot-password': {
        post: {
          tags: ['auth'],
          summary: 'Esqueci minha senha',
          description: 'Envia email de recuperação de senha',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', format: 'email' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Email enviado (se existir)'
            }
          }
        }
      },
      '/api/auth/reset-password': {
        post: {
          tags: ['auth'],
          summary: 'Redefinir senha',
          description: ' redefine senha usando token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password'],
                  properties: {
                    token: { type: 'string' },
                    password: { type: 'string', minLength: 8 }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Senha redefinida' },
            '400': { description: 'Token inválido ou senha fraca' }
          }
        }
      },
      '/api/encontros': {
        get: {
          tags: ['encontros'],
          summary: 'Listar encontros',
          description: 'Retorna lista paginada de encontros',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'search', in: 'query', schema: { type: 'string' } }
          ],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Lista de encontros' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/api/encontros/{id}': {
        get: {
          tags: ['encontros'],
          summary: 'Buscar encontro por ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Encontro encontrado' },
            '404': { description: 'Encontro não encontrado' }
          }
        }
      },
      '/api/encontros/codigo/{codigo}': {
        get: {
          tags: ['encontros'],
          summary: 'Buscar encontro por código público',
          description: 'Endpoint público para acesso via QR Code',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Encontro encontrado' },
            '404': { description: 'Código inválido' }
          }
        }
      },
      '/api/avaliacoes': {
        get: {
          tags: ['avaliacoes'],
          summary: 'Listar avaliações',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'encontro_id', in: 'query', schema: { type: 'integer' } }
          ],
          responses: {
            '200': { description: 'Lista de avaliações' }
          }
        },
        post: {
          tags: ['avaliacoes'],
          summary: 'Criar avaliação',
          description: 'Endpoint público para提交 avaliação',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    encontroId: { type: 'integer' },
                    basicInfo: { type: 'object' },
                    preEncontro: { type: 'object' },
                    duranteEncontro: { type: 'object' },
                    posEncontro: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Avaliação criada' },
            '400': { description: 'Dados inválidos' }
          }
        }
      },
      '/api/avaliacoes/{id}': {
        get: {
          tags: ['avaliacoes'],
          summary: 'Buscar avaliação por ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
          ],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Avaliação encontrada' },
            '404': { description: 'Não encontrada' }
          }
        }
      },
      '/api/pastorais': {
        get: {
          tags: ['pastorais'],
          summary: 'Listar pastorais',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Lista de pastorais' }
          }
        }
      },
      '/api/interessados': {
        get: {
          tags: ['interessados'],
          summary: 'Listar interessados',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'encontro_id', in: 'query', schema: { type: 'integer' } }
          ],
          responses: {
            '200': { description: 'Lista de interessados' }
          }
        }
      },
      '/api/admin/backup': {
        get: {
          tags: ['admin'],
          summary: 'Gerar backup',
          description: 'Gera backup completo em JSON',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'users', in: 'query', schema: { type: 'boolean', default: true } },
            { name: 'audit', in: 'query', schema: { type: 'boolean', default: true } }
          ],
          responses: {
            '200': { description: 'Backup gerado' }
          }
        }
      },
      '/api/admin/export': {
        get: {
          tags: ['admin'],
          summary: 'Exportar dados',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['avaliacoes', 'encontros', 'interessados'] } },
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'json'] } }
          ],
          responses: {
            '200': {
              description: 'Arquivo exportado',
              content: {
                'text/csv': { schema: { type: 'string' } },
                'application/json': { schema: { type: 'object' } }
              }
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT retornado no login'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  });
});

export default router;