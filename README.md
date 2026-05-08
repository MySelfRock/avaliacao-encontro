# Avaliação do Encontro de Santificação
## Paróquia São Benedito - Diocese de São José dos Campos - Pastoral Familiar

Sistema de avaliação online para o Encontro de Santificação, com armazenamento em banco de dados SQLite.

---

## 🚀 Funcionalidades

- ✅ **Formulário de avaliação** completo e responsivo
- ✅ **Sistema de avaliação por estrelas** (1-5)
- ✅ **Armazenamento em banco de dados SQLite**
- ✅ **API REST** para gerenciar avaliações
- ✅ **Interface administrativa** para visualizar:
  - 📊 **Estatísticas** completas das avaliações
  - 👥 **Lista de interessados** na Pastoral Familiar com contatos
- ✅ **Navegação entre páginas** com React Router
- ✅ **Design moderno** com cores da Pastoral Familiar e Paróquia
- ✅ **Responsivo** para mobile, tablet e desktop

---

## 📋 Pré-requisitos

- Node.js 18+ instalado
- npm ou yarn

---

## 🔧 Instalação

1. **Clone o repositório ou navegue até a pasta do projeto:**
```bash
cd avaliação-do-encontro-de-noivos
```

2. **Instale as dependências:**
```bash
npm install
```

---

## 🎯 Como Usar

### Opção 1: Rodar tudo junto (Recomendado)

Este comando inicia o servidor backend e o frontend simultaneamente:

```bash
npm start
```

Isso vai:
- Iniciar o servidor API em `http://localhost:3001`
- Iniciar o frontend em `http://localhost:5173`
- Inicializar o banco de dados SQLite automaticamente

### Navegação no Sistema

Após iniciar, você terá acesso a 3 páginas:

1. **`/` (Raiz)** - Formulário de avaliação para os casais
2. **`/estatisticas`** - Dashboard com estatísticas das avaliações
3. **`/interessados`** - Lista de pessoas interessadas na Pastoral com contatos

### Opção 2: Rodar separadamente

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

---

## 📊 Endpoints da API

### 1. Health Check
```
GET http://localhost:3001/api/health
```
Verifica se a API está funcionando.

### 2. Criar Nova Avaliação
```
POST http://localhost:3001/api/avaliacoes
Content-Type: application/json

{
  "basicInfo": {
    "coupleName": "João e Maria",
    "encounterDate": "2025-01-15"
  },
  "preEncontro": {
    "communicationClarity": 5,
    "registrationEase": 4,
    "comments": "Ótima comunicação!"
  },
  ...
}
```

### 3. Listar Todas as Avaliações
```
GET http://localhost:3001/api/avaliacoes
```

### 4. Buscar Avaliação por ID
```
GET http://localhost:3001/api/avaliacoes/:id
```

### 5. Obter Estatísticas
```
GET http://localhost:3001/api/estatisticas
```

Retorna:
- Total de avaliações
- Médias de todas as categorias
- Interesse na Pastoral Familiar (contagem por tipo)

### 6. Buscar Interessados na Pastoral Familiar ⭐ NOVO
```
GET http://localhost:3001/api/pastoral/interessados
```

Retorna lista de pessoas que marcaram interesse "Sim" ou "Talvez" na Pastoral Familiar, **incluindo seus contatos**.

Campos retornados:
- `avaliacao_id` - ID da avaliação
- `nome_casal` - Nome do casal (se informado)
- `data_encontro` - Data do encontro que participaram
- `data_avaliacao` - Quando responderam o formulário
- `nivel_interesse` - "sim" ou "talvez"
- `contato` - Telefone/WhatsApp ou E-mail informado
- `nota_geral` - Nota geral que deram ao encontro

**Exemplo de resposta:**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "avaliacao_id": 5,
      "nome_casal": "João e Maria",
      "data_encontro": "2025-01-15",
      "data_avaliacao": "2025-01-16 10:30:00",
      "nivel_interesse": "sim",
      "contato": "(12) 98765-4321 - joao@email.com",
      "nota_geral": 5
    },
    {
      "avaliacao_id": 3,
      "nome_casal": "Pedro e Ana",
      "data_encontro": "2025-01-15",
      "data_avaliacao": "2025-01-16 14:00:00",
      "nivel_interesse": "talvez",
      "contato": "pedro.ana@gmail.com",
      "nota_geral": 4
    }
  ],
  "message": "2 pessoa(s) interessada(s) encontrada(s)"
}
```

### 7. Buscar Todos os Contatos ⭐ NOVO
```
GET http://localhost:3001/api/contatos
```

Retorna lista de **todos** que deixaram algum contato, independente do interesse na Pastoral.

Campos retornados:
- Todos os campos do endpoint anterior +
- `recomendacao` - Nota de recomendação do encontro

---

## 💾 Banco de Dados

O sistema usa **SQLite** para armazenar as avaliações localmente.

### Estrutura do Banco

O banco é composto por 9 tabelas:

1. **avaliacoes** - Informações básicas (casal, data)
2. **pre_encontro** - Avaliações pré-encontro
3. **palestras** - Avaliações das palestras
4. **ambientes** - Avaliações da estrutura física
5. **refeicoes** - Avaliações das refeições
6. **musicas** - Avaliações da equipe de música
7. **equipe** - Avaliações da equipe pastoral
8. **avaliacao_geral** - Avaliação geral do encontro
9. **pastoral** - Interesse em participar da pastoral
10. **mensagem_final** - Mensagem final do casal

### Localização do Banco
```
/avaliacoes.db
```

### Inicializar Manualmente o Banco
```bash
npm run init-db
```

---

## 🎨 Personalização de Cores

O sistema usa a paleta de cores da Pastoral Familiar e da Paróquia:

- **Azul Pastoral:** `#0056A3` (cor principal)
- **Dourado Paróquia:** `#D4AF37` (estrelas, destaques)
- **Preto Paróquia:** `#1a1a1a` (textos)

