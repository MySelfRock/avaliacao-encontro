# Plano de Migração para MySQL - SaaS Multi-Tenant

## Visão Geral

Este documento descreve o planejamento para migração do SQLite para MySQL/PostgreSQL, necessário para suportar múltiplos tenants simultâneos em produção com alta escalabilidade.

## Por que migrar?

### Limitações do SQLite em Multi-Tenant

1. **Concorrência Limitada**: SQLite usa lock de arquivo inteiro, limitando escritas simultâneas
2. **Performance em Escala**: Não otimizado para múltiplos tenants com alto tráfego
3. **Recursos Empresariais**: Falta de replicação nativa, sharding, e alta disponibilidade
4. **Conexões Simultâneas**: Limitado em ambientes com múltiplas pastorais ativas

### Vantagens do MySQL/PostgreSQL

1. **Concorrência Real**: Lock em nível de linha, múltiplas escritas simultâneas
2. **Escalabilidade Horizontal**: Suporte a replicação master-slave, sharding
3. **Alta Disponibilidade**: Failover automático, clustering
4. **Performance**: Otimizado para cargas de trabalho multi-tenant
5. **Ferramentas Empresariais**: Backup, monitoramento, analytics

## Estratégias de Multi-Tenancy com MySQL

### Opção 1: Schema Compartilhado com Discriminator (ATUAL - Migração Simples)

**Descrição**: Todas as pastorais compartilham as mesmas tabelas, diferenciadas por `pastoral_id`.

```sql
-- Estrutura atual (similar ao SQLite)
SELECT * FROM avaliacoes WHERE pastoral_id = 1;
SELECT * FROM encontros WHERE pastoral_id = 2;
```

**Vantagens**:
- ✅ Migração mais simples do código atual
- ✅ Um único banco de dados
- ✅ Manutenção simplificada
- ✅ Backup único

**Desvantagens**:
- ❌ Todos os dados no mesmo schema (riscos de vazamento de dados)
- ❌ Difícil isolar performance por tenant
- ❌ Difícil customizar estrutura por pastoral

**Quando usar**:
- Até 50-100 pastorais
- Estrutura de dados uniforme
- Requisitos de compliance moderados

### Opção 2: Schema por Pastoral (RECOMENDADO para Crescimento)

**Descrição**: Cada pastoral tem seu próprio schema no mesmo servidor MySQL.

```sql
-- Schema por pastoral
CREATE SCHEMA pastoral_saobenedito;
CREATE SCHEMA pastoral_santamaria;

-- Uso
USE pastoral_saobenedito;
SELECT * FROM avaliacoes;
```

**Vantagens**:
- ✅ Isolamento completo de dados
- ✅ Performance isolada por tenant
- ✅ Possibilidade de customização de schema
- ✅ Migração/backup independente por pastoral
- ✅ Melhor para compliance (LGPD)

**Desvantagens**:
- ❌ Complexidade na gestão de conexões
- ❌ Migrations devem rodar em todos os schemas
- ❌ Consultas cross-pastoral mais complexas

**Quando usar**:
- 100+ pastorais
- Requisitos de isolamento forte
- Compliance LGPD/GDPR
- Customizações por pastoral

### Opção 3: Banco de Dados por Pastoral (Máximo Isolamento)

**Descrição**: Cada pastoral tem seu próprio banco MySQL em servidor separado.

```sql
-- Servidor 1: pastoral_saobenedito
-- Servidor 2: pastoral_santamaria
```

**Vantagens**:
- ✅ Isolamento total (segurança máxima)
- ✅ Performance completamente isolada
- ✅ Escalabilidade horizontal natural
- ✅ Failover independente

**Desvantagens**:
- ❌ Custo operacional muito alto
- ❌ Complexidade de gerenciamento
- ❌ Sem consultas cross-pastoral

**Quando usar**:
- Pastorais enterprise com SLA rigoroso
- Requisitos regulatórios extremos
- Budget para infra dedicada

## Plano de Migração Recomendado

### Fase 1: Preparação (1-2 semanas)

**1.1 Configuração de Ambiente**
```bash
# Instalar dependências
npm install mysql2 sequelize
# ou
npm install pg pg-hstore sequelize

# Configurar .env
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=secret
DATABASE_NAME=avaliacoes_pastoral
```

**1.2 Criar Camada de Abstração**
```typescript
// server/database/adapter.ts
interface DatabaseAdapter {
  query(sql: string, params: any[]): Promise<any>;
  transaction(callback: () => Promise<void>): Promise<void>;
  // ...
}

class SQLiteAdapter implements DatabaseAdapter { /* ... */ }
class MySQLAdapter implements DatabaseAdapter { /* ... */ }
```

