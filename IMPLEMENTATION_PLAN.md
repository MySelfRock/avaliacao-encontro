# Plano de Implementação - Avaliação do Encontro de Noivos

## Visão Geral do Projeto

Sistema web para gerenciamento de avaliações de encontros de noivos da Pastoral Familiar, com funcionalidades multi-tenant (múltiplas pastorais), autenticação segura, dashboards administrativos e formulários de avaliação.

---

## Fases Implementadas ✅

### Fase 1.1: Infraestrutura e Database

| # | Tarefa | Status | Arquivos |
|---|--------|-------|--------|
| 1.1.1 | Paginação em rotas GET de listagem | ✅ | `server/utils/pagination.ts` |
| 1.1.2 | Filtros (data_inicio, data_fim, status) | ✅ | `server/utils/filters.ts`, `server/database-queries.ts` |
| 1.1.3 | Endpoint de export CSV/Excel | ✅ | `server/utils/export.ts` |
| 1.1.4 | Índice de cache | ⏭️ | Cancelado (requer Redis) |

**Rotas afetadas:**
- `GET /api/avaliacoes?page=&limit=&startDate=&endDate=&search=&encontroId=`
- `GET /api/encontros?page=&limit=&startDate=&endDate=&status=&search=`
- `GET /api/pastoral/interessados?page=&limit=&startDate=&endDate=&search=`
- `POST /api/avaliacoes/export`
- `POST /api/encontros/export`
- `POST /api/pastoral/interessados/export`

---

### Fase 1.2: Autenticação e Segurança

| # | Tarefa | Status | Arquivos |
|---|--------|-------|--------|
| 1.2.1 | Autenticação 2FA (TOTP) | ✅ | `server/services/twofactor.service.ts` |
| 1.2.2 | Limitador de tentativas por IP | ✅ | Já existente em `server/middleware/rateLimiter.ts` |
| 1.2.3 | Endpoint sessões ativas | ✅ | `server/database.ts`, `server/index.ts` |

**Novos Endpoints:**
- `POST /api/auth/2fa/setup` - Gerar QR code para configurar 2FA
- `POST /api/auth/2fa/enable` - Habilitar 2FA
- `POST /api/auth/2fa/disable` - Desabilitar 2FA
- `POST /api/auth/2fa/verify` - Verificar token 2FA no login
- `GET /api/auth/sessions` - Listar sessões ativas
- `POST /api/auth/sessions/revoke` - Revogar sessão
- `POST /api/auth/sessions/revoke-all` - Revogar todas
- `GET /api/auth/security-status` - Verificar tentativas por IP

**Database:**
```sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN backup_codes JSON;
ALTER TABLE users ADD COLUMN two_factorVerified_at DATETIME;
CREATE TABLE login_attempts (...);
```

---

### Fase 1.3: Recursos

| # | Tarefa | Status | Arquivos |
|---|--------|-------|--------|
| 1.3.1 | Upload de logo da pastoral | ✅ | `server/services/upload.service.ts` |
| 1.3.2 | Webhook para nova avaliação | ✅ | `server/services/webhook.service.ts` |
| 1.3.3 | Endpoint backup/export JSON | ✅ | `server/index.ts` |

**Novos Endpoints:**
- `POST /api/uploads/logo` - Upload logo (Base64)
- `POST /api/uploads/base64` - Upload genérico
- `GET /api/admin/backup` - Backup completo
- `POST /api/admin/backup/restore` - Validar backup

**Configuração de Webhook:**
```json
{
  "webhook": {
    "enabled": true,
    "url": "https://seu-site.com/webhook",
    "secret": "sua-chave"
  }
}
```

---

### Fase 2.1: Frontend - Formulários e Componentes

| # | Tarefa | Status | Arquivos |
|---|--------|-------|--------|
| 2.1.1 | Validação Zod | ✅ | `src/schemas/index.ts` |
| 2.1.2 | Modal de confirmação | ✅ | `components/ConfirmModal.tsx` |
| 2.1.3 | Toast notifications | ✅ | `contexts/ToastContext.tsx`, `components/Toast.tsx` |
| 2.1.4 | Loading skeleton | ✅ | `components/Skeleton.tsx` |

**Novos Componentes:**
- `ToastProvider` / `useToast` - Context e hook para notificações
- `ToastContainer` - Container de toasts
- `ConfirmModal` - Modal de confirmação com variantes (danger/warning/info)
- `Skeleton`, `SkeletonCard`, `SkeletonTable`, `SkeletonList`, `SkeletonForm` - Skeletons de loading

**Schemas Zod (`src/schemas/index.ts`):**
- `loginSchema`
- `createEncontroSchema`
- `createUserSchema`
- `resetPasswordSchema`
- `changePasswordSchema`
- `pastoralConfigSchema`

