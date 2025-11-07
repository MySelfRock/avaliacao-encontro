# Análise de Gaps - Sistema de Autenticação e Autorização SaaS

## 📋 Situação Atual

### ✅ O que já temos:

1. **Multi-tenancy Básico**
   - ✅ Tabela `pastorais` com subdomínios
   - ✅ Middleware que detecta pastoral por subdomínio
   - ✅ Isolamento de dados por `pastoral_id`

2. **Autenticação Simples**
   - ✅ Token fixo `ADMIN_TOKEN` para rotas `/api/admin`
   - ✅ Middleware `authMiddleware` que valida Bearer token
   - ⚠️ Mas é um token ÚNICO para todos os admins

3. **Segurança**
   - ✅ Helmet configurado
   - ✅ Rate limiting em 3 níveis
   - ✅ CORS com validação dinâmica

### ❌ O que está faltando:

## 🔴 GAPS CRÍTICOS

### 1. Sistema de Usuários
**Status**: ❌ NÃO EXISTE

**Problema**: Não há tabela de usuários no banco de dados

**Necessário**:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('super_admin', 'pastoral_admin')) NOT NULL,
  pastoral_id INTEGER, -- NULL para super_admin, preenchido para pastoral_admin
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  FOREIGN KEY (pastoral_id) REFERENCES pastorais(id) ON DELETE CASCADE
);
```

### 2. Diferenciação de Roles
**Status**: ❌ NÃO EXISTE

**Problema**: Sistema atual não diferencia entre:
- **Super Admin**: Acesso total ao sistema
- **Pastoral Admin**: Acesso apenas à sua pastoral

**Necessário**:
- Sistema de roles (RBAC - Role-Based Access Control)
- Middleware que verifica role do usuário
- Proteção de rotas baseada em role

### 3. Autenticação Real (Login/Logout)
**Status**: ❌ NÃO EXISTE

**Problema**: Não há endpoints de login/logout

**Necessário**:
```
POST /api/auth/login
  Body: { email, password }
  Response: { token, user: { id, name, role, pastoral_id } }

POST /api/auth/logout
  Body: { token }
  Response: { success: true }

GET /api/auth/me
  Headers: { Authorization: Bearer <token> }
  Response: { user: { id, name, role, pastoral_id } }
```

### 4. Gestão de Senhas
**Status**: ❌ NÃO EXISTE

**Problema**: Não há sistema de hash de senhas

**Necessário**:
- Hash de senhas com bcrypt
- Validação de força de senha
- Endpoints de reset de senha (futuro)

### 5. JWT (JSON Web Tokens)
**Status**: ❌ NÃO EXISTE

**Problema**: Token atual é fixo e compartilhado

**Necessário**:
- Gerar tokens JWT únicos por sessão
- Incluir dados do usuário no token (id, role, pastoral_id)
- Expiração de tokens
- Refresh tokens (futuro)

### 6. Status Ativo/Bloqueado para Pastorais
**Status**: ❌ NÃO EXISTE

**Problema**: Não há como bloquear acesso de uma pastoral

**Necessário**:
```sql
ALTER TABLE pastorais ADD COLUMN is_active BOOLEAN DEFAULT 1;
ALTER TABLE pastorais ADD COLUMN blocked_reason TEXT;
ALTER TABLE pastorais ADD COLUMN blocked_at DATETIME;
```

### 7. Autorização por Contexto
**Status**: ❌ NÃO IMPLEMENTADO

**Problema**: Não há verificação se usuário pode acessar recurso da pastoral

**Exemplo do problema**:
```
Usuário da Pastoral A tenta acessar:
GET /api/encontros/123 (que pertence à Pastoral B)

Atualmente: ❌ Pode acessar (apenas filtro por subdomínio)
Deveria: ✅ Bloquear com 403 Forbidden
```

### 8. Logs de Auditoria
**Status**: ❌ NÃO EXISTE

**Problema**: Sem rastreamento de quem fez o quê

**Necessário**:
```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pastoral_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 📊 Arquitetura Proposta

### Níveis de Acesso

