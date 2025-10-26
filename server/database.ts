import Database from 'better-sqlite3';
import path from 'path';
import type { EvaluationData } from '../types';

const dbPath = path.join(process.cwd(), 'avaliacoes.db');
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Criar tabelas
export function initializeDatabase() {
  // Tabela principal de avaliações
  db.exec(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      couple_name TEXT,
      encounter_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de avaliações pré-encontro
  db.exec(`
    CREATE TABLE IF NOT EXISTS pre_encontro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      communication_clarity INTEGER CHECK(communication_clarity >= 0 AND communication_clarity <= 5),
      registration_ease INTEGER CHECK(registration_ease >= 0 AND registration_ease <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de palestras
  db.exec(`
    CREATE TABLE IF NOT EXISTS palestras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      relevance INTEGER CHECK(relevance >= 0 AND relevance <= 5),
      clarity INTEGER CHECK(clarity >= 0 AND clarity <= 5),
      duration INTEGER CHECK(duration >= 0 AND duration <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de ambientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS ambientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      comfort INTEGER CHECK(comfort >= 0 AND comfort <= 5),
      cleanliness INTEGER CHECK(cleanliness >= 0 AND cleanliness <= 5),
      decoration INTEGER CHECK(decoration >= 0 AND decoration <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de refeições
  db.exec(`
    CREATE TABLE IF NOT EXISTS refeicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      quality INTEGER CHECK(quality >= 0 AND quality <= 5),
      organization INTEGER CHECK(organization >= 0 AND organization <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações de músicas
  db.exec(`
    CREATE TABLE IF NOT EXISTS musicas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      suitability INTEGER CHECK(suitability >= 0 AND suitability <= 5),
      quality INTEGER CHECK(quality >= 0 AND quality <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliações da equipe
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipe (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      availability INTEGER CHECK(availability >= 0 AND availability <= 5),
      organization INTEGER CHECK(organization >= 0 AND organization <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de avaliação geral
  db.exec(`
    CREATE TABLE IF NOT EXISTS avaliacao_geral (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      expectations INTEGER CHECK(expectations >= 0 AND expectations <= 5),
      overall_rating INTEGER CHECK(overall_rating >= 0 AND overall_rating <= 5),
      recommendation INTEGER CHECK(recommendation >= 0 AND recommendation <= 5),
      comments TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de interesse pastoral
  db.exec(`
    CREATE TABLE IF NOT EXISTS pastoral (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      interest TEXT CHECK(interest IN ('sim', 'talvez', 'nao', '')),
      contact_info TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de mensagem final
  db.exec(`
    CREATE TABLE IF NOT EXISTS mensagem_final (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      avaliacao_id INTEGER NOT NULL,
      message TEXT,
      FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Banco de dados inicializado com sucesso!');
}

// Função para inserir uma nova avaliação
export function insertAvaliacao(data: EvaluationData): number {
  const transaction = db.transaction(() => {
    // Inserir informações básicas
    const insertAvaliacao = db.prepare(`
      INSERT INTO avaliacoes (couple_name, encounter_date)
      VALUES (?, ?)
    `);
    const result = insertAvaliacao.run(
      data.basicInfo.coupleName || null,
      data.basicInfo.encounterDate || null
    );
    const avaliacaoId = result.lastInsertRowid as number;

    // Inserir pré-encontro
    db.prepare(`
      INSERT INTO pre_encontro (avaliacao_id, communication_clarity, registration_ease, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.preEncontro.communicationClarity,
      data.preEncontro.registrationEase,
      data.preEncontro.comments || null
    );

    // Inserir palestras
    db.prepare(`
      INSERT INTO palestras (avaliacao_id, relevance, clarity, duration, comments)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.palestras.relevance,
      data.duranteEncontro.palestras.clarity,
      data.duranteEncontro.palestras.duration,
      data.duranteEncontro.palestras.comments || null
    );

    // Inserir ambientes
    db.prepare(`
      INSERT INTO ambientes (avaliacao_id, comfort, cleanliness, decoration, comments)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.ambientes.comfort,
      data.duranteEncontro.ambientes.cleanliness,
      data.duranteEncontro.ambientes.decoration,
      data.duranteEncontro.ambientes.comments || null
    );

    // Inserir refeições
    db.prepare(`
      INSERT INTO refeicoes (avaliacao_id, quality, organization, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.refeicoes.quality,
      data.duranteEncontro.refeicoes.organization,
      data.duranteEncontro.refeicoes.comments || null
    );

    // Inserir músicas
    db.prepare(`
      INSERT INTO musicas (avaliacao_id, suitability, quality, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.musicas.suitability,
      data.duranteEncontro.musicas.quality,
      data.duranteEncontro.musicas.comments || null
    );

    // Inserir equipe
    db.prepare(`
      INSERT INTO equipe (avaliacao_id, availability, organization, comments)
      VALUES (?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.duranteEncontro.equipe.availability,
      data.duranteEncontro.equipe.organization,
      data.duranteEncontro.equipe.comments || null
    );

    // Inserir avaliação geral
    db.prepare(`
      INSERT INTO avaliacao_geral (avaliacao_id, expectations, overall_rating, recommendation, comments)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      avaliacaoId,
      data.posEncontro.geral.expectations,
      data.posEncontro.geral.overallRating,
      data.posEncontro.geral.recommendation,
      data.posEncontro.geral.comments || null
    );

    // Inserir pastoral
    db.prepare(`
      INSERT INTO pastoral (avaliacao_id, interest, contact_info)
      VALUES (?, ?, ?)
    `).run(
      avaliacaoId,
      data.posEncontro.pastoral.interest || '',
      data.posEncontro.pastoral.contactInfo || null
    );

    // Inserir mensagem final
    db.prepare(`
      INSERT INTO mensagem_final (avaliacao_id, message)
      VALUES (?, ?)
    `).run(
      avaliacaoId,
      data.posEncontro.finalMessage || null
    );

    return avaliacaoId;
  });

  return transaction();
}

// Função para buscar todas as avaliações
export function getAllAvaliacoes() {
  const avaliacoes = db.prepare('SELECT * FROM avaliacoes ORDER BY created_at DESC').all();
  return avaliacoes;
}

// Função para buscar uma avaliação completa por ID
export function getAvaliacaoById(id: number) {
  const avaliacao = db.prepare('SELECT * FROM avaliacoes WHERE id = ?').get(id);

  if (!avaliacao) return null;

  const preEncontro = db.prepare('SELECT * FROM pre_encontro WHERE avaliacao_id = ?').get(id);
  const palestras = db.prepare('SELECT * FROM palestras WHERE avaliacao_id = ?').get(id);
  const ambientes = db.prepare('SELECT * FROM ambientes WHERE avaliacao_id = ?').get(id);
  const refeicoes = db.prepare('SELECT * FROM refeicoes WHERE avaliacao_id = ?').get(id);
  const musicas = db.prepare('SELECT * FROM musicas WHERE avaliacao_id = ?').get(id);
  const equipe = db.prepare('SELECT * FROM equipe WHERE avaliacao_id = ?').get(id);
  const avaliacaoGeral = db.prepare('SELECT * FROM avaliacao_geral WHERE avaliacao_id = ?').get(id);
  const pastoral = db.prepare('SELECT * FROM pastoral WHERE avaliacao_id = ?').get(id);
  const mensagemFinal = db.prepare('SELECT * FROM mensagem_final WHERE avaliacao_id = ?').get(id);

  return {
    avaliacao,
    preEncontro,
    palestras,
    ambientes,
    refeicoes,
    musicas,
    equipe,
    avaliacaoGeral,
    pastoral,
    mensagemFinal,
  };
}

// Função para obter estatísticas das avaliações
export function getEstatisticas() {
  const totalAvaliacoes = db.prepare('SELECT COUNT(*) as total FROM avaliacoes').get() as { total: number };

  const mediaPreEncontro = db.prepare(`
    SELECT
      AVG(communication_clarity) as avg_communication,
      AVG(registration_ease) as avg_registration
    FROM pre_encontro
  `).get();

  const mediaPalestras = db.prepare(`
    SELECT
      AVG(relevance) as avg_relevance,
      AVG(clarity) as avg_clarity,
      AVG(duration) as avg_duration
    FROM palestras
  `).get();

  const mediaAmbientes = db.prepare(`
    SELECT
      AVG(comfort) as avg_comfort,
      AVG(cleanliness) as avg_cleanliness,
      AVG(decoration) as avg_decoration
    FROM ambientes
  `).get();

  const mediaRefeicoes = db.prepare(`
    SELECT
      AVG(quality) as avg_quality,
      AVG(organization) as avg_organization
    FROM refeicoes
  `).get();

  const mediaMusicas = db.prepare(`
    SELECT
      AVG(suitability) as avg_suitability,
      AVG(quality) as avg_quality
    FROM musicas
  `).get();

  const mediaEquipe = db.prepare(`
    SELECT
      AVG(availability) as avg_availability,
      AVG(organization) as avg_organization
    FROM equipe
  `).get();

  const mediaAvaliacaoGeral = db.prepare(`
    SELECT
      AVG(expectations) as avg_expectations,
      AVG(overall_rating) as avg_overall,
      AVG(recommendation) as avg_recommendation
    FROM avaliacao_geral
  `).get();

  const interestePastoral = db.prepare(`
    SELECT
      interest,
      COUNT(*) as count
    FROM pastoral
    GROUP BY interest
  `).all();

  return {
    totalAvaliacoes: totalAvaliacoes.total,
    mediaPreEncontro,
    mediaPalestras,
    mediaAmbientes,
    mediaRefeicoes,
    mediaMusicas,
    mediaEquipe,
    mediaAvaliacaoGeral,
    interestePastoral,
  };
}

// Função para buscar interessados na Pastoral Familiar com contato
export function getInteressadosPastoral() {
  const interessados = db.prepare(`
    SELECT
      a.id as avaliacao_id,
      a.couple_name as nome_casal,
      a.encounter_date as data_encontro,
      a.created_at as data_avaliacao,
      p.interest as nivel_interesse,
      p.contact_info as contato,
      ag.overall_rating as nota_geral
    FROM avaliacoes a
    JOIN pastoral p ON a.id = p.avaliacao_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    WHERE p.interest IN ('sim', 'talvez')
      AND p.contact_info IS NOT NULL
      AND p.contact_info != ''
    ORDER BY
      CASE p.interest
        WHEN 'sim' THEN 1
        WHEN 'talvez' THEN 2
      END,
      a.created_at DESC
  `).all();

  return interessados;
}

// Função para buscar todos os contatos (incluindo os sem interesse explícito mas que deixaram contato)
export function getTodosContatos() {
  const contatos = db.prepare(`
    SELECT
      a.id as avaliacao_id,
      a.couple_name as nome_casal,
      a.encounter_date as data_encontro,
      a.created_at as data_avaliacao,
      p.interest as nivel_interesse,
      p.contact_info as contato,
      ag.overall_rating as nota_geral,
      ag.recommendation as recomendacao
    FROM avaliacoes a
    JOIN pastoral p ON a.id = p.avaliacao_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    WHERE p.contact_info IS NOT NULL
      AND p.contact_info != ''
    ORDER BY a.created_at DESC
  `).all();

  return contatos;
}

// Função para buscar todas as avaliações completas (para relatório detalhado)
export function getAllAvaliacoesDetalhadas() {
  const avaliacoes = db.prepare('SELECT * FROM avaliacoes ORDER BY created_at DESC').all() as any[];

  return avaliacoes.map((avaliacao) => {
    const id = avaliacao.id;

    const preEncontro = db.prepare('SELECT * FROM pre_encontro WHERE avaliacao_id = ?').get(id);
    const palestras = db.prepare('SELECT * FROM palestras WHERE avaliacao_id = ?').get(id);
    const ambientes = db.prepare('SELECT * FROM ambientes WHERE avaliacao_id = ?').get(id);
    const refeicoes = db.prepare('SELECT * FROM refeicoes WHERE avaliacao_id = ?').get(id);
    const musicas = db.prepare('SELECT * FROM musicas WHERE avaliacao_id = ?').get(id);
    const equipe = db.prepare('SELECT * FROM equipe WHERE avaliacao_id = ?').get(id);
    const avaliacaoGeral = db.prepare('SELECT * FROM avaliacao_geral WHERE avaliacao_id = ?').get(id);
    const pastoral = db.prepare('SELECT * FROM pastoral WHERE avaliacao_id = ?').get(id);
    const mensagemFinal = db.prepare('SELECT * FROM mensagem_final WHERE avaliacao_id = ?').get(id);

    return {
      avaliacao,
      preEncontro,
      palestras,
      ambientes,
      refeicoes,
      musicas,
      equipe,
      avaliacaoGeral,
      pastoral,
      mensagemFinal,
    };
  });
}

export default db;