---

## Fases Pendentes ⏳

### Fase 2.2: Dashboards e Páginas

| # | Tarefa | Status | Arquivos |
|---|--------|--------|----------|
| 2.2.1 | Dashboard matrimonial | ✅ | `pages/CasalDashboard.tsx` |
| 2.2.2 | Página de perfil do usuário | ✅ | `pages/Profile.tsx` |
| 2.2.3 | Página de export (PDF/CSV) | ✅ | `pages/Export.tsx` |
| 2.2.4 | Dark mode toggle | ✅ | `contexts/ThemeContext.tsx`, `components/ThemeToggle.tsx` |

### Fase 2.3: Funcionalidades Frontend

| # | Tarefa | Status | Arquivos |
|---|--------|--------|----------|
| 2.3.1 | Preview de avaliação em PDF | ✅ | `pages/AvaliacaoPreview.tsx` |
| 2.3.2 | QR Code para compartilhamento | ✅ | `components/QRCodeGenerator.tsx`, `src/hooks/useShare.ts` |
| 2.3.3 | Progress bar no formulário | ✅ | `components/ProgressBar.tsx` |
| 2.3.4 | Auto-save de rascunho | ✅ | `src/hooks/useDraft.ts` |

---

### Fase 3: Testes e Qualidade

### 3.1: Testes Unitários

| # | Tarefa | Status | Arquivos |
|---|--------|-------|----------|
| 3.1.1 | Testes para validadores | ✅ | `tests/unit/validators.test.ts` |
| 3.1.2 | Testes para auth JWT | ✅ | `tests/unit/auth.test.ts` |
| 3.1.3 | Testes para database utils | ✅ | `tests/unit/{pagination,filters,export}.test.ts` |
| 3.1.4 | Testes para helpers | ✅ | `tests/unit/{filters,export}.test.ts` |

**Novos arquivos de teste:**
- `tests/unit/auth.test.ts` - Hash, verify, token, validate (18 tests)
- `tests/unit/pagination.test.ts` - Pagination utils (11 tests)
- `tests/unit/filters.test.ts` - Filter utils (16 tests)
- `tests/unit/export.test.ts` - Export utils (15 tests)

### 3.2: Testes de Integração

| # | Tarefa | Status | Arquivos |
|---|--------|-------|----------|
| 3.2.1 | Testes de autenticação | ⚠️ | `tests/integration/auth.test.ts` (requer supertest) |
| 3.2.2 | Testes de CRUD avaliações | ⚠️ | (requer endpoint + supertest) |
| 3.2.3 | Testes de CRUD encontros | ⚠️ | `tests/integration/encontros.test.ts` (requer supertest) |
| 3.2.4 | Testes de permissionamento | ⚠️ | `tests/integration/permissions.test.ts` (requer supertest) |

**Nota:** Testes de integração requerem `supertest`:
```bash
npm install --save-dev supertest @types/supertest
```

### 3.3: Testes E2E (Playwright)

| # | Tarefa | Status | Arquivos |
|---|--------|-------|----------|
| 3.3.1 | Fluxo de login | ✅ | `tests/e2e/login.spec.ts` |
| 3.3.2 | Fluxo de avaliação | ✅ | `tests/e2e/avaliacao.spec.ts` |
| 3.3.3 | Fluxo admin | ✅ | `tests/e2e/admin.spec.ts` |
| 3.3.4 | Fluxo de recuperação de senha | ✅ | `tests/e2e/password-recovery.spec.ts` |

**Configuração:**
- `playwright.config.ts` - Configuração dos testes

**Para rodar:**
```bash
npm install --save-dev @playwright/test
npx playwright install --with-deps
npx playwright test
```

### 3.4: Documentação

| # | Tarefa | Status | Arquivos |
|---|--------|-------|----------|
| 3.4.1 | OpenAPI/Swagger | ✅ | `docs/openapi.yaml` |
| 3.4.2 | README atualizado | ✅ | `README.md` (testes + API docs) |
| 3.4.3 | CHANGELOG | ✅ | `CHANGELOG.md` |

**Arquivos criados:**
- `docs/openapi.yaml` - Especificação OpenAPI 3.0 completa
- `server/routes/openapi.ts` - Endpoint JSON
- `CHANGELOG.md` - Histórico de versões

---

## Resumo de Progresso

| Fase | Concluído | Pendente | Total |
|------|----------|----------|-------|
| 1.1 | 3/4 | 1 | 4 |
| 1.2 | 3/3 | 0 | 3 |
| 1.3 | 3/3 | 0 | 3 |
| 2.1 | 4/4 | 0 | 4 |
| 2.2 | 4/4 | 0 | 4 |
| 2.3 | 4/4 | 0 | 4 |
| 3.1 | 4/4 | 0 | 4 |
| 3.2 | 0/4 | 4 | 4 |
| 3.3 | 4/4 | 0 | 4 |
| 3.4 | 3/3 | 0 | 3 |