**1.3 Ambiente de Testes**
- Provisionar servidor MySQL de desenvolvimento
- Configurar Docker Compose para testes locais
- Scripts de seed com dados de teste

### Fase 2: Migração de Schema (1 semana)

**2.1 Converter Schemas SQLite → MySQL**

```sql
-- SQLite (atual)
CREATE TABLE avaliacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encontro_id INTEGER,
  -- ...
);

-- MySQL (migrado)
CREATE TABLE avaliacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  encontro_id INT,
  -- ...
  INDEX idx_encontro_id (encontro_id),
  FOREIGN KEY (encontro_id) REFERENCES encontros(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**2.2 Criar Índices para Performance**

```sql
-- Índices essenciais
CREATE INDEX idx_pastoral_id ON avaliacoes(pastoral_id);
CREATE INDEX idx_encontro_id ON avaliacoes(encontro_id);
CREATE INDEX idx_pastoral_subdomain ON pastorais(subdomain);
CREATE INDEX idx_encontro_codigo ON encontros(codigo_acesso);
CREATE INDEX idx_created_at ON avaliacoes(created_at);

-- Índices compostos para queries multi-tenant
CREATE INDEX idx_pastoral_encontro ON avaliacoes(pastoral_id, encontro_id);
CREATE INDEX idx_pastoral_created ON avaliacoes(pastoral_id, created_at);
```

**2.3 Migrations com Sequelize**

```typescript
// migrations/20250107-create-pastorais.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pastorais', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      subdomain: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      // ...
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('pastorais');
  }
};
```

### Fase 3: Migração de Dados (2-3 dias)

**3.1 Script de Exportação**

```typescript
// scripts/export-sqlite-to-mysql.ts
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';

async function migratePastorais() {
  const sqliteDb = new Database('avaliacoes.db');
  const mysqlConn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME
  });

  // Migrar pastorais
  const pastorais = sqliteDb.prepare('SELECT * FROM pastorais').all();

  for (const pastoral of pastorais) {
    await mysqlConn.execute(
      'INSERT INTO pastorais (id, name, subdomain, logo_url, config, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [pastoral.id, pastoral.name, pastoral.subdomain, pastoral.logo_url, pastoral.config, pastoral.created_at]
    );
  }

  console.log(`✅ ${pastorais.length} pastorais migradas`);

  // Migrar encontros, avaliações, etc...
}

migratePastorais().catch(console.error);
```

**3.2 Validação de Integridade**

```typescript
// scripts/validate-migration.ts
async function validateCounts() {
  const sqliteCounts = {
    pastorais: sqliteDb.prepare('SELECT COUNT(*) as count FROM pastorais').get().count,
    encontros: sqliteDb.prepare('SELECT COUNT(*) as count FROM encontros').get().count,
    avaliacoes: sqliteDb.prepare('SELECT COUNT(*) as count FROM avaliacoes').get().count,
  };

  const mysqlCounts = {
    pastorais: await mysqlConn.query('SELECT COUNT(*) as count FROM pastorais'),
    encontros: await mysqlConn.query('SELECT COUNT(*) as count FROM encontros'),
    avaliacoes: await mysqlConn.query('SELECT COUNT(*) as count FROM avaliacoes'),
  };

  // Comparar e reportar diferenças
}
```

### Fase 4: Refatoração de Código (1-2 semanas)

**4.1 Substituir better-sqlite3 por mysql2**

```typescript
// Antes (SQLite)
import Database from 'better-sqlite3';
const db = new Database('avaliacoes.db');
const result = db.prepare('SELECT * FROM pastorais WHERE subdomain = ?').get(subdomain);

// Depois (MySQL)
import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const [rows] = await pool.execute('SELECT * FROM pastorais WHERE subdomain = ?', [subdomain]);
const result = rows[0];
```

**4.2 Converter Queries Síncronas para Assíncronas**

```typescript
// Antes (síncrono)
export function getPastoralBySubdomain(subdomain: string) {
  return db.prepare('SELECT * FROM pastorais WHERE subdomain = ?').get(subdomain);
}

