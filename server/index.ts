import express from 'express';
import cors from 'cors';
import path from 'path';
import {
  initializeDatabase,
  migrateDatabase,
  insertAvaliacao,
  getAllAvaliacoes,
  getAvaliacaoById,
  getEstatisticas,
  getInteressadosPastoral,
  getTodosContatos,
  getPastoralBySubdomain,
  getPastoralById,
  getAllPastorais,
  createPastoral,
  updatePastoral,
  updatePastoralConfig,
  deletePastoral
} from './database';
import type { EvaluationData } from '../types';

// Estender o tipo Request do Express para incluir a pastoral
declare global {
  namespace Express {
    interface Request {
      pastoral?: any;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do build do frontend em produção
if (isProduction) {
  const staticPath = path.join(__dirname, '../../');
  // Servir arquivos estáticos (JS, CSS, imagens, etc.)
  // index: false - não serve index.html automaticamente (faremos manualmente depois)
  app.use(express.static(staticPath, { index: false }));
}

// Inicializar e migrar banco de dados
initializeDatabase();
migrateDatabase();

// Middleware Multi-Tenant
// Detecta a pastoral pelo subdomínio e injeta no request
app.use((req, res, next) => {
  // Rotas de admin e health não precisam de pastoral
  if (req.path.startsWith('/api/admin') || req.path === '/api/health') {
    return next();
  }

  const host = req.hostname;
  console.log('🌐 Hostname:', host);

  // Em desenvolvimento ou localhost, usar 'default'
  // Em produção, extrair subdomínio (ex: saobenedito.avaliacoes.com -> saobenedito)
  let subdomain = 'default';

  if (host && host !== 'localhost' && !host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    const parts = host.split('.');
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  console.log('🏛️  Subdomínio detectado:', subdomain);

  const pastoral = getPastoralBySubdomain(subdomain);

  if (!pastoral) {
    console.warn(`⚠️  Pastoral não encontrada para subdomínio: ${subdomain}`);
    return res.status(404).json({
      error: 'Pastoral não encontrada',
      message: `Nenhuma pastoral cadastrada para o subdomínio: ${subdomain}`
    });
  }

  console.log('✅ Pastoral encontrada:', pastoral.name);
  req.pastoral = pastoral;
  next();
});

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API de Avaliações - Pastoral Familiar',
    timestamp: new Date().toISOString()
  });
});

