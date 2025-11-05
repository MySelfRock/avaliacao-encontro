import express from 'express';
import cors from 'cors';
import path from 'path';
import {
  initializeDatabase,
  insertAvaliacao,
  getAllAvaliacoes,
  getAvaliacaoById,
  getEstatisticas,
  getInteressadosPastoral,
  getTodosContatos,
  createEncontro,
  updateEncontro,
  getAllEncontros,
  getAllEncontrosWithStats,
  getEncontroById,
  getEncontroByCodigo,
  deleteEncontro,
  getEstatisticasEncontro,
  getAvaliacoesByEncontro
} from './database';
import type { EvaluationData, Encontro } from '../types';

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

// Inicializar banco de dados
initializeDatabase();

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

    // Validação básica
    if (!data) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Os dados da avaliação são obrigatórios'
      });
    }

    const avaliacaoId = insertAvaliacao(data);

    console.log(`✅ Nova avaliação criada com ID: ${avaliacaoId}`);
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
    const avaliacoes = getAllAvaliacoes();

    res.json({
      success: true,
      total: avaliacoes.length,
      data: avaliacoes
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

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const avaliacao = getAvaliacaoById(id);

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
    const stats = getEstatisticas();

    res.json({
      success: true,
      data: stats
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
    const interessados = getInteressadosPastoral();

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
    const contatos = getTodosContatos();

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

// ========================================
// ROTAS DE GERENCIAMENTO DE ENCONTROS
// ========================================

// POST - Criar novo encontro
app.post('/api/encontros', (req, res) => {
  try {
    const encontro: Encontro = req.body;

    // Validação básica
    if (!encontro.nome || !encontro.data_inicio || !encontro.data_fim) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Nome, data de início e data de fim são obrigatórios'
      });
    }

    const encontroId = createEncontro(encontro);
    const novoEncontro = getEncontroById(encontroId) as Encontro | undefined;

    console.log(`✅ Novo encontro criado com ID: ${encontroId}`);
    console.log(`   Nome: ${encontro.nome}`);
    console.log(`   Código de acesso: ${novoEncontro?.codigo_acesso}`);

    res.status(201).json({
      success: true,
      message: 'Encontro criado com sucesso!',
      data: novoEncontro
    });
  } catch (error) {
    console.error('❌ Erro ao criar encontro:', error);
    res.status(500).json({
      error: 'Erro ao criar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Listar todos os encontros
app.get('/api/encontros', (req, res) => {
  try {
    const withStats = req.query.stats === 'true';
    const encontros = withStats ? getAllEncontrosWithStats() : getAllEncontros();

    res.json({
      success: true,
      total: encontros.length,
      data: encontros
    });
  } catch (error) {
    console.error('❌ Erro ao buscar encontros:', error);
    res.status(500).json({
      error: 'Erro ao buscar encontros',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar encontro por ID
app.get('/api/encontros/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const encontro = getEncontroById(id);

    if (!encontro) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com ID ${id}`
      });
    }

    res.json({
      success: true,
      data: encontro
    });
  } catch (error) {
    console.error('❌ Erro ao buscar encontro:', error);
    res.status(500).json({
      error: 'Erro ao buscar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar encontro por código de acesso
app.get('/api/encontros/codigo/:codigo', (req, res) => {
  try {
    const codigo = req.params.codigo;
    const encontro = getEncontroByCodigo(codigo);

    if (!encontro) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com o código ${codigo}`
      });
    }

    res.json({
      success: true,
      data: encontro
    });
  } catch (error) {
    console.error('❌ Erro ao buscar encontro por código:', error);
    res.status(500).json({
      error: 'Erro ao buscar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT - Atualizar encontro
app.put('/api/encontros/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const encontro: Partial<Encontro> = req.body;
    const success = updateEncontro(id, encontro);

    if (!success) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com ID ${id}`
      });
    }

    const encontroAtualizado = getEncontroById(id);

    console.log(`✅ Encontro ${id} atualizado com sucesso`);

    res.json({
      success: true,
      message: 'Encontro atualizado com sucesso!',
      data: encontroAtualizado
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar encontro:', error);
    res.status(500).json({
      error: 'Erro ao atualizar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// DELETE - Deletar encontro
app.delete('/api/encontros/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const success = deleteEncontro(id);

    if (!success) {
      return res.status(404).json({
        error: 'Encontro não encontrado',
        message: `Nenhum encontro encontrado com ID ${id}`
      });
    }

    console.log(`✅ Encontro ${id} deletado com sucesso`);

    res.json({
      success: true,
      message: 'Encontro deletado com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar encontro:', error);
    res.status(500).json({
      error: 'Erro ao deletar encontro',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Obter estatísticas de um encontro específico
app.get('/api/encontros/:id/estatisticas', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const stats = getEstatisticasEncontro(id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas do encontro:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET - Buscar avaliações de um encontro específico
app.get('/api/encontros/:id/avaliacoes', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: 'ID inválido',
        message: 'O ID deve ser um número'
      });
    }

    const avaliacoes = getAvaliacoesByEncontro(id);

    res.json({
      success: true,
      total: avaliacoes.length,
      data: avaliacoes
    });
  } catch (error) {
    console.error('❌ Erro ao buscar avaliações do encontro:', error);
    res.status(500).json({
      error: 'Erro ao buscar avaliações',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

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
