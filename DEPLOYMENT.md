# Guia de Deploy - Avaliação do Encontro de Noivos

## Visão Geral

Esta aplicação é um sistema completo de avaliação do Encontro de Noivos da Pastoral Familiar, com frontend React e backend Node.js/Express com banco de dados SQLite.

## Deploy no Render.com (Recomendado - Free Tier)

### Pré-requisitos

1. Conta no GitHub
2. Conta no Render.com (gratuita)
3. Repositório Git inicializado

### Passo 1: Preparar o Repositório

```bash
# Inicializar git (se ainda não foi feito)
git init

# Adicionar arquivos
git add .
git commit -m "Preparar para deploy no Render"

# Criar repositório no GitHub e fazer push
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git branch -M main
git push -u origin main
```

### Passo 2: Deploy no Render

1. Acesse [Render.com](https://render.com/) e faça login
2. Clique em "New +" e selecione "Web Service"
3. Conecte seu repositório do GitHub
4. O Render detectará automaticamente o arquivo `render.yaml`

**Configurações Automáticas (do render.yaml):**
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:prod`
- **Environment:** Node
- **Plan:** Free

5. Clique em "Create Web Service"

### Passo 3: Configurar Persistência do Banco de Dados

O Render.com já está configurado no `render.yaml` para criar um disco persistente de 1GB para o banco de dados SQLite.

**Importante:** No plano Free do Render:
- O disco persiste os dados entre deploys
- A aplicação pode hibernar após 15 minutos de inatividade
- O primeiro acesso após hibernação pode levar alguns segundos

### Variáveis de Ambiente

As seguintes variáveis já estão configuradas automaticamente:
- `NODE_ENV=production` - Define o modo de produção

## Estrutura de Build

### Frontend (Vite + React)
```bash
npm run build:frontend
```
Gera arquivos estáticos em `dist/`:
- `index.html` - Página principal
- `assets/` - JS, CSS e outros assets

### Backend (TypeScript → JavaScript)
```bash
npm run build:backend
```
Compila TypeScript para JavaScript CommonJS em `dist/server/`:
- `server/index.js` - Servidor Express
- `server/database.js` - Funções do banco de dados

### Build Completo
```bash
npm run build
```
Executa ambos os builds em sequência.

## Testes Locais de Produção

Para testar o build de produção localmente:

```bash
# 1. Fazer build
npm run build

# 2. Iniciar servidor em modo produção
npm run start:prod

# 3. Acessar http://localhost:3001
```

O servidor irá:
- Servir os arquivos estáticos do frontend em `/`
- Expor a API em `/api/*`
- Usar o banco SQLite local

## Endpoints da API

### Públicos
- `POST /api/avaliacoes` - Criar nova avaliação
- `GET /api/health` - Health check

### Administrativos
- `GET /api/avaliacoes` - Listar todas as avaliações
- `GET /api/avaliacoes/:id` - Buscar avaliação específica
- `GET /api/estatisticas` - Estatísticas gerais
- `GET /api/pastoral/interessados` - Pessoas interessadas na Pastoral (com contato)
- `GET /api/contatos` - Todos os contatos registrados

## Rotas do Frontend

- `/` - Formulário de avaliação (público)
- `/estatisticas` - Dashboard de estatísticas (administrativo)
- `/interessados` - Lista de interessados na Pastoral (administrativo)

## Monitoramento e Logs

### No Render.com

1. Acesse o dashboard do seu serviço
2. Vá para a aba "Logs" para ver logs em tempo real
3. Logs incluem:
   - ✅ Requisições bem-sucedidas
   - ❌ Erros e exceções
   - 📊 Estatísticas de operações
   - 💾 Operações de banco de dados

### Logs Importantes

```
🚀 Servidor rodando na porta ${PORT}
💾 Banco de dados inicializado com sucesso!
✅ Avaliação criada com sucesso!
📊 Estatísticas gerais consultadas
```

## Banco de Dados SQLite

### Tabelas

1. **avaliacoes** - Informações básicas da avaliação
2. **pre_encontro** - Avaliação da fase pré-encontro
3. **palestras** - Avaliações das palestras
4. **ambientes** - Avaliação dos ambientes
5. **refeicoes** - Avaliação das refeições
6. **musicas** - Avaliação das músicas
7. **equipe** - Avaliação da equipe
8. **avaliacao_geral** - Avaliação geral do encontro
9. **pastoral** - Interesse na Pastoral Familiar
10. **mensagem_final** - Mensagem final opcional

### Localização do Banco

- **Desenvolvimento:** `./encontro.db` na raiz do projeto
- **Produção (Render):** `/opt/render/project/src/encontro.db` no disco persistente

### Backup do Banco de Dados

Para fazer backup do banco SQLite no Render:

1. Conecte-se via SSH ao serviço (se disponível no seu plano)
2. Ou use a API para exportar os dados:

```bash
# Exportar todas as avaliações
curl https://SEU-APP.onrender.com/api/avaliacoes > backup-avaliacoes.json

# Exportar estatísticas
curl https://SEU-APP.onrender.com/api/estatisticas > backup-stats.json

# Exportar interessados
curl https://SEU-APP.onrender.com/api/pastoral/interessados > backup-interessados.json
```

## Solução de Problemas

### Build falha no Render

**Erro:** `Cannot find module...`
- **Solução:** Verifique se todas as dependências estão em `dependencies` (não em `devDependencies`)

### Erro: "exports is not defined in ES module scope"

**Erro completo:**
```
ReferenceError: exports is not defined in ES module scope
This file is being treated as an ES module because it has a '.js' file extension
and '/opt/render/project/src/package.json' contains "type": "module"
```

**Causa:** O backend é compilado para CommonJS mas package.json tem `"type": "module"`

**Solução:** ✅ Já resolvido! O projeto usa um script customizado (`scripts/build-backend.js`) que:
1. Compila TypeScript para CommonJS
2. Corrige imports para usar extensão `.cjs`
3. Renomeia todos `.js` para `.cjs`

### Aplicação não inicia

**Erro:** `Error: Cannot find module 'express'`
- **Solução:** Certifique-se de que `npm install` está rodando no build

### Banco de dados vazio após deploy

**Causa:** Plano free do Render pode resetar o sistema de arquivos
- **Solução:** O disco persistente configurado no `render.yaml` resolve isso

### API retorna 404

**Causa:** Servidor não está expondo as rotas corretamente
- **Solução:** Verifique os logs no Render para mensagens de erro

### Frontend retorna 404 ou JSON ao invés de HTML

**Causa:** Static file middleware ou SPA fallback não configurado corretamente

**Solução:** ✅ Já resolvido! O servidor agora:
1. Serve arquivos estáticos (CSS, JS) com `express.static(..., { index: false })`
2. Usa regex `/^\/(?!api\/).*\/` para servir index.html em rotas SPA
3. Isso permite que `/`, `/estatisticas`, `/interessados` funcionem corretamente

## Custos

### Render.com - Free Tier

- ✅ Gratuito
- ✅ 750 horas/mês (suficiente para 1 serviço 24/7)
- ✅ 1GB de disco persistente
- ⚠️ Hiberna após 15 minutos de inatividade
- ⚠️ 100GB de largura de banda/mês

### Alternativas Pagas

Se precisar de mais recursos:

**Render.com - Starter ($7/mês)**
- Sem hibernação
- 400 GB de largura de banda
- Mais recursos computacionais

**Railway ($5/mês + uso)**
- Similar ao Render
- Cobrança por uso de recursos

## Atualizações e Manutenção

### Deploy Automático

O Render.com faz deploy automático quando você faz push para a branch main:

```bash
git add .
git commit -m "Atualização da aplicação"
git push origin main
```

O Render detectará o push e iniciará um novo build automaticamente.

### Deploy Manual

No dashboard do Render:
1. Vá para o seu serviço
2. Clique em "Manual Deploy"
3. Selecione "Deploy latest commit"

## Segurança

### Recomendações

1. **Adicionar autenticação** para rotas administrativas (`/estatisticas`, `/interessados`)
2. **Implementar rate limiting** para evitar abuso da API
3. **Validar dados de entrada** no backend
4. **Backup regular** dos dados do banco

### Variáveis Sensíveis

Se adicionar variáveis sensíveis no futuro:
1. Adicione-as no dashboard do Render em "Environment"
2. Nunca commite valores sensíveis no código

## Suporte e Documentação

- **Render.com Docs:** https://render.com/docs
- **Vite Docs:** https://vitejs.dev/
- **Express Docs:** https://expressjs.com/
- **Better-SQLite3 Docs:** https://github.com/WiseLibs/better-sqlite3

## Contato

Para dúvidas sobre a aplicação, consulte o código ou documentação técnica dos componentes.