Para alterar as cores, edite:
- `tailwind.config.js` - Configuração do Tailwind
- `index.css` - Variáveis CSS customizadas

---

## 📱 Responsividade

O formulário é totalmente responsivo e funciona em:
- 📱 Smartphones
- 📱 Tablets
- 💻 Desktops

---

## 🔒 Segurança

- Validação de dados no backend
- Proteção contra SQL Injection (prepared statements)
- CORS configurado
- Validação de tipos com TypeScript

---

## 📈 Gerando Relatórios

Para gerar relatórios, você pode:

1. **Usar a API de Estatísticas:**
```bash
curl http://localhost:3001/api/estatisticas
```

2. **Acessar o banco diretamente:**
```bash
sqlite3 avaliacoes.db
sqlite> SELECT * FROM avaliacoes;
sqlite> .exit
```

3. **Exportar para CSV/Excel:** (exemplo com SQLite)
```bash
sqlite3 avaliacoes.db
sqlite> .mode csv
sqlite> .output relatorio.csv
sqlite> SELECT * FROM avaliacoes a
   ...> JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id;
sqlite> .exit
```

---

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia backend + frontend juntos |
| `npm run dev` | Apenas frontend (Vite) |
| `npm run server` | Apenas backend (API) |
| `npm run server:watch` | Backend com auto-reload |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run init-db` | Inicializa o banco de dados |

---

## 📝 Estrutura do Projeto

```
avaliacao-do-encontro-de-noivos/
├── server/
│   ├── database.ts       # Lógica do banco de dados
│   └── index.ts          # Servidor Express
├── components/
│   ├── StarRating.tsx    # Componente de estrelas
│   ├── SectionCard.tsx   # Card de seção
│   ├── QuestionGroup.tsx # Grupo de perguntas
│   └── QuestionRow.tsx   # Linha de pergunta
├── App.tsx               # Componente principal
├── types.ts              # Tipos TypeScript
├── index.tsx             # Entry point React
├── index.html            # HTML base
├── index.css             # Estilos globais
├── tailwind.config.js    # Config Tailwind
├── vite.config.ts        # Config Vite
├── package.json          # Dependências
└── avaliacoes.db         # Banco SQLite (gerado)
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'better-sqlite3'"
```bash
npm install
```

### Erro: "Port 3001 already in use"
Mude a porta no arquivo `server/index.ts`:
```typescript
const PORT = process.env.PORT || 3002; // Altere aqui
```

### Banco de dados travado
Feche todos os processos que estão acessando o banco:
```bash
# Linux/Mac
lsof | grep avaliacoes.db
kill -9 [PID]

# Windows
tasklist | findstr node
taskkill /F /PID [PID]
```

---

## 🧪 Testes

### Testes Unitários
```bash
npm run test:unit
```

### Testes de Integração
```bash
npm install --save-dev supertest @types/supertest
npm run test:integration
```

### Testes E2E (Playwright)
```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps
npx playwright test
```

### Executar todos os testes
```bash
npm test
```

---

## 📚 Documentação da API

A documentação OpenAPI está disponível em:
- `docs/openapi.yaml` - Especificação OpenAPI 3.0
- `server/routes/openapi.ts` - Endpoint de documentação JSON

### Endpoints de API

#### Autenticação

**Paróquia São Benedito**
Alto da Ponte - São José dos Campos
Diocese de São José dos Campos

**Pastoral Familiar**

---

## 📄 Licença

Este projeto é de uso exclusivo da Paróquia São Benedito - Pastoral Familiar.

---

## 🙏 Desenvolvido com amor para a Pastoral Familiar

*"O amor é paciente, o amor é bondoso." - 1 Coríntios 13:4*
# avaliacao-encontro
