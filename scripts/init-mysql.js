#!/usr/bin/env node

import mysql from 'mysql2/promise';

async function initDatabase() {
  try {
    console.log('🔄 Conectando ao MySQL...');

    // Conectar ao servidor MySQL (sem especificar banco de dados)
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'developers',
      password: 'MySelf01!@#',
    });

    console.log('✅ Conectado ao MySQL');

    // Criar banco de dados
    console.log('🔄 Criando banco de dados "avaliacoes_db"...');
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS avaliacoes_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    console.log('✅ Banco de dados criado com sucesso');

    // Fechar conexão
    await connection.end();
    console.log('✅ Conexão fechada');
  } catch (error) {
    console.error('❌ Erro ao criar banco de dados:');
    console.error(error.message);
    process.exit(1);
  }
}

initDatabase();