// Depois (assíncrono)
export async function getPastoralBySubdomain(subdomain: string) {
  const [rows] = await pool.execute('SELECT * FROM pastorais WHERE subdomain = ?', [subdomain]);
  return rows[0];
}
```

**4.3 Atualizar Middlewares**

```typescript
// Middleware multi-tenant (atualizar para async)
app.use(async (req, res, next) => {
  // ... (detecção de subdomínio)

  const pastoral = await getPastoralBySubdomain(subdomain); // agora é async

  if (!pastoral) {
    return res.status(404).json({ error: 'Pastoral não encontrada' });
  }

  req.pastoral = pastoral;
  next();
});
```

### Fase 5: Testes (1 semana)

**5.1 Testes Unitários**
- Testar todas as funções de database
- Validar queries MySQL
- Testar transações

**5.2 Testes de Integração**
- Testar endpoints completos
- Validar isolamento multi-tenant
- Testar concorrência

**5.3 Testes de Performance**
```bash
# Benchmark com Apache Bench
ab -n 10000 -c 100 http://localhost:3001/api/avaliacoes

# Testes de carga com k6
k6 run load-test.js
```

**5.4 Testes de Stress**
- Simular múltiplas pastorais simultâneas
- Validar connection pool
- Testar failover

### Fase 6: Deploy Gradual (2-3 semanas)

**6.1 Deploy em Staging**
- Replicar ambiente de produção
- Migrar dados reais
- Testes com usuários beta

**6.2 Deploy em Produção (Blue-Green)**

```bash
# 1. Provisionar novo servidor MySQL
# 2. Migrar dados
# 3. Deploy nova versão em paralelo
# 4. Testar
# 5. Switchover DNS
# 6. Monitorar
# 7. Manter SQLite como fallback por 30 dias
```

**6.3 Monitoramento Pós-Deploy**
- Logs de erro
- Métricas de performance
- Alertas de falhas

## Estimativa de Custos

### Infraestrutura

| Recurso | SQLite (Atual) | MySQL Básico | MySQL Escalado |
|---------|----------------|--------------|----------------|
| Servidor DB | Incluído no app | $20/mês | $100-500/mês |
| Backup | Manual | $5/mês | $20/mês |
| Monitoramento | - | $10/mês | $50/mês |
| **Total/mês** | **$0** | **$35** | **$170-570** |

### Desenvolvimento

- Fase 1-3: 40h (1 semana)
- Fase 4: 80h (2 semanas)
- Fase 5: 40h (1 semana)
- Fase 6: 80h (2 semanas)
- **Total: ~240h (6 semanas)**

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Perda de dados na migração | Alto | Scripts de validação + rollback plan |
| Downtime prolongado | Médio | Deploy blue-green + fallback SQLite |
| Performance pior que SQLite | Médio | Benchmark antes + tuning MySQL |
| Bugs em produção | Alto | Staging completo + deploy gradual |
| Custo operacional alto | Baixo | Começar com tier básico + escalar conforme necessidade |

## Alternativas e Recomendações

### Para Curto Prazo (< 50 pastorais)
**Recomendação**: Manter SQLite com otimizações
- Adicionar WAL mode: `PRAGMA journal_mode=WAL;`
- Connection pooling adequado
- Índices otimizados
- **Custo**: $0/mês
- **Esforço**: 1-2 dias

### Para Médio Prazo (50-200 pastorais)
**Recomendação**: MySQL com Schema Compartilhado (Opção 1)
- Migração mais simples
- Performance adequada
- Custo controlado
- **Custo**: $35-100/mês
- **Esforço**: 4-6 semanas

### Para Longo Prazo (200+ pastorais)
**Recomendação**: MySQL com Schema por Pastoral (Opção 2)
- Escalabilidade comprovada
- Isolamento adequado
- Compliance LGPD
- **Custo**: $170-570/mês
- **Esforço**: 6-8 semanas

## Próximos Passos

1. ✅ Documento de planejamento criado
2. ⏳ Decisão sobre timing da migração
3. ⏳ Aprovação de budget
4. ⏳ Provisionar ambiente de testes
5. ⏳ Iniciar Fase 1

## Recursos Adicionais

- [MySQL Multi-Tenant Best Practices](https://dev.mysql.com/doc/)
- [Sequelize ORM Documentation](https://sequelize.org/)
- [PostgreSQL vs MySQL for Multi-Tenant](https://www.citusdata.com/blog/)

## Conclusão

A migração para MySQL é **altamente recomendada** para crescimento além de 50 pastorais ativas. O plano proposto minimiza riscos através de:

- ✅ Migração gradual
- ✅ Múltiplos checkpoints de validação
- ✅ Rollback plan
- ✅ Deploy blue-green
- ✅ Monitoramento contínuo

**Recomendação Final**: Iniciar planejamento detalhado quando atingir 30 pastorais ou 1000 avaliações/mês.
