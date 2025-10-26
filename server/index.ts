import express from 'express';
import cors from 'cors';
import {
  initializeDatabase,
  insertAvaliacao,
  getAllAvaliacoes,
  getAvaliacaoById,
  getEstatisticas,
  getInteressadosPastoral,
  getTodosContatos,
  getAllAvaliacoesDetalhadas
} from './database';
import type { EvaluationData } from '../types';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

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
app.get('/api/avaliacoes/detalhadas', (req, res) => {
  try {
    const avaliacoes = getAllAvaliacoesDetalhadas();

    console.log(`📋 Buscando avaliações detalhadas: ${avaliacoes.length} encontrada(s)`);

    res.json({
      success: true,
      total: avaliacoes.length,
      data: avaliacoes,
      message: `${avaliacoes.length} avaliação(ões) encontrada(s)`
    });
  } catch (error) {
    console.error('❌ Erro ao buscar avaliações detalhadas:', error);
    res.status(500).json({
      error: 'Erro ao buscar avaliações detalhadas',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

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

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.method} ${req.path} não existe`
  });
});

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