// POST - Criar nova avaliação
app.post('/api/avaliacoes', (req, res) => {
  try {
    const data: EvaluationData = req.body;
    const pastoralId = req.pastoral?.id;

    // Validação básica
    if (!data) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Os dados da avaliação são obrigatórios'
      });
    }

    if (!pastoralId) {
      return res.status(400).json({
        error: 'Pastoral não identificada',
        message: 'Não foi possível identificar a pastoral'
      });
    }

    const avaliacaoId = insertAvaliacao(data, pastoralId);

    console.log(`✅ Nova avaliação criada com ID: ${avaliacaoId}`);
    console.log(`   Pastoral: ${req.pastoral.name}`);
    console.log(`   Casal: ${data.basicInfo.coupleName || 'Anônimo'}`);
    console.log(`   Data do encontro: ${data.basicInfo.encounterDate || 'Não informada'}`);
    console.log(`   Nota geral: ${data.posEncontro.geral.overallRating} estrelas`);

    res.status(201).json({
      success: true,
      message: 'Avaliação salva com sucesso!',
      id: avaliacaoId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao salvar avaliação:', error);
    res.status(500).json({
      error: 'Erro ao salvar avaliação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Listar todas as avaliações (resumo)
app.get('/api/avaliacoes', (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const avaliacoes = getAllAvaliacoes(pastoralId);

    res.json({
      success: true,
      total: avaliacoes.length,
      data: avaliacoes,
      pastoral: req.pastoral?.name
    });
  } catch (error) {
    console.error('❌ Erro ao buscar avaliações:', error);
    res.status(500).json({
      error: 'Erro ao buscar avaliações',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar todas as avaliações detalhadas (para relatório completo)
// IMPORTANTE: Este endpoint deve vir ANTES de /api/avaliacoes/:id
// Comentado temporariamente - função não implementada no database.ts
// app.get('/api/avaliacoes/detalhadas', (req, res) => {
//   try {
//     const avaliacoes = getAllAvaliacoesDetalhadas();
//     console.log(`📋 Buscando avaliações detalhadas: ${avaliacoes.length} encontrada(s)`);
//     res.json({
//       success: true,
//       total: avaliacoes.length,
//       data: avaliacoes,
//       message: `${avaliacoes.length} avaliação(ões) encontrada(s)`
//     });
//   } catch (error) {
//     console.error('❌ Erro ao buscar avaliações detalhadas:', error);
//     res.status(500).json({
//       error: 'Erro ao buscar avaliações detalhadas',
//       message: error instanceof Error ? error.message : 'Erro desconhecido'
//     });
//   }
// });

// GET - Buscar avaliação específica por ID (completa)
app.get('/api/avaliacoes/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pastoralId = req.pastoral?.id;

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const avaliacao = getAvaliacaoById(id, pastoralId);

    if (!avaliacao) {
      return res.status(404).json({
        error: 'Avaliação não encontrada',
        message: `Nenhuma avaliação encontrada com ID ${id}`
      });
    }

    res.json({
      success: true,
      data: avaliacao
    });
  } catch (error) {
    console.error('❌ Erro ao buscar avaliação:', error);
    res.status(500).json({
      error: 'Erro ao buscar avaliação',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Obter estatísticas das avaliações
app.get('/api/estatisticas', (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const stats = getEstatisticas(pastoralId);

    res.json({
      success: true,
      data: stats,
      pastoral: req.pastoral?.name
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar interessados na Pastoral Familiar (com contato)
app.get('/api/pastoral/interessados', (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const interessados = getInteressadosPastoral(pastoralId);

    console.log(`📋 Buscando interessados na Pastoral: ${interessados.length} encontrado(s)`);

    res.json({
      success: true,
      total: interessados.length,
      data: interessados,
      message: `${interessados.length} pessoa(s) interessada(s) encontrada(s)`
    });
  } catch (error) {
    console.error('❌ Erro ao buscar interessados:', error);
    res.status(500).json({
      error: 'Erro ao buscar interessados',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar todos os contatos (independente do interesse)
app.get('/api/contatos', (req, res) => {
  try {
    const pastoralId = req.pastoral?.id;
    const contatos = getTodosContatos(pastoralId);

    console.log(`📞 Buscando todos os contatos: ${contatos.length} encontrado(s)`);

    res.json({
      success: true,
      total: contatos.length,
      data: contatos,
      message: `${contatos.length} contato(s) encontrado(s)`
    });
  } catch (error) {
    console.error('❌ Erro ao buscar contatos:', error);
    res.status(500).json({
      error: 'Erro ao buscar contatos',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ================== ROTAS DE ADMINISTRAÇÃO DE PASTORAIS ==================

// GET - Obter configuração da pastoral atual
app.get('/api/config', (req, res) => {
  try {
    const pastoral = req.pastoral;

    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: 'Não foi possível identificar a pastoral'
      });
    }

    res.json({
      success: true,
      data: {
        id: pastoral.id,
        name: pastoral.name,
        subdomain: pastoral.subdomain,
        logoUrl: pastoral.logo_url,
        config: pastoral.config
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar configuração:', error);
    res.status(500).json({
      error: 'Erro ao buscar configuração',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Listar todas as pastorais (Admin)
app.get('/api/admin/pastorais', (req, res) => {
  try {
    const pastorais = getAllPastorais();

    res.json({
      success: true,
      total: pastorais.length,
      data: pastorais
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pastorais:', error);
    res.status(500).json({
      error: 'Erro ao buscar pastorais',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar pastoral por ID (Admin)
app.get('/api/admin/pastorais/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const pastoral = getPastoralById(id);

    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    res.json({
      success: true,
      data: pastoral
    });
  } catch (error) {
    console.error('❌ Erro ao buscar pastoral:', error);
    res.status(500).json({
      error: 'Erro ao buscar pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST - Criar nova pastoral (Admin)
app.post('/api/admin/pastorais', (req, res) => {
  try {
    const { name, subdomain, logoUrl, config } = req.body;

    // Validações
    if (!name || !subdomain) {
      return res.status(400).json({
        error: 'Dados incompletos',
        message: 'Nome e subdomínio são obrigatórios'
      });
    }

    // Verificar se o subdomínio já existe
    const existingPastoral = getPastoralBySubdomain(subdomain);
    if (existingPastoral) {
      return res.status(409).json({
        error: 'Subdomínio já existe',
        message: `O subdomínio "${subdomain}" já está em uso`
      });
    }

    const pastoralId = createPastoral({
      name,
      subdomain,
      logoUrl,
      config
    });

    console.log(`✅ Nova pastoral criada com ID: ${pastoralId}`);
    console.log(`   Nome: ${name}`);
    console.log(`   Subdomínio: ${subdomain}`);

    res.status(201).json({
      success: true,
      message: 'Pastoral criada com sucesso!',
      id: pastoralId
    });
  } catch (error) {
    console.error('❌ Erro ao criar pastoral:', error);
    res.status(500).json({
      error: 'Erro ao criar pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT - Atualizar pastoral (Admin)
app.put('/api/admin/pastorais/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, subdomain, logoUrl, config } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    // Verificar se a pastoral existe
    const pastoral = getPastoralById(id);
    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    // Se está alterando o subdomínio, verificar se não existe outro com o mesmo
    if (subdomain && subdomain !== pastoral.subdomain) {
      const existingPastoral = getPastoralBySubdomain(subdomain);
      if (existingPastoral) {
        return res.status(409).json({
          error: 'Subdomínio já existe',
          message: `O subdomínio "${subdomain}" já está em uso`
        });
      }
    }

    updatePastoral(id, { name, subdomain, logoUrl, config });

    console.log(`✅ Pastoral ${id} atualizada com sucesso`);

    res.json({
      success: true,
      message: 'Pastoral atualizada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar pastoral:', error);
    res.status(500).json({
      error: 'Erro ao atualizar pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT - Atualizar configuração da pastoral (Admin)
app.put('/api/admin/pastorais/:id/config', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { config } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    if (!config) {
      return res.status(400).json({
        error: 'Configuração inválida',
        message: 'A configuração é obrigatória'
      });
    }

    // Verificar se a pastoral existe
    const pastoral = getPastoralById(id);
    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    updatePastoralConfig(id, config);

    console.log(`✅ Configuração da pastoral ${id} atualizada`);

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error);
    res.status(500).json({
      error: 'Erro ao atualizar configuração',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// DELETE - Excluir pastoral (Admin)
app.delete('/api/admin/pastorais/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    // Verificar se a pastoral existe
    const pastoral = getPastoralById(id);
    if (!pastoral) {
      return res.status(404).json({
        error: 'Pastoral não encontrada',
        message: `Nenhuma pastoral encontrada com ID ${id}`
      });
    }

    // Não permitir excluir a pastoral default
    if (pastoral.subdomain === 'default') {
      return res.status(403).json({
        error: 'Operação não permitida',
        message: 'Não é possível excluir a pastoral padrão'
      });
    }

    deletePastoral(id);

    console.log(`✅ Pastoral ${id} excluída com sucesso`);

    res.json({
      success: true,
      message: 'Pastoral excluída com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao excluir pastoral:', error);
    res.status(500).json({
      error: 'Erro ao excluir pastoral',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// ================== FIM DAS ROTAS DE ADMINISTRAÇÃO ==================

// Em produção, servir o SPA para rotas não encontradas (HTML5 routing)
// Isso permite que o React Router funcione com URLs diretas
if (isProduction) {
  // Fallback para SPA - serve index.html para todas as rotas GET que não sejam /api/*
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(__dirname, '../../index.html'));
  });
} else {
  // Rota 404 apenas em desenvolvimento
  app.use((req, res) => {
    res.status(404).json({
      error: 'Rota não encontrada',
      message: `A rota ${req.method} ${req.path} não existe`
    });
  });
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🙏 API - Avaliação do Encontro de Noivos');
  console.log('  📍 Paróquia São Benedito - Alto da Ponte');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅ Servidor rodando em: http://localhost:${PORT}`);
  console.log(`  📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`  💾 Banco de dados: SQLite (avaliacoes.db)`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

export default app;