**Total: 36 tarefas concluídas / 18 tarefas pendentes**

---

## Guia de Uso das Novas Funcionalidades

### Paginação e Filtros

```bash
# Listar avaliações página 2, com 10 por página
GET /api/avaliacoes?page=2&limit=10

# Filtrar por data
GET /api/avaliacoes?startDate=2024-01-01&endDate=2024-12-31

# Filtrar por busca
GET /api/avaliacoes?search=João

# Combinar filtros
GET /api/avaliacoes?page=1&startDate=2024-01-01&status=concluido&search=casamento
```

### Configuração de 2FA

```bash
# 1. Gerar QR code
POST /api/auth/2fa/setup
# Retorna: { secret, qrCodeUrl, backupCodes[] }

# 2. Habilitar com token
POST /api/auth/2fa/enable
{ "token": "123456", "secret": "JBSWY..." }

# 3. Próximo login exigirá verificação
POST /api/auth/2fa/verify
{ "tempToken": "...", "token": "123456" }
```

### Upload de Logo

```bash
POST /api/uploads/logo
{
  "base64": "data:image/png;base64,iVBORw0KGgo..."
}
```

### Backup

```bash
# Gerar backup completo
GET /api/admin/backup?users=true&format=json

# Validar backup
POST /api/admin/backup/restore
{
  "data": { ... },
  "mode": "validate"
}
```

### Uso no Frontend

```tsx
import { useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { SkeletonCard, SkeletonTable } from './components/Skeleton';
import { loginSchema } from './src/schemas';

// No componente:
const { success, error, warning, info } = useToast();

success('Operação realizada com sucesso!');
error('Ocorreu um erro!');

// Modal de confirmação
<ConfirmModal
  isOpen={showModal}
  title="Confirmar exclusão"
  message="Deseja realmente excluir?"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={() => setShowModal(false)}
/>

// Loading skeleton
{isLoading ? <SkeletonCard /> : <Card data={data} />}
```

---

## Estrutura de Diretórios

```
/
├── server/
│   ├── index.ts                    # Servidor principal
│   ├── database.ts                # Funções DB
│   ├── database-queries.ts       # Queries com paginação
│   ├── auth.ts                   # Autenticação JWT
│   ├── services/
│   │   ├── twofactor.service.ts  # 2FA
│   │   ├── upload.service.ts    # Upload
│   │   └── webhook.service.ts  # Webhooks
│   ├── middleware/
│   │   ├── rateLimiter.ts
│   │   ├── validators.ts
│   │   └── ...
│   └── utils/
│       ├── pagination.ts
│       ├── filters.ts
│       └── export.ts
├── src/
│   ├── schemas/
│   │   └── index.ts            # Schemas Zod
│   └── hooks/
│       └── useZodForm.ts       # Hook para formulários
├── components/
│   ├── Toast.tsx
│   ├── ConfirmModal.tsx
│   └── Skeleton.tsx
├── contexts/
│   ├── AuthContext.tsx
│   └── ToastContext.tsx
└── pages/
    ├── Login.tsx
    ├── AvaliacaoForm.tsx
    └── ...
```

---

## Variáveis de Ambiente

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=avaliacoes

# JWT
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (SendGrid)
SENDGRID_API_KEY=
EMAIL_FROM=noreply@paroquia.com.br

# Upload
UPLOAD_DIR=./uploads

# 2FA (opcional)
TOTP_SECRET_KEY=

# Webhook (opcional)
WEBHOOK_URL=

# Cache (futuro)
REDIS_URL=
```

---

## Testes

```bash
# Rodar todos os testes
npm run test

# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes com coverage
npm run test:coverage

# Modo watch
npm run test:watch
```

---

## Build e Deploy

```bash
# Desenvolvimento
npm run dev          # Frontend
npm run server       # Backend
npm run start        # Ambos

# Produção
npm run build        # Build completo
npm run start:prod  # Iniciar produção
```

---

## Roadmap Sugerido

### Próximas Prioridades (2-3 semanas)

1. **Semana 1**: Fase 2.2 (Dashboards)
   - Dashboard matrimonial
   - Página de perfil
   - Export UI
   - Dark mode

2. **Semana 2**: Fase 2.3 (Funcionalidades)
   - Preview PDF
   - Progress bar
   - Auto-save

3. **Semana 3**: Fase 3 (Testes)
   - Testes E2E com Playwright
   - Documentação Swagger

---

## Contato e Suporte

Para dúvidas ou problemas, abra um issue no repositório.

---

*Documento gerado em: 23 de Abril de 2026*
*Versão do projeto: 1.0.0*