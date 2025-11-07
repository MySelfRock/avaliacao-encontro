# Documentação Técnica - Sistema de Avaliação do Encontro de Noivos

**Cliente:** Paróquia São Benedito - Pastoral Familiar, Diocese de São José dos Campos
**Versão:** 1.0
**Data:** Novembro 2025

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Tecnológica](#2-arquitetura-tecnológica)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Backend - API REST](#4-backend---api-rest)
5. [Banco de Dados](#5-banco-de-dados)
6. [Frontend - Interface do Usuário](#6-frontend---interface-do-usuário)
7. [Funcionalidades Principais](#7-funcionalidades-principais)
8. [Fluxo de Dados](#8-fluxo-de-dados)
9. [Sistema de Build e Deploy](#9-sistema-de-build-e-deploy)
10. [Configuração e Variáveis de Ambiente](#10-configuração-e-variáveis-de-ambiente)
11. [Segurança](#11-segurança)
12. [Performance e Otimizações](#12-performance-e-otimizações)
13. [Monitoramento e Logs](#13-monitoramento-e-logs)
14. [Manutenção e Backup](#14-manutenção-e-backup)
15. [Desenvolvimento Local](#15-desenvolvimento-local)
16. [Limitações e Melhorias Futuras](#16-limitações-e-melhorias-futuras)

---

## 1. Visão Geral do Sistema

### 1.1 Propósito

Sistema web para coleta de avaliações online de casais que participaram do Encontro de Noivos, com dashboard de estatísticas e gestão de contatos interessados em participar da pastoral.

### 1.2 Características Principais

- ✅ Formulário de avaliação completo e intuitivo
- ✅ Sistema de avaliação por estrelas (1-5)
- ✅ Dashboard estatístico com médias e indicadores
- ✅ Gestão de contatos interessados na pastoral
- ✅ Exportação de relatórios em PDF
- ✅ Design responsivo (mobile, tablet, desktop)
- ✅ Deploy em servidor VPS ou cloud (Render.com)

### 1.3 Usuários do Sistema

- **Casais Participantes:** Preenchem formulário de avaliação
- **Equipe Pastoral:** Visualizam estatísticas e gerenciam contatos

---

## 2. Arquitetura Tecnológica

### 2.1 Stack Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **React** | 19.2.0 | Biblioteca UI |
| **TypeScript** | 5.8.2 | Tipagem estática |
| **Vite** | 6.2.0 | Build tool e dev server |
| **React Router DOM** | 7.9.4 | Roteamento client-side |
| **Tailwind CSS** | Latest | Framework CSS utilitário |
| **jsPDF** | 3.0.3 | Geração de PDFs |
| **jspdf-autotable** | 5.0.2 | Tabelas em PDFs |

### 2.2 Stack Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | Latest | Runtime JavaScript |
| **Express** | 5.1.0 | Framework web |
| **TypeScript** | 5.8.2 | Tipagem no backend |
| **better-sqlite3** | 12.4.1 | Banco de dados SQLite |
| **CORS** | 2.8.5 | Controle de acesso cross-origin |

### 2.3 Ferramentas de Deploy

- **Nginx:** Reverse proxy e servidor de arquivos estáticos
- **systemd:** Gerenciamento de serviço Linux
- **Render.com:** Plataforma de cloud hosting (alternativa)

### 2.4 Arquitetura Geral

```
┌─────────────────┐
│   Navegador     │
│   (Cliente)     │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────┐
│     Nginx       │ (:80/:443)
│  Reverse Proxy  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Static │ │ Express  │ (:3001)
│ Files  │ │   API    │
│ (SPA)  │ └─────┬────┘
└────────┘       │
                 ▼
           ┌──────────┐
           │  SQLite  │
           │ Database │
           └──────────┘
```

---

## 3. Estrutura do Projeto

```
avaliacao-encontro/
├── components/              # Componentes React reutilizáveis
│   ├── Navigation.tsx       # Barra de navegação
│   ├── QuestionGroup.tsx    # Agrupador de perguntas
│   ├── QuestionRow.tsx      # Linha individual de pergunta
│   ├── SectionCard.tsx      # Card de seção
│   └── StarRating.tsx       # Componente de estrelas
│
├── pages/                   # Páginas da aplicação
│   ├── AvaliacaoForm.tsx    # Formulário de avaliação (pública)
│   ├── Estatisticas.tsx     # Dashboard de estatísticas
│   └── Interessados.tsx     # Lista de contatos interessados
│
├── server/                  # Backend Node.js
│   ├── database.ts          # Operações de banco de dados
│   └── index.ts             # Servidor Express
│
├── config/                  # Configurações
│   └── api.ts              # Endpoints da API
│
├── deploy/                  # Scripts e configs de deploy
│   ├── avaliacao-encontro.service  # Serviço systemd
│   ├── deploy.sh                   # Script de deploy automatizado
│   ├── nginx.conf                  # Configuração Nginx
│   └── README.md                   # Documentação de deploy
│
├── scripts/                 # Scripts utilitários
│   └── build-backend.js    # Build do backend (TS→CJS)
│
├── App.tsx                  # Componente raiz React
├── types.ts                 # Definições TypeScript
├── index.tsx                # Entry point React
├── index.css                # Estilos globais
├── tailwind.config.js       # Config Tailwind
├── vite.config.ts           # Config Vite
├── tsconfig.json            # Config TypeScript
├── package.json             # Dependências npm
└── render.yaml              # Config deploy Render.com
```

---

## 4. Backend - API REST

### 4.1 Servidor Express

**Arquivo:** `server/index.ts`
**Porta:** 3001 (dev) | Configurável via `process.env.PORT`

### 4.2 Endpoints da API

#### **Saúde do Sistema**

```
GET /api/health
```
**Resposta:**
```json
{ "status": "ok" }
```

#### **Criar Avaliação**

```
POST /api/avaliacoes
Content-Type: application/json
```

**Body:** Objeto `EvaluationData` (ver seção 6.3)

**Resposta (Sucesso - 200):**
```json
{
  "success": true,
  "message": "Avaliação salva com sucesso!",
  "id": 42,
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

**Resposta (Erro - 500):**
```json
{
  "error": "Erro ao salvar avaliação",
  "message": "Detalhes do erro..."
}
```

#### **Listar Avaliações (Resumo)**

```
GET /api/avaliacoes
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "couple_name": "João e Maria",
      "encounter_date": "2025-01-15",
      "created_at": "2025-01-16T10:30:00.000Z"
    }
  ]
}
```

#### **Obter Avaliação Específica**

```
GET /api/avaliacoes/:id
```

**Resposta:** Objeto completo da avaliação com todos os dados relacionados

#### **Obter Estatísticas Agregadas**

```
GET /api/estatisticas
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "totalAvaliacoes": 42,
    "mediaPreEncontro": {
      "avg_communication": 4.5,
      "avg_registration": 4.2
    },
    "mediaPalestras": {
      "avg_relevance": 4.8,
      "avg_clarity": 4.7,
      "avg_duration": 4.3
    },
    "mediaAmbientes": { ... },
    "mediaRefeicoes": { ... },
    "mediaMusicas": { ... },
    "mediaEquipe": { ... },
    "mediaAvaliacaoGeral": {
      "avg_expectations": 4.6,
      "avg_overall": 4.7,
      "avg_recommendation": 4.9
    },
    "interestePastoral": [
      { "interest": "sim", "count": 15 },
      { "interest": "talvez", "count": 10 },
      { "interest": "nao", "count": 17 }
    ]
  }
}
```

#### **Obter Contatos Interessados**

```
GET /api/pastoral/interessados
```

**Filtros aplicados:**
- `interest IN ('sim', 'talvez')`
- `contact_info IS NOT NULL`

**Ordenação:**
1. Nível de interesse (sim primeiro)
2. Data do encontro (mais recente primeiro)

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "avaliacao_id": 5,
      "couple_name": "João e Maria",
      "encounter_date": "2025-01-15",
      "interest": "sim",
      "contact_info": "(12) 98765-4321 - joao@email.com",
      "overall_rating": 5,
      "created_at": "2025-01-16T10:30:00.000Z"
    }
  ]
}
```

#### **Obter Todos os Contatos**

```
GET /api/contatos
```

Retorna todos os contatos (incluindo "não" interessados) que forneceram informação de contato.

### 4.3 Middleware

1. **CORS:** Permite requisições cross-origin
2. **express.json():** Parser de JSON no body
3. **Static Files (produção):** Serve arquivos da pasta `/dist`
4. **SPA Fallback:** Retorna `index.html` para rotas não encontradas

### 4.4 Modo de Produção

Em produção (`NODE_ENV=production`):
- Servidor Express serve tanto API quanto frontend
- Arquivos estáticos servidos da pasta `/dist`
- HTML5 routing habilitado (todas as rotas retornam `index.html`)
- CORS desnecessário (mesma origem)

---

## 5. Banco de Dados

### 5.1 Tecnologia

**SQLite3** com `better-sqlite3` (sincronous binding nativo)

**Arquivo:** `avaliacoes.db` (criado automaticamente)

**Características:**
- ✅ Zero configuração
- ✅ Banco embarcado (sem servidor separado)
- ✅ Suporta transações ACID
- ✅ Foreign keys habilitadas
- ✅ WAL mode (Write-Ahead Logging)

### 5.2 Schema do Banco

#### **10 Tabelas Normalizadas**

##### **1. avaliacoes** (Tabela Principal)

```sql
CREATE TABLE avaliacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  couple_name TEXT,
  encounter_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

##### **2. pre_encontro**

```sql
CREATE TABLE pre_encontro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  communication_clarity INTEGER CHECK(communication_clarity >= 0 AND communication_clarity <= 5),
  registration_ease INTEGER CHECK(registration_ease >= 0 AND registration_ease <= 5),
  comments TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **3. palestras**

```sql
CREATE TABLE palestras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  relevance INTEGER CHECK(relevance >= 0 AND relevance <= 5),
  clarity INTEGER CHECK(clarity >= 0 AND clarity <= 5),
  duration INTEGER CHECK(duration >= 0 AND duration <= 5),
  comments TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **4. ambientes**

```sql
CREATE TABLE ambientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  comfort INTEGER CHECK(comfort >= 0 AND comfort <= 5),
  cleanliness INTEGER CHECK(cleanliness >= 0 AND cleanliness <= 5),
  decoration INTEGER CHECK(decoration >= 0 AND decoration <= 5),
  comments TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **5. refeicoes**

```sql
CREATE TABLE refeicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  quality INTEGER CHECK(quality >= 0 AND quality <= 5),
  organization INTEGER CHECK(organization >= 0 AND organization <= 5),
  comments TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **6. musicas**

```sql
CREATE TABLE musicas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  suitability INTEGER CHECK(suitability >= 0 AND suitability <= 5),
  quality INTEGER CHECK(quality >= 0 AND quality <= 5),
  comments TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **7. equipe**

```sql
CREATE TABLE equipe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  availability INTEGER CHECK(availability >= 0 AND availability <= 5),
  organization INTEGER CHECK(organization >= 0 AND organization <= 5),
  comments TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **8. avaliacao_geral**

```sql
CREATE TABLE avaliacao_geral (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  expectations INTEGER CHECK(expectations >= 0 AND expectations <= 5),
  overall_rating INTEGER CHECK(overall_rating >= 0 AND overall_rating <= 5),
  recommendation INTEGER CHECK(recommendation >= 0 AND recommendation <= 5),
  comments TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **9. pastoral**

```sql
CREATE TABLE pastoral (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  interest TEXT CHECK(interest IN ('sim', 'talvez', 'nao', '')),
  contact_info TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

##### **10. mensagem_final**

```sql
CREATE TABLE mensagem_final (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  avaliacao_id INTEGER NOT NULL,
  message TEXT,
  FOREIGN KEY (avaliacao_id) REFERENCES avaliacoes(id) ON DELETE CASCADE
);
```

### 5.3 Operações Principais

**Arquivo:** `server/database.ts`

#### **initializeDatabase()**

Inicializa todas as tabelas no startup do servidor.

```typescript
db.pragma('foreign_keys = ON');
// Cria todas as 10 tabelas se não existirem
```

#### **insertAvaliacao(data: EvaluationData)**

Insere avaliação completa usando **transação atômica**:

```typescript
const transaction = db.transaction((data: EvaluationData) => {
  // 1. Insert avaliacoes
  const result = db.prepare(`INSERT INTO avaliacoes...`).run(...);
  const avaliacaoId = result.lastInsertRowid;

  // 2-10. Insert em todas as tabelas relacionadas
  db.prepare(`INSERT INTO pre_encontro...`).run(...);
  db.prepare(`INSERT INTO palestras...`).run(...);
  // ... etc

  return avaliacaoId;
});

// Executa transação (all-or-nothing)
const id = transaction(data);
```

#### **getAllAvaliacoes()**

Lista resumida ordenada por data de criação (DESC).

#### **getAvaliacaoById(id: number)**

Busca completa com JOINs em todas as tabelas relacionadas.

#### **getEstatisticas()**

Calcula agregações:
- `AVG()` para todos os campos de rating
- `COUNT()` e `GROUP BY` para interesse pastoral

#### **getInteressadosPastoral()**

Filtra e ordena contatos interessados:
```sql
WHERE interest IN ('sim', 'talvez')
  AND contact_info IS NOT NULL
ORDER BY
  CASE interest
    WHEN 'sim' THEN 1
    WHEN 'talvez' THEN 2
  END,
  encounter_date DESC
```

### 5.4 Integridade de Dados

- ✅ **Foreign Keys:** Todas as tabelas relacionadas têm FK com `ON DELETE CASCADE`
- ✅ **CHECK Constraints:** Ratings validados entre 0-5
- ✅ **Transações:** Inserções atômicas (tudo ou nada)
- ✅ **Tipos Fortes:** TypeScript garante tipos corretos

---

## 6. Frontend - Interface do Usuário

### 6.1 Roteamento

**Arquivo:** `App.tsx`

```
/                 → AvaliacaoForm (pública)
/estatisticas     → Estatisticas (admin)
/interessados     → Interessados (admin)
```

**Navegação:** Exibida apenas nas rotas administrativas

### 6.2 Hierarquia de Componentes

```
App
└── BrowserRouter
    └── AppContent
        ├── Navigation (condicional)
        └── Routes
            ├── Route "/" → AvaliacaoForm
            │   ├── SectionCard (4x)
            │   │   └── QuestionGroup (múltiplos)
            │   │       └── QuestionRow (múltiplos)
            │   │           └── StarRating
            │   └── Handlers de submit
            ├── Route "/estatisticas" → Estatisticas
            │   ├── Cards de estatísticas
            │   └── Botão de exportação PDF
            └── Route "/interessados" → Interessados
                ├── Cards de contatos
                └── Botão de exportação PDF
```

### 6.3 Tipos TypeScript Principais

**Arquivo:** `types.ts`

```typescript
export interface EvaluationData {
  basicInfo: {
    coupleName: string;
    encounterDate: string;
  };
  preEncontro: {
    communicationClarity: number;
    registrationEase: number;
    comments: string;
  };
  duranteEncontro: {
    palestras: RatingSection;
    ambientes: RatingSection;
    refeicoes: RatingSection;
    musicas: RatingSection;
    equipe: RatingSection;
  };
  posEncontro: {
    geral: {
      expectations: number;
      overallRating: number;
      recommendation: number;
      comments: string;
    };
    pastoral: {
      interest: 'sim' | 'talvez' | 'nao' | '';
      contactInfo: string;
    };
    finalMessage: string;
  };
}

interface RatingSection {
  [key: string]: number | string;
  comments: string;
}
```

### 6.4 Componentes Reutilizáveis

#### **StarRating.tsx**

Sistema de avaliação por estrelas (0-5).

**Props:**
```typescript
{
  value: number;
  onChange: (value: number) => void;
  label: string;
}
```

**Comportamento:**
- Hover: Pré-visualização da avaliação
- Click: Define a avaliação
- Visual: Estrelas douradas preenchidas

#### **QuestionRow.tsx**

Linha de pergunta com label e StarRating.

#### **QuestionGroup.tsx**

Agrupa perguntas relacionadas com campos de comentários.

#### **SectionCard.tsx**

Card visual com borda lateral colorida e título.

#### **Navigation.tsx**

Barra de navegação responsiva com logo e links.

### 6.5 Gerenciamento de Estado

**Não usa bibliotecas externas de estado.** Utiliza React Hooks nativos:

- `useState`: Estado local dos componentes
- `useEffect`: Efeitos colaterais (fetch de dados)
- `useCallback`: Memoização de handlers
- `useLocation`: Detecção de rota atual

**Exemplo (AvaliacaoForm.tsx):**

```typescript
const [formData, setFormData] = useState<EvaluationData>({
  basicInfo: { coupleName: '', encounterDate: '' },
  preEncontro: { communicationClarity: 0, registrationEase: 0, comments: '' },
  // ...
});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const response = await fetch(`${API_BASE_URL}/api/avaliacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      setShowSuccess(true);
    }
  } catch (error) {
    alert('Erro ao enviar avaliação');
  } finally {
    setIsSubmitting(false);
  }
};
```

### 6.6 Design System

#### **Paleta de Cores**

```javascript
// tailwind.config.js
colors: {
  'pastoral-blue': {
    500: '#0056A3'  // Azul pastoral (primária)
  },
  'paroquia-gold': {
    500: '#D4AF37'  // Dourado (acentos)
  },
  'paroquia-dark': {
    500: '#1a1a1a'  // Texto escuro
  }
}
```

#### **Tipografia**

- **Fonte:** Inter (Google Fonts)
- **Pesos:** 400, 500, 600, 700, 800

#### **Espaçamento e Bordas**

- **Radius:** `rounded-2xl` (1rem)
- **Shadows:** `shadow-xl`, `shadow-2xl`
- **Padding:** Escala Tailwind (4, 6, 8, 12, 16)

#### **Breakpoints Responsivos**

```javascript
sm:  640px   // Tablet pequeno
md:  768px   // Tablet
lg:  1024px  // Desktop
xl:  1280px  // Desktop grande
```

---

## 7. Funcionalidades Principais

### 7.1 Formulário de Avaliação

**Página:** `pages/AvaliacaoForm.tsx`
**Rota:** `/` (pública - sem autenticação)

#### **Seções do Formulário**

**1. Informações Básicas (Opcional)**
- Nome do casal
- Data do encontro

**2. Pré-Encontro**
- Clareza na comunicação (1-5 ⭐)
- Facilidade de inscrição (1-5 ⭐)
- Comentários

**3. Durante o Encontro**

**3.1 Palestras**
- Relevância dos temas (1-5 ⭐)
- Clareza dos palestrantes (1-5 ⭐)
- Duração adequada (1-5 ⭐)
- Comentários

**3.2 Ambientes**
- Conforto (1-5 ⭐)
- Limpeza (1-5 ⭐)
- Decoração (1-5 ⭐)
- Comentários

**3.3 Refeições**
- Qualidade (1-5 ⭐)
- Organização (1-5 ⭐)
- Comentários

**3.4 Músicas**
- Adequação (1-5 ⭐)
- Qualidade (1-5 ⭐)
- Comentários

**3.5 Equipe**
- Disponibilidade (1-5 ⭐)
- Organização (1-5 ⭐)
- Comentários

**4. Pós-Encontro**

**4.1 Avaliação Geral**
- Atendeu expectativas? (1-5 ⭐)
- Avaliação geral (1-5 ⭐)
- Recomendaria? (1-5 ⭐)
- Comentários

**4.2 Interesse na Pastoral**
- Opções: Sim / Talvez / Não
- Campo condicional: Contato (exibido se "sim" ou "talvez")

**4.3 Mensagem Final**
- Campo de texto livre

#### **UX/UI Features**

✅ **Responsivo:** Adaptado para mobile, tablet e desktop
✅ **Validação:** Valores de estrelas entre 0-5
✅ **Loading State:** Indicador durante submit
✅ **Feedback Visual:** Tela de sucesso após envio
✅ **Campos Condicionais:** Contato só aparece se interessado
✅ **Hover Effects:** Preview de estrelas ao passar mouse

### 7.2 Dashboard de Estatísticas

**Página:** `pages/Estatisticas.tsx`
**Rota:** `/estatisticas`

#### **Dados Exibidos**

1. **Total de Avaliações**
2. **Médias por Categoria:**
   - Pré-Encontro (comunicação, inscrição)
   - Palestras (relevância, clareza, duração)
   - Ambientes (conforto, limpeza, decoração)
   - Refeições (qualidade, organização)
   - Músicas (adequação, qualidade)
   - Equipe (disponibilidade, organização)
   - Avaliação Geral (expectativas, nota geral, recomendação)

3. **Interesse Pastoral:**
   - Contagem de "Sim", "Talvez", "Não"
   - Percentuais calculados

#### **Indicadores Visuais**

Cores baseadas na média:

| Média | Cor | Significado |
|-------|-----|-------------|
| ≥ 4.5 | 🟢 Verde | Excelente |
| ≥ 3.5 | 🔵 Azul | Bom |
| ≥ 2.5 | 🟡 Amarelo | Médio |
| < 2.5 | 🔴 Vermelho | Precisa Melhorar |

```typescript
function getRatingColor(rating: number) {
  if (rating >= 4.5) return 'text-green-600 bg-green-50';
  if (rating >= 3.5) return 'text-blue-600 bg-blue-50';
  if (rating >= 2.5) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}
```

#### **Exportação PDF**

Botão "Exportar PDF" gera relatório completo com:
- Estatísticas resumidas
- Todas as avaliações detalhadas
- Comentários de cada seção
- Formatação profissional

**Implementação:**
```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const exportToPDF = () => {
  const doc = new jsPDF();

  // Cabeçalho
  doc.setFontSize(18);
  doc.text('Relatório de Avaliações - Encontro de Noivos', 14, 20);

  // Estatísticas
  doc.setFontSize(12);
  doc.text(`Total de Avaliações: ${stats.totalAvaliacoes}`, 14, 35);

  // Tabelas com autoTable
  doc.autoTable({
    head: [['Categoria', 'Média']],
    body: [
      ['Comunicação', stats.mediaPreEncontro.avg_communication.toFixed(2)],
      // ...
    ],
    startY: 45
  });

  // Salvar
  doc.save('relatorio-avaliacoes.pdf');
};
```

### 7.3 Gestão de Interessados

**Página:** `pages/Interessados.tsx`
**Rota:** `/interessados`

#### **Filtros Aplicados**

Exibe apenas casais que:
- ✅ Marcaram interesse como "sim" ou "talvez"
- ✅ Forneceram informação de contato

#### **Informações Exibidas**

Para cada contato:
- Nome do casal
- Nível de interesse (badge colorido)
- Data do encontro
- Avaliação geral (estrelas)
- Informação de contato
- Botão "Copiar" para clipboard

#### **Badges de Interesse**

```typescript
{interest === 'sim' ? (
  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
    Sim
  </span>
) : (
  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
    Talvez
  </span>
)}
```

#### **Copiar para Clipboard**

```typescript
const handleCopyContact = (contact: string) => {
  navigator.clipboard.writeText(contact);
  alert('Contato copiado!');
};
```

#### **Exportação PDF**

Gera lista de contatos formatada para impressão ou arquivo.

---

## 8. Fluxo de Dados

### 8.1 Fluxo de Criação de Avaliação

```
┌──────────────┐
│   Usuário    │
│ (Navegador)  │
└──────┬───────┘
       │
       │ 1. Preenche formulário
       ▼
┌──────────────────┐
│ AvaliacaoForm.tsx│
│   (React State)  │
└──────┬───────────┘
       │
       │ 2. Submit (POST /api/avaliacoes)
       ▼
┌──────────────────┐
│  Express Server  │
│ (server/index.ts)│
└──────┬───────────┘
       │
       │ 3. insertAvaliacao()
       ▼
┌──────────────────┐
│   database.ts    │
│  (Transaction)   │
└──────┬───────────┘
       │
       │ 4. INSERT em 10 tabelas
       ▼
┌──────────────────┐
│   SQLite DB      │
│ (avaliacoes.db)  │
└──────┬───────────┘
       │
       │ 5. Retorna ID
       ▼
┌──────────────────┐
│    Response      │
│ { success, id }  │
└──────┬───────────┘
       │
       │ 6. Exibe tela de sucesso
       ▼
┌──────────────────┐
│   Usuário        │
│ (Confirmação)    │
└──────────────────┘
```

### 8.2 Fluxo de Consulta de Estatísticas

```
┌──────────────────┐
│  Admin acessa    │
│ /estatisticas    │
└──────┬───────────┘
       │
       │ 1. useEffect(() => fetch())
       ▼
┌──────────────────────┐
│ Estatisticas.tsx     │
│ GET /api/estatisticas│
└──────┬───────────────┘
       │
       │ 2. getEstatisticas()
       ▼
┌──────────────────────┐
│   database.ts        │
│ (Aggregation Queries)│
└──────┬───────────────┘
       │
       │ 3. AVG(), COUNT(), GROUP BY
       ▼
┌──────────────────┐
│   SQLite DB      │
│ (Cálculos)       │
└──────┬───────────┘
       │
       │ 4. Retorna agregações
       ▼
┌──────────────────────┐
│    JSON Response     │
│ { totalAvaliacoes,   │
│   médias, interesse }│
└──────┬───────────────┘
       │
       │ 5. setState(data)
       ▼
┌──────────────────────┐
│  Renderiza Cards     │
│ com Indicadores      │
└──────────────────────┘
```

### 8.3 Fluxo de Exportação PDF

```
┌──────────────────┐
│ Usuário clica    │
│ "Exportar PDF"   │
└──────┬───────────┘
       │
       │ 1. fetch('/api/avaliacoes')
       ▼
┌──────────────────────┐
│  getAllAvaliacoes()  │
│ + getAvaliacaoById() │
└──────┬───────────────┘
       │
       │ 2. Dados completos
       ▼
┌──────────────────┐
│   jsPDF          │
│ + autoTable      │
└──────┬───────────┘
       │
       │ 3. Gera documento
       ▼
┌──────────────────┐
│  PDF File        │
│ (download)       │
└──────────────────┘
```

---

## 9. Sistema de Build e Deploy

### 9.1 Scripts NPM

**Arquivo:** `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "server:watch": "tsx watch server/index.ts",
    "start": "concurrently \"npm run server:watch\" \"npm run dev\"",
    "build:frontend": "vite build",
    "build:backend": "node scripts/build-backend.js",
    "build": "npm run build:frontend && npm run build:backend",
    "preview": "vite preview",
    "start:prod": "NODE_ENV=production node dist/server/server/index.cjs"
  }
}
```

### 9.2 Build Frontend

**Ferramenta:** Vite
**Output:** `/dist/`

```bash
npm run build:frontend
```

**Gera:**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [outras fontes e imagens]
```

**Configuração:** `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'  // Dev mode proxy
    }
  }
});
```

### 9.3 Build Backend

**Script:** `scripts/build-backend.js`

**Processo:**

1. **Compila TypeScript → CommonJS**
   ```bash
   tsc --module commonjs --outDir dist/server server/**/*.ts
   ```

2. **Corrige imports relativos**
   - Remove extensões `.ts`
   - Adiciona `.cjs` onde necessário

3. **Renomeia arquivos**
   - `.js` → `.cjs` (módulos CommonJS explícitos)

**Output:** `/dist/server/`

```
dist/server/
├── server/
│   ├── index.cjs
│   └── database.cjs
```

### 9.4 Modo Desenvolvimento

```bash
npm start
```

**Executa concorrentemente:**
1. Backend: `tsx watch server/index.ts` (porta 3001)
2. Frontend: `vite` (porta 5173)

**Proxy automático:** Vite proxy `/api/*` → `http://localhost:3001`

### 9.5 Deploy - Opção 1: Render.com

**Arquivo:** `render.yaml`

```yaml
services:
  - type: web
    name: avaliacao-encontro
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    plan: free
    healthCheckPath: /api/health

    disk:
      name: avaliacoes-data
      mountPath: /app
      sizeGB: 1

    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

**Passos:**

1. Conectar repositório GitHub ao Render.com
2. Render detecta `render.yaml` automaticamente
3. Build e deploy automáticos em cada push
4. URL gerada: `https://avaliacao-encontro.onrender.com`

**Vantagens:**
- ✅ Zero configuração manual
- ✅ HTTPS automático
- ✅ Deploy contínuo (CD)
- ✅ Free tier disponível
- ✅ Persistent disk para SQLite

### 9.6 Deploy - Opção 2: VPS Linux

**Script:** `deploy/deploy.sh`

#### **Pré-requisitos do Sistema**

- Ubuntu/Debian Linux
- Acesso root ou sudo
- Porta 80 liberada (ou 443 para HTTPS)

#### **O que o Script Faz**

1. **Instala dependências:**
   - Node.js (via nvm)
   - Nginx
   - Git

2. **Configura diretório da aplicação:**
   ```bash
   mkdir -p /var/www/avaliacao-encontro
   ```

3. **Copia arquivos:**
   - Código buildado (`dist/`)
   - `package.json` e `package-lock.json`
   - `avaliacoes.db` (se existir)

4. **Instala dependências de produção:**
   ```bash
   npm ci --production
   ```

5. **Define permissões:**
   ```bash
   chown -R www-data:www-data /var/www/avaliacao-encontro
   ```

6. **Configura systemd service:**
   - Copia `deploy/avaliacao-encontro.service` → `/etc/systemd/system/`
   - Habilita e inicia serviço

7. **Configura Nginx:**
   - Copia `deploy/nginx.conf` → `/etc/nginx/sites-available/avaliacao-encontro`
   - Cria symlink em `sites-enabled`
   - Testa e recarrega configuração

8. **Verifica saúde:**
   - Testa endpoint `/api/health`

#### **Uso do Script**

```bash
# No servidor VPS
sudo ./deploy/deploy.sh
```

#### **Arquivos de Configuração**

##### **systemd Service** (`deploy/avaliacao-encontro.service`)

```ini
[Unit]
Description=Avaliacao Encontro Node.js Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/avaliacao-encontro
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node dist/server/server/index.cjs
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

##### **Nginx Config** (`deploy/nginx.conf`)

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;  # CONFIGURAR!

    # Frontend (SPA)
    location / {
        root /var/www/avaliacao-encontro/dist;
        try_files $uri $uri/ /index.html;

        # Cache para assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Sem cache para index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Limite de upload
    client_max_body_size 10M;
}
```

**Para HTTPS (opcional):**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado (automático)
sudo certbot --nginx -d seu-dominio.com.br
```

### 9.7 Arquitetura de Produção

```
                Internet
                   │
                   ▼
         ┌─────────────────┐
         │   Nginx :80     │
         │ Reverse Proxy   │
         └────────┬────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
    ┌─────────┐      ┌──────────────┐
    │ Static  │      │   Express    │
    │  Files  │      │   :3001      │
    │ (React) │      └──────┬───────┘
    └─────────┘             │
                            ▼
                    ┌───────────────┐
                    │  SQLite DB    │
                    │ avaliacoes.db │
                    └───────────────┘
```

---

## 10. Configuração e Variáveis de Ambiente

### 10.1 API Endpoint

**Arquivo:** `config/api.ts`

```typescript
const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3001'
  : '';

export default API_BASE_URL;
```

**Comportamento:**
- **Dev:** Requisições para `http://localhost:3001/api/*`
- **Prod:** Requisições para mesma origem `/api/*` (Nginx proxy)

### 10.2 Variáveis de Ambiente

| Variável | Default | Uso |
|----------|---------|-----|
| `NODE_ENV` | development | Modo de execução |
| `PORT` | 3001 | Porta do backend |

**Exemplo (.env - não commitado):**

```bash
NODE_ENV=production
PORT=3001
```

### 10.3 Tailwind Custom Config

**Arquivo:** `tailwind.config.js`

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'pastoral-blue': {
          500: '#0056A3',
        },
        'paroquia-gold': {
          500: '#D4AF37',
        },
        'paroquia-dark': {
          500: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

---

## 11. Segurança

### 11.1 Segurança Atual

#### **Implementado ✅**

1. **SQL Injection Protection**
   - Prepared statements (`better-sqlite3`)
   - Parametrização de queries

2. **CORS Configurado**
   - Controle de origens permitidas
   - Headers apropriados

3. **TypeScript Type Safety**
   - Validação de tipos em compile-time
   - Reduz erros de runtime

4. **Isolamento do Processo (systemd)**
   - `NoNewPrivileges=true`
   - `PrivateTmp=true`
   - User `www-data` (não root)

5. **Foreign Key Constraints**
   - Integridade referencial
   - Cascading deletes

### 11.2 Vulnerabilidades e Recomendações

#### **⚠️ Não Implementado (CRÍTICO)**

1. **Sem Autenticação/Autorização**

   **Problema:** Rotas administrativas (`/estatisticas`, `/interessados`) são públicas.

   **Recomendação:**
   ```typescript
   // Exemplo: Middleware de autenticação simples
   const authMiddleware = (req, res, next) => {
     const auth = req.headers.authorization;
     if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   };

   app.get('/api/estatisticas', authMiddleware, ...);
   app.get('/api/pastoral/interessados', authMiddleware, ...);
   ```

   **Alternativa:** HTTP Basic Auth com Nginx

2. **Sem Rate Limiting**

   **Problema:** Possibilidade de abuso (spam de avaliações, DDoS).

   **Recomendação:**
   ```bash
   npm install express-rate-limit
   ```

   ```typescript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutos
     max: 100, // max 100 requests
   });

   app.use('/api/', limiter);
   ```

3. **Sem HTTPS (se em produção)**

   **Problema:** Dados trafegam em texto plano.

   **Recomendação:** Certificado SSL com Let's Encrypt (Certbot)

4. **Sem Validação de Input**

   **Problema:** Aceita qualquer JSON no POST.

   **Recomendação:**
   ```bash
   npm install joi
   ```

   ```typescript
   import Joi from 'joi';

   const evaluationSchema = Joi.object({
     basicInfo: Joi.object({
       coupleName: Joi.string().max(200),
       encounterDate: Joi.date(),
     }),
     preEncontro: Joi.object({
       communicationClarity: Joi.number().min(0).max(5).required(),
       // ...
     }),
   });

   app.post('/api/avaliacoes', (req, res) => {
     const { error } = evaluationSchema.validate(req.body);
     if (error) return res.status(400).json({ error: error.details });
     // ...
   });
   ```

5. **Sem Security Headers**

   **Recomendação:**
   ```bash
   npm install helmet
   ```

   ```typescript
   import helmet from 'helmet';
   app.use(helmet());
   ```

### 11.3 Checklist de Segurança para Produção

- [ ] Implementar autenticação para rotas admin
- [ ] Adicionar rate limiting
- [ ] Configurar HTTPS
- [ ] Validação de input (Joi ou similar)
- [ ] Security headers (Helmet.js)
- [ ] CSRF protection
- [ ] Configurar firewall (UFW)
- [ ] Backup automático do banco
- [ ] Monitoramento de logs
- [ ] Ocultar versões de software (X-Powered-By)

---

## 12. Performance e Otimizações

### 12.1 Frontend

#### **Build Otimizado**
- ✅ Code splitting automático (Vite)
- ✅ Tree shaking (imports não usados removidos)
- ✅ Minificação de JS e CSS
- ✅ Hash de arquivos para cache busting

#### **Otimizações React**
```typescript
// Memoização de componentes caros
const StarRating = React.memo(({ value, onChange, label }) => {
  // ...
});

// Callbacks memoizados
const handleRatingChange = useCallback((field, value) => {
  setFormData(prev => ({...prev, [field]: value}));
}, []);
```

#### **Assets**
- ✅ Imagens otimizadas
- ✅ Fonts via Google Fonts CDN (cache compartilhado)
- ✅ SVGs inline (reduz requisições)

### 12.2 Backend

#### **SQLite Otimizações**
- ✅ WAL mode (Write-Ahead Logging) ativado por padrão
- ✅ Prepared statements (queries compiladas)
- ✅ Índices automáticos em PRIMARY KEYs
- ✅ Single connection (ideal para SQLite)

#### **Transações**
```typescript
// Inserção atômica (mais rápida e segura)
const transaction = db.transaction((data) => {
  // Múltiplos INSERTs em uma transação
});
```

#### **Agregações Eficientes**
```sql
-- Usa índices e agregações nativas do SQLite
SELECT AVG(communication_clarity) FROM pre_encontro;
```

### 12.3 Nginx

#### **Cache de Arquivos Estáticos**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

#### **Compressão Gzip**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

#### **Keep-Alive**
```nginx
keepalive_timeout 65;
keepalive_requests 100;
```

### 12.4 Métricas de Performance

**Lighthouse (estimado):**
- Performance: ~95/100
- Accessibility: ~90/100
- Best Practices: ~85/100
- SEO: ~80/100

**Tempos de Resposta (estimados):**
- GET /api/estatisticas: ~50ms
- POST /api/avaliacoes: ~100ms
- Load página inicial: ~1.5s (first contentful paint)

---

## 13. Monitoramento e Logs

### 13.1 Logs do Backend

#### **Console Logs**

```typescript
// server/index.ts
console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
console.log(`📊 Banco de dados inicializado`);
console.log(`✅ Avaliação criada com sucesso (ID: ${id})`);
```

#### **Logs do systemd**

```bash
# Ver logs em tempo real
sudo journalctl -u avaliacao-encontro -f

# Ver logs de hoje
sudo journalctl -u avaliacao-encontro --since today

# Ver últimas 100 linhas
sudo journalctl -u avaliacao-encontro -n 100

# Ver logs com filtro de erro
sudo journalctl -u avaliacao-encontro -p err
```

### 13.2 Logs do Nginx

#### **Access Log**

Localização: `/var/log/nginx/avaliacao-encontro-access.log`

```bash
# Monitorar requisições em tempo real
tail -f /var/log/nginx/avaliacao-encontro-access.log

# Contar requisições por endpoint
awk '{print $7}' /var/log/nginx/avaliacao-encontro-access.log | sort | uniq -c
```

#### **Error Log**

Localização: `/var/log/nginx/avaliacao-encontro-error.log`

```bash
# Ver erros
tail -100 /var/log/nginx/avaliacao-encontro-error.log
```

### 13.3 Monitoramento do Serviço

```bash
# Status do serviço
sudo systemctl status avaliacao-encontro

# Verificar se está rodando
sudo systemctl is-active avaliacao-encontro

# Verificar tempo de uptime
sudo systemctl show avaliacao-encontro -p ActiveEnterTimestamp
```

### 13.4 Health Check

```bash
# Verificar saúde da API
curl http://localhost:3001/api/health

# Resposta esperada:
{"status":"ok"}
```

### 13.5 Monitoramento Recomendado (Futuro)

1. **PM2** (Process Manager)
   - Monitoramento de CPU/Memória
   - Auto-restart em crash
   - Load balancing

2. **Log Agregação**
   - Graylog ou ELK Stack
   - Centralização de logs

3. **Monitoring Externo**
   - UptimeRobot (ping HTTP)
   - Datadog ou New Relic (APM)

4. **Alertas**
   - Email ou Slack em caso de erro
   - Notificação se serviço cair

---

## 14. Manutenção e Backup

### 14.1 Backup do Banco de Dados

#### **Backup Manual**

```bash
# Criar backup com timestamp
cp /var/www/avaliacao-encontro/avaliacoes.db \
   /backup/avaliacoes-$(date +%Y%m%d-%H%M%S).db
```

#### **Backup Automatizado (Cron)**

```bash
# Editar crontab
sudo crontab -e

# Adicionar: Backup diário às 2h da manhã
0 2 * * * cp /var/www/avaliacao-encontro/avaliacoes.db \
          /backup/avaliacoes-$(date +\%Y\%m\%d).db

# Backup com rotação (manter últimos 30 dias)
0 2 * * * /usr/local/bin/backup-avaliacoes.sh
```

**Script de backup com rotação:**

```bash
#!/bin/bash
# /usr/local/bin/backup-avaliacoes.sh

BACKUP_DIR="/backup/avaliacoes"
DB_PATH="/var/www/avaliacao-encontro/avaliacoes.db"
DATE=$(date +%Y%m%d-%H%M%S)

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Fazer backup
cp $DB_PATH $BACKUP_DIR/avaliacoes-$DATE.db

# Manter apenas últimos 30 dias
find $BACKUP_DIR -name "avaliacoes-*.db" -mtime +30 -delete

# Compactar backups antigos (7+ dias)
find $BACKUP_DIR -name "avaliacoes-*.db" -mtime +7 ! -name "*.gz" -exec gzip {} \;
```

#### **Backup Remoto (Recomendado)**

```bash
# Sincronizar com S3 (AWS)
aws s3 sync /backup/avaliacoes s3://seu-bucket/avaliacoes-backup/

# Ou com rsync (outro servidor)
rsync -avz /backup/avaliacoes user@backup-server:/backups/
```

### 14.2 Restauração do Banco

```bash
# Parar serviço
sudo systemctl stop avaliacao-encontro

# Restaurar backup
cp /backup/avaliacoes-20251107.db \
   /var/www/avaliacao-encontro/avaliacoes.db

# Ajustar permissões
sudo chown www-data:www-data /var/www/avaliacao-encontro/avaliacoes.db

# Reiniciar serviço
sudo systemctl start avaliacao-encontro
```

### 14.3 Gerenciamento do Serviço

```bash
# Iniciar
sudo systemctl start avaliacao-encontro

# Parar
sudo systemctl stop avaliacao-encontro

# Reiniciar
sudo systemctl restart avaliacao-encontro

# Status
sudo systemctl status avaliacao-encontro

# Habilitar inicialização automática
sudo systemctl enable avaliacao-encontro

# Desabilitar inicialização automática
sudo systemctl disable avaliacao-encontro
```

### 14.4 Atualização da Aplicação

```bash
# 1. No ambiente de desenvolvimento, fazer build
npm run build

# 2. Transferir arquivos para servidor
scp -r dist/ user@servidor:/tmp/avaliacao-new/

# 3. No servidor
sudo systemctl stop avaliacao-encontro

# 4. Backup do código atual
sudo mv /var/www/avaliacao-encontro /var/www/avaliacao-encontro.bak

# 5. Copiar nova versão
sudo mv /tmp/avaliacao-new /var/www/avaliacao-encontro

# 6. Restaurar banco de dados
sudo cp /var/www/avaliacao-encontro.bak/avaliacoes.db \
        /var/www/avaliacao-encontro/

# 7. Instalar dependências
cd /var/www/avaliacao-encontro
sudo npm ci --production

# 8. Ajustar permissões
sudo chown -R www-data:www-data /var/www/avaliacao-encontro

# 9. Reiniciar
sudo systemctl start avaliacao-encontro

# 10. Verificar saúde
curl http://localhost:3001/api/health
```

### 14.5 Limpeza de Logs

```bash
# Limpar logs antigos do systemd (> 2 semanas)
sudo journalctl --vacuum-time=2weeks

# Rotacionar logs do Nginx (já configurado automaticamente via logrotate)
sudo logrotate /etc/logrotate.d/nginx
```

### 14.6 Manutenção do Banco de Dados

```bash
# Entrar no console SQLite
sqlite3 /var/www/avaliacao-encontro/avaliacoes.db

-- Ver tamanho do banco
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();

-- Otimizar (desfragmentar)
VACUUM;

-- Verificar integridade
PRAGMA integrity_check;

-- Reindexar
REINDEX;
```

---

## 15. Desenvolvimento Local

### 15.1 Requisitos

- **Node.js:** v18+ (recomendado: v20 LTS)
- **npm:** v9+
- **Git**

### 15.2 Setup Inicial

```bash
# 1. Clonar repositório
git clone https://github.com/seu-usuario/avaliacao-encontro.git
cd avaliacao-encontro

# 2. Instalar dependências
npm install

# 3. Iniciar ambiente de desenvolvimento
npm start
```

Servidores iniciados:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- **API:** http://localhost:3001/api/*

### 15.3 Estrutura de Desenvolvimento

```bash
# Apenas frontend (com hot reload)
npm run dev

# Apenas backend (com hot reload)
npm run server:watch

# Ambos simultaneamente
npm start
```

### 15.4 Reset do Banco de Dados

```bash
# Excluir banco
rm avaliacoes.db

# Reiniciar servidor (recria tabelas automaticamente)
npm run server:watch
```

### 15.5 Populando Dados de Teste

**Script manual (pode ser criado):**

```typescript
// scripts/seed.ts
import Database from 'better-sqlite3';

const db = new Database('avaliacoes.db');

// Inserir avaliações de teste
for (let i = 1; i <= 10; i++) {
  // INSERT sample data
}

console.log('✅ Banco populado com dados de teste');
```

```bash
# Executar
tsx scripts/seed.ts
```

### 15.6 Debug

#### **Frontend (React DevTools)**

1. Instalar extensão: [React DevTools](https://react.dev/learn/react-developer-tools)
2. Inspecionar componentes e estado
3. Usar `console.log` ou breakpoints no navegador

#### **Backend (Node.js)**

```bash
# Debug com tsx
tsx --inspect server/index.ts

# Conectar Chrome DevTools
# chrome://inspect
```

**VS Code launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "tsx",
      "args": ["server/index.ts"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 15.7 Testes (Futuro)

**Frameworks recomendados:**

- **Frontend:** Vitest + React Testing Library
- **Backend:** Jest ou Vitest
- **E2E:** Playwright ou Cypress

**Exemplo de configuração:**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

### 15.8 Lint e Formatação

**Recomendado adicionar:**

```bash
npm install -D eslint prettier
```

**package.json:**
```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"**/*.{ts,tsx,css,md}\""
  }
}
```

---

## 16. Limitações e Melhorias Futuras

### 16.1 Limitações Atuais

#### **Funcionalidades**
1. ❌ Sem autenticação/autorização
2. ❌ Sem exportação CSV/Excel (apenas PDF)
3. ❌ Sem busca/filtros avançados nas páginas admin
4. ❌ Sem envio de emails automatizados
5. ❌ Sem analytics/métricas de uso
6. ❌ Sem edição ou exclusão de avaliações
7. ❌ Sem multi-tenancy (uma paróquia por instância)
8. ❌ Sem internacionalização (apenas PT-BR)

#### **Técnicas**
1. ⚠️ SQLite (limitação de concorrência em alta escala)
2. ⚠️ Sem cache (Redis, etc.)
3. ⚠️ Sem load balancing
4. ⚠️ Sem testes automatizados
5. ⚠️ Sem CI/CD configurado
6. ⚠️ Sem monitoring/alerting
7. ⚠️ Sem versionamento de API

### 16.2 Roadmap de Melhorias

#### **Fase 1: Segurança e Estabilidade**

- [ ] Implementar autenticação básica (JWT ou sessões)
- [ ] Adicionar validação de input (Joi/Zod)
- [ ] Rate limiting
- [ ] Configurar HTTPS
- [ ] Security headers (Helmet)
- [ ] Backup automatizado

#### **Fase 2: Funcionalidades Admin**

- [ ] Dashboard: Filtros por data, nome do casal
- [ ] Busca full-text em comentários
- [ ] Edição de avaliações (soft delete)
- [ ] Exportação CSV/Excel
- [ ] Gráficos interativos (Chart.js, Recharts)
- [ ] Comparação entre encontros

#### **Fase 3: Comunicação**

- [ ] Email: Confirmação após avaliação
- [ ] Email: Relatórios semanais para pastoral
- [ ] Integração WhatsApp (notificações)
- [ ] Templates de email personalizáveis

#### **Fase 4: Experiência do Usuário**

- [ ] PWA (Progressive Web App)
- [ ] Modo offline (Service Worker)
- [ ] Dark mode
- [ ] Acessibilidade (WCAG 2.1 AA)
- [ ] Internacionalização (i18n)
- [ ] Animações e micro-interações

#### **Fase 5: Escalabilidade**

- [ ] Migração para PostgreSQL (se necessário)
- [ ] Cache com Redis
- [ ] Upload de fotos (S3, Cloudinary)
- [ ] CDN para assets
- [ ] Horizontal scaling (PM2 cluster)

#### **Fase 6: Analytics e Insights**

- [ ] Google Analytics integração
- [ ] Dashboard de métricas de uso
- [ ] Análise de sentimento em comentários (IA)
- [ ] Relatórios automatizados (BI)
- [ ] Predições de interesse pastoral (ML)

#### **Fase 7: Multi-tenancy**

- [ ] Suporte para múltiplas paróquias
- [ ] Subdominios ou paths por paróquia
- [ ] Branding personalizável por paróquia
- [ ] Permissões granulares

### 16.3 Estimativas de Esforço

| Fase | Esforço | Prioridade |
|------|---------|------------|
| Fase 1 | 2-3 semanas | 🔴 Alta |
| Fase 2 | 3-4 semanas | 🟡 Média |
| Fase 3 | 2-3 semanas | 🟡 Média |
| Fase 4 | 4-5 semanas | 🟢 Baixa |
| Fase 5 | 5-6 semanas | 🟢 Baixa |
| Fase 6 | 4-6 semanas | 🟢 Baixa |
| Fase 7 | 8-10 semanas | 🟢 Baixa |

---

## 17. Referências e Recursos

### 17.1 Documentação Oficial

- **React:** https://react.dev/
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Vite:** https://vitejs.dev/
- **Express:** https://expressjs.com/
- **SQLite:** https://www.sqlite.org/docs.html
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Nginx:** https://nginx.org/en/docs/

### 17.2 Bibliotecas Utilizadas

- **better-sqlite3:** https://github.com/WiseLibs/better-sqlite3
- **jsPDF:** https://github.com/parallax/jsPDF
- **React Router:** https://reactrouter.com/

### 17.3 Ferramentas

- **Node Version Manager (nvm):** https://github.com/nvm-sh/nvm
- **PM2 (Process Manager):** https://pm2.keymetrics.io/
- **Let's Encrypt (SSL):** https://letsencrypt.org/

---

## 18. Suporte e Contato

### 18.1 Mantenedor

**Desenvolvido para:**
Paróquia São Benedito - Pastoral Familiar
Diocese de São José dos Campos

### 18.2 Reportar Issues

Para reportar bugs ou sugerir melhorias:

1. Abrir issue no repositório GitHub
2. Incluir:
   - Descrição do problema
   - Steps to reproduce
   - Screenshots (se aplicável)
   - Logs relevantes

### 18.3 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork do repositório
2. Criar branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m "Add: nova funcionalidade"`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abrir Pull Request

---

## Conclusão

Este sistema representa uma solução **completa e funcional** para digitalização do processo de avaliação de Encontros de Noivos. Construído com tecnologias modernas e seguindo boas práticas, está pronto para uso em produção com as devidas configurações de segurança.

A arquitetura limpa e modular facilita manutenção e futuras expansões, enquanto a documentação completa garante que a equipe possa operar e evoluir o sistema com autonomia.

**Próximos passos recomendados:**
1. ✅ Deploy em ambiente de produção
2. 🔒 Implementar autenticação
3. 📊 Coletar primeiras avaliações
4. 📈 Analisar dados e iterar melhorias

---

**Versão da Documentação:** 1.0
**Última Atualização:** Novembro 2025
**Autor:** Sistema desenvolvido para Pastoral Familiar - Paróquia São Benedito
