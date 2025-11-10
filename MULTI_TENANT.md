# Sistema Multi-Tenant - Documentação

## Visão Geral

O sistema foi refatorado para suportar múltiplas pastorais em formato SaaS multi-tenant. Cada pastoral possui:
- **Subdomínio único** para acesso isolado
- **Configurações personalizadas** (cores, logo, mensagens)
- **Dados isolados** - cada pastoral vê apenas suas avaliações
- **Gerenciamento independente** de perguntas e relatórios

## Arquitetura

### Banco de Dados

#### Tabela `pastorais`
```sql
CREATE TABLE pastorais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  config TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabela `avaliacoes` (atualizada)
```sql
CREATE TABLE avaliacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pastoral_id INTEGER NOT NULL,
  couple_name TEXT,
  encounter_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE CASCADE
);
```

### Middleware Multi-Tenant

O sistema detecta automaticamente a pastoral pelo subdomínio:

- **Localhost/Desenvolvimento**: usa pastoral `default`
- **Produção**: extrai subdomínio do hostname
  - `saobenedito.avaliacoes.com` → pastoral com subdomain `saobenedito`
  - `santamaria.avaliacoes.com` → pastoral com subdomain `santamaria`

```javascript
// Exemplo de detecção
app.use((req, res, next) => {
  const host = req.hostname;
  let subdomain = 'default';

  if (host && host !== 'localhost') {
    const parts = host.split('.');
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  const pastoral = getPastoralBySubdomain(subdomain);
  req.pastoral = pastoral;
  next();
});
```

## API Endpoints

### Endpoints Públicos (Multi-Tenant)

Todos esses endpoints filtram dados automaticamente pela pastoral detectada:

#### `GET /api/config`
Retorna configuração da pastoral atual
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Paróquia São Benedito",
    "subdomain": "default",
    "logoUrl": null,
    "config": {
      "primaryColor": "#1e40af",
      "secondaryColor": "#3b82f6",
      "welcomeMessage": "Bem-vindo ao Sistema..."
    }
  }
}
```

#### `POST /api/avaliacoes`
Criar avaliação (automaticamente vinculada à pastoral)

#### `GET /api/avaliacoes`
Listar avaliações da pastoral atual

#### `GET /api/estatisticas`
Estatísticas apenas da pastoral atual

#### `GET /api/pastoral/interessados`
Interessados apenas da pastoral atual

### Endpoints de Administração

#### `GET /api/admin/pastorais`
Listar todas as pastorais (sem filtro)

```bash
curl http://localhost:3001/api/admin/pastorais
```

#### `GET /api/admin/pastorais/:id`
Buscar pastoral específica por ID

```bash
curl http://localhost:3001/api/admin/pastorais/1
```

#### `POST /api/admin/pastorais`
Criar nova pastoral

```bash
curl -X POST http://localhost:3001/api/admin/pastorais \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paróquia Santa Maria",
    "subdomain": "santamaria",
    "logoUrl": "https://exemplo.com/logo.png",
    "config": {
      "primaryColor": "#7c3aed",
      "secondaryColor": "#a78bfa",
      "welcomeMessage": "Sistema de Avaliação - Santa Maria"
    }
  }'
```

#### `PUT /api/admin/pastorais/:id`
Atualizar pastoral

```bash
curl -X PUT http://localhost:3001/api/admin/pastorais/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Paróquia São Benedito - Atualizado",
    "logoUrl": "https://exemplo.com/novo-logo.png"
  }'
```

#### `PUT /api/admin/pastorais/:id/config`
Atualizar apenas configuração

```bash
curl -X PUT http://localhost:3001/api/admin/pastorais/1/config \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "primaryColor": "#059669",
      "secondaryColor": "#10b981"
    }
  }'
```

#### `DELETE /api/admin/pastorais/:id`
Excluir pastoral (não permite excluir a pastoral `default`)

```bash
curl -X DELETE http://localhost:3001/api/admin/pastorais/2
```

## Configuração JSON

O campo `config` da pastoral aceita um JSON com configurações personalizadas:

```json
{
  "primaryColor": "#1e40af",
  "secondaryColor": "#3b82f6",
  "logoUrl": "",
  "welcomeMessage": "Bem-vindo ao Sistema...",
  "questions": {
    "preEncontro": [...],
    "palestras": [...],
    "customFields": [...]
  }
}
```

## Migração de Dados Existentes

O sistema possui uma função de migração automática que:

1. Verifica se a coluna `pastoral_id` existe na tabela `avaliacoes`
2. Se não existir:
   - Cria a pastoral padrão com subdomain `default`
   - Adiciona a coluna `pastoral_id`
   - Vincula todas as avaliações existentes à pastoral padrão

A migração é executada automaticamente ao iniciar o servidor.

## Isolamento de Dados

Cada pastoral tem acesso apenas aos seus próprios dados:

- **Avaliações**: filtradas por `pastoral_id`
- **Estatísticas**: calculadas apenas sobre dados da pastoral
- **Interessados**: apenas contatos da pastoral
- **Relatórios**: gerados com dados isolados

## Desenvolvimento Local

Em desenvolvimento (localhost), todas as requisições são direcionadas para a pastoral `default`.

Para testar diferentes pastorais localmente, você pode:

1. Modificar o `/etc/hosts` para simular subdomínios:
   ```
   127.0.0.1 default.localhost
   127.0.0.1 santamaria.localhost
   ```

2. Acessar via subdomínio:
   - `http://default.localhost:3001`
   - `http://santamaria.localhost:3001`

## Produção

Em produção, configure DNS para cada pastoral:

```
saobenedito.seudominio.com  → IP do servidor
santamaria.seudominio.com   → IP do servidor
```

O middleware detectará automaticamente o subdomínio e carregará a pastoral correta.

## Segurança

### Isolamento
- Cada pastoral só acessa seus próprios dados
- Foreign key com `ON DELETE CASCADE` garante integridade

### Validações
- Subdomínio único (não pode haver duplicatas)
- Pastoral padrão não pode ser excluída
- Validação de campos obrigatórios

## Próximos Passos

### Frontend
- [ ] Carregar configurações dinâmicas via `/api/config`
- [ ] Aplicar cores personalizadas no tema
- [ ] Exibir logo da pastoral
- [ ] Editor de perguntas customizadas

### Backend
- [ ] Autenticação e autorização por pastoral
- [ ] Limite de avaliações por pastoral (planos)
- [ ] Exportação de dados por pastoral
- [ ] Webhooks e integrações

### Infraestrutura
- [ ] Configuração de domínios/subdomínios
- [ ] SSL/TLS por subdomínio
- [ ] Monitoramento por tenant
- [ ] Backup isolado por pastoral

## Exemplos de Uso

### Criar uma nova pastoral
```javascript
const response = await fetch('http://localhost:3001/api/admin/pastorais', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Paróquia Nossa Senhora',
    subdomain: 'nossasenhora',
    config: {
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444'
    }
  })
});
```

### Obter config da pastoral atual
```javascript
const response = await fetch('http://localhost:3001/api/config');
const { data } = await response.json();
console.log(data.config.primaryColor); // "#1e40af"
```

### Criar avaliação (automático para pastoral atual)
```javascript
const response = await fetch('http://localhost:3001/api/avaliacoes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(evaluationData)
});
// pastoral_id é injetado automaticamente pelo middleware
```

## Troubleshooting

### Erro: "Pastoral não encontrada"
- Verifique se o subdomínio existe no banco
- Em localhost, certifique-se que a pastoral `default` existe

### Dados não aparecem
- Verifique se está acessando o subdomínio correto
- Confirme que os dados pertencem à pastoral atual

### Migração não executou
- Delete o banco `avaliacoes.db` e reinicie o servidor
- Ou execute a migração manualmente via código

## Suporte

Para dúvidas ou problemas, consulte:
- Logs do servidor (console)
- Documentação da API
- Código fonte em `server/database.ts` e `server/index.ts`