```
┌─────────────────────────────────────────────────────┐
│                   SUPER ADMIN                        │
│  - Gerencia todas as pastorais                      │
│  - Cria/bloqueia/ativa pastorais                   │
│  - Cria admins para cada pastoral                   │
│  - Acessa todos os dados (cross-pastoral)          │
│  - Visualiza métricas globais                       │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              PASTORAL ADMIN (Pastoral A)             │
│  - Acessa APENAS dados da Pastoral A                │
│  - Gerencia encontros da Pastoral A                 │
│  - Visualiza avaliações da Pastoral A               │
│  - Exporta relatórios da Pastoral A                 │
│  - NÃO pode acessar Pastoral B, C, D...            │
└─────────────────────────────────────────────────────┘
```

### Fluxo de Autenticação

```
1. Login
   POST /api/auth/login
   { email: "admin@pastoral.com", password: "***" }
   ↓
   Validar credenciais no banco
   ↓
   Gerar JWT com: { userId, role, pastoralId, exp }
   ↓
   Retornar token para cliente
   ↓
   Cliente armazena no localStorage/sessionStorage

2. Requisição Autenticada
   GET /api/encontros
   Headers: { Authorization: "Bearer eyJhbGc..." }
   ↓
   authMiddleware: Validar JWT
   ↓
   Extrair userId, role, pastoralId do token
   ↓
   Injetar req.user = { id, role, pastoralId }
   ↓
   roleMiddleware: Verificar se role pode acessar rota
   ↓
   contextMiddleware: Verificar se pastoral do user = pastoral do recurso
   ↓
   Executar lógica da rota

3. Logout
   POST /api/auth/logout
   ↓
   Invalidar token (blacklist ou expiração forçada)
   ↓
   Cliente remove token do storage
```

### Estrutura de Middleware

```typescript
// 1. authMiddleware - Valida JWT e injeta req.user
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, pastoralId }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// 2. roleMiddleware - Verifica se role pode acessar
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
};

// 3. contextMiddleware - Verifica se pode acessar recurso
const requireOwnPastoral = (req, res, next) => {
  // Super admin pode acessar tudo
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Pastoral admin só pode acessar sua própria pastoral
  if (req.pastoral?.id !== req.user.pastoralId) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Você não tem permissão para acessar esta pastoral'
    });
  }

  next();
};

// 4. checkPastoralActive - Verifica se pastoral está ativa
const checkPastoralActive = (req, res, next) => {
  if (!req.pastoral?.is_active) {
    return res.status(403).json({
      error: 'Pastoral bloqueada',
      message: 'Esta pastoral está temporariamente desabilitada. Entre em contato com o suporte.'
    });
  }
  next();
};
```

### Rotas Protegidas

```typescript
// ============================================
// ROTAS DO SUPER ADMIN
// ============================================
// Apenas super_admin pode acessar
app.get('/api/admin/pastorais',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => { /* ... */ }
);

app.post('/api/admin/pastorais',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => { /* ... */ }
);

app.put('/api/admin/pastorais/:id/block',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => { /* bloquear pastoral */ }
);

app.post('/api/admin/users',
  authMiddleware,
  requireRole('super_admin'),
  adminLimiter,
  (req, res) => { /* criar admin de pastoral */ }
);

// ============================================
// ROTAS DO PASTORAL ADMIN
// ============================================
// Super admin OU pastoral admin da própria pastoral
app.get('/api/encontros',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => { /* listar encontros */ }
);

app.post('/api/encontros',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  writeLimiter,
  (req, res) => { /* criar encontro */ }
);

app.get('/api/avaliacoes',
  authMiddleware,
  requireRole('super_admin', 'pastoral_admin'),
  requireOwnPastoral,
  checkPastoralActive,
  (req, res) => { /* listar avaliações */ }
);

// ============================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================
app.post('/api/auth/login', (req, res) => { /* login */ });
app.post('/api/avaliacoes', writeLimiter, (req, res) => {
  /* Casais preenchem avaliação - não precisa auth */
});
```

---

## 🛠️ Implementação Necessária

### Fase 1: Estrutura de Banco (1 dia)

**Arquivos a modificar**:
- `server/database.ts`

**Tarefas**:
1. ✅ Criar tabela `users`
2. ✅ Adicionar coluna `is_active` em `pastorais`
3. ✅ Adicionar colunas `blocked_reason`, `blocked_at` em `pastorais`
4. ✅ Criar tabela `audit_logs` (opcional, mas recomendado)
5. ✅ Criar funções CRUD para usuários
6. ✅ Criar seed de super admin inicial

### Fase 2: Autenticação JWT (1-2 dias)

