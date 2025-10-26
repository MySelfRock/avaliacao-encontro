# Correções Aplicadas para Deploy no Render.com

## Problema Principal
O deploy inicial no Render.com falhou com o erro:
```
ReferenceError: exports is not defined in ES module scope
```

## Causa Raiz
O projeto tem `"type": "module"` no package.json (necessário para Vite/React), mas o backend TypeScript era compilado para CommonJS. Node.js interpretava os arquivos `.js` compilados como ESM, mas o código continha sintaxe CommonJS (`exports`, `require`).

## Soluções Implementadas

### 1. Script de Build Customizado (`scripts/build-backend.js`)

Criado um script Node.js que:
1. ✅ Compila TypeScript → CommonJS
2. ✅ Corrige todos os `require('./module')` para `require('./module.cjs')`  
3. ✅ Renomeia todos `.js` → `.cjs` (extensão CommonJS explícita)

**Resultado:** Node.js agora reconhece os arquivos como CommonJS independente do package.json.

### 2. Express 5 - Correção de Rotas Wildcard

**Problema:** Express 5 não suporta mais `app.get('*', handler)` - gera erro `PathError: Missing parameter name at index 1: *`

**Solução:** Substituído por regex negativo `app.get(/^\/(?!api\/).*/, handler)`
- ✅ Captura todas as rotas GET exceto `/api/*`
- ✅ Permite SPA routing (`/`, `/estatisticas`, `/interessados`)

### 3. Static Files + SPA Fallback

**Configuração correta:**
```typescript
// 1. Servir assets estáticos (CSS, JS, imagens)
app.use(express.static(staticPath, { index: false }));

// 2. ... rotas API ...

// 3. SPA fallback - serve index.html para rotas não encontradas
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});
```

**Por que funciona:**
- `index: false` → não serve index.html automaticamente no root
- Static middleware tenta servir arquivos primeiro (CSS, JS, etc.)
- Se não encontrar → passa para próximo middleware
- Regex fallback captura rotas SPA e serve index.html
- React Router assume o controle no cliente

### 4. Correção de Caminhos

No build, a estrutura é:
```
dist/
├── index.html
├── assets/
└── server/
    └── server/
        └── index.cjs
```

`__dirname` em produção = `dist/server/server/`

**Ajustes:**
- Static files: `path.join(__dirname, '../../')` → `dist/`
- Index.html: `path.join(__dirname, '../../index.html')` → `dist/index.html`

## Arquivos Modificados

1. **`scripts/build-backend.js`** (NOVO)
   - Script de build que renomeia .js → .cjs

2. **`server/index.ts`**
   - Corrigido caminhos relativos (`../../`)
   - `express.static(..., { index: false })`
   - Regex fallback para SPA: `/^\/(?!api\/).*/`

3. **`package.json`**
   - `build:backend`: `node scripts/build-backend.js`
   - `start:prod`: `node dist/server/server/index.cjs`

4. **`render.yaml`** (NOVO)
   - Configuração de deploy automático
   - Build command: `npm install && npm run build`
   - Start command: `npm run start:prod`

## Testes Realizados

```bash
✅ npm run build - Build completo sem erros
✅ npm run start:prod - Server inicia corretamente
✅ curl http://localhost:3001/ - HTML servido
✅ curl http://localhost:3001/assets/*.css - CSS servido (200)
✅ curl http://localhost:3001/estatisticas - HTML servido (SPA)
✅ curl http://localhost:3001/api/health - API funciona
```

## Próximos Passos para Deploy

1. Commit e push das alterações:
```bash
git add .
git commit -m "Fix: Corrigir build para Render.com (ESM vs CJS)"
git push origin main
```

2. No Render.com:
   - New Web Service → Conectar repositório
   - Render detectará `render.yaml` automaticamente
   - Deploy iniciará automaticamente

3. Verificar logs no Render para confirmar:
```
✅ Banco de dados inicializado com sucesso!
✅ Servidor rodando em: http://...
```

## Problemas Conhecidos Resolvidos

| Erro | Solução |
|------|---------|
| `exports is not defined` | ✅ Arquivos .cjs |
| `PathError: Missing parameter name at index 1: *` | ✅ Regex `/^\/(?!api\/).*/` |
| `Cannot find module './database'` | ✅ Build script corrige imports |
| Assets retornam 404 | ✅ `express.static` com `index: false` |
| Rotas SPA retornam 404 | ✅ Fallback regex serve index.html |