**Dependências necessárias**:
```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

**Arquivos a criar/modificar**:
- `server/auth.ts` (novo) - Lógica de autenticação
- `server/index.ts` - Rotas de login/logout
- `.env.example` - Adicionar JWT_SECRET

**Tarefas**:
1. ✅ Implementar hash de senhas com bcryptjs
2. ✅ Implementar geração de JWT
3. ✅ Implementar validação de JWT
4. ✅ Criar endpoint POST /api/auth/login
5. ✅ Criar endpoint POST /api/auth/logout
6. ✅ Criar endpoint GET /api/auth/me

### Fase 3: Middleware de Autorização (1 dia)

**Arquivos a modificar**:
- `server/index.ts`

**Tarefas**:
1. ✅ Substituir authMiddleware atual por validação JWT
2. ✅ Criar requireRole middleware
3. ✅ Criar requireOwnPastoral middleware
4. ✅ Criar checkPastoralActive middleware
5. ✅ Aplicar middlewares em todas as rotas

### Fase 4: Rotas de Gerenciamento (1 dia)

**Arquivos a modificar**:
- `server/index.ts`
- `server/database.ts`

**Tarefas**:
1. ✅ Criar endpoint para super admin criar usuários
2. ✅ Criar endpoint para super admin listar usuários
3. ✅ Criar endpoint para super admin bloquear pastoral
4. ✅ Criar endpoint para super admin ativar pastoral
5. ✅ Criar endpoint para usuário trocar senha

### Fase 5: Frontend (2-3 dias)

**Arquivos a criar/modificar**:
- `components/Login.tsx` (novo)
- `components/Dashboard.tsx` (modificar)
- `components/AdminPanel.tsx` (novo - super admin)
- `hooks/useAuth.ts` (novo)

**Tarefas**:
1. ✅ Criar tela de login
2. ✅ Implementar gestão de token (localStorage)
3. ✅ Criar ProtectedRoute component
4. ✅ Criar painel de super admin
5. ✅ Criar painel de pastoral admin

### Fase 6: Testes e Deploy (1 dia)

**Tarefas**:
1. ✅ Testar login como super admin
2. ✅ Testar login como pastoral admin
3. ✅ Testar bloqueio de pastoral
4. ✅ Testar isolamento de dados
5. ✅ Testar logs de auditoria

---

## 📝 Resumo de Gaps

| # | Gap | Criticidade | Esforço | Status |
|---|-----|-------------|---------|--------|
| 1 | Tabela de usuários | 🔴 Crítico | 4h | ❌ Não existe |
| 2 | Sistema de roles | 🔴 Crítico | 4h | ❌ Não existe |
| 3 | Autenticação JWT | 🔴 Crítico | 8h | ❌ Não existe |
| 4 | Login/Logout | 🔴 Crítico | 4h | ❌ Não existe |
| 5 | Hash de senhas | 🔴 Crítico | 2h | ❌ Não existe |
| 6 | Status pastoral | 🔴 Crítico | 2h | ❌ Não existe |
| 7 | Autorização contextual | 🟠 Alto | 4h | ❌ Não existe |
| 8 | Middleware de roles | 🟠 Alto | 4h | ❌ Não existe |
| 9 | Logs de auditoria | 🟡 Médio | 4h | ❌ Não existe |
| 10 | Frontend de login | 🔴 Crítico | 8h | ❌ Não existe |
| 11 | Painel super admin | 🟠 Alto | 8h | ❌ Não existe |
| 12 | Gestão de usuários | 🟠 Alto | 4h | ❌ Não existe |

**Total estimado**: ~56 horas (7-8 dias de trabalho)

---

## 🎯 Priorização

### Prioridade 1 (Crítico - AGORA)
- ✅ Tabela de usuários
- ✅ Sistema de roles
- ✅ Autenticação JWT
- ✅ Login/Logout
- ✅ Status ativo/bloqueado para pastorais

### Prioridade 2 (Alto - Esta Semana)
- ✅ Autorização contextual
- ✅ Middleware de roles
- ✅ Frontend de login
- ✅ Painel super admin básico

### Prioridade 3 (Médio - Próxima Sprint)
- ⏳ Logs de auditoria
- ⏳ Reset de senha
- ⏳ Gestão avançada de usuários
- ⏳ Painel completo de super admin

---

## 🚀 Próximo Passo

**IMPLEMENTAR FASE 1**: Estrutura de banco de dados com usuários e roles

Posso começar a implementação agora?
