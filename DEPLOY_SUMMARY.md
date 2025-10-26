# ✅ Deploy Linux/Nginx - Configuração Completa

## 📦 Arquivos Criados

Toda a infraestrutura de deploy foi configurada! Aqui estão os arquivos:

### 1. **Configuração do Nginx**
📄 [`deploy/nginx.conf`](deploy/nginx.conf)
- Proxy reverso para API Node.js (porta 3001)
- Serve arquivos estáticos do frontend
- Suporte para SPA routing (React Router)
- Cache otimizado para assets
- Configuração SSL comentada (pronta para Let's Encrypt)

### 2. **Serviço Systemd**
📄 [`deploy/avaliacao-encontro.service`](deploy/avaliacao-encontro.service)
- Gerencia processo Node.js
- Auto-restart em caso de falha
- Logs via journalctl
- Executa como usuário www-data (segurança)

### 3. **Script de Deploy Automatizado**
📄 [`deploy/deploy.sh`](deploy/deploy.sh) ⭐
- Instala todas as dependências (Node.js, Nginx)
- Cria estrutura de diretórios
- Configura permissões
- Configura e inicia todos os serviços
- **Deploy em 1 comando!**

### 4. **Documentação Completa**
📄 [`DEPLOY_LINUX.md`](DEPLOY_LINUX.md) (16+ páginas)
- Guia passo a passo completo
- Deploy manual e automatizado
- Configuração SSL/HTTPS
- Gerenciamento e monitoramento
- Backup e restore
- Solução de problemas
- Custos e provedores

### 5. **Guia Rápido**
📄 [`deploy/README.md`](deploy/README.md)
- Resumo de 3 passos
- Comandos úteis
- Troubleshooting rápido

## 🚀 Como Fazer Deploy

### Método Rápido (Recomendado)

```bash
# 1. Fazer build localmente
npm run build

# 2. Comprimir e enviar para servidor
tar -czf avaliacao-encontro.tar.gz dist/ package*.json scripts/ deploy/
scp avaliacao-encontro.tar.gz user@SEU-SERVIDOR:/tmp/

# 3. No servidor, extrair e executar script
ssh user@SEU-SERVIDOR
cd /tmp
tar -xzf avaliacao-encontro.tar.gz
cd avaliacao-do-encontro-de-noivos
sudo ./deploy/deploy.sh
```

✨ **Pronto!** A aplicação estará rodando em `http://SEU-SERVIDOR`

## 🏗️ Arquitetura do Deploy

```
┌─────────────┐
│  Internet   │
└──────┬──────┘
       │ :80, :443
┌──────▼──────────────────────────────┐
│  Nginx (Proxy Reverso)              │
│  - Serve static files (dist/)       │
│  - Proxy /api/* → localhost:3001    │
│  - SSL/TLS termination              │
│  - Gzip compression                 │
│  - Caching                          │
└──────┬──────────────────────────────┘
       │ :3001
┌──────▼──────────────────────────────┐
│  Node.js App (Systemd Service)      │
│  - Express server                   │
│  - REST API endpoints               │
│  - SQLite operations                │
└──────┬──────────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│  SQLite Database                    │
│  - encontro.db                      │
│  - 10 tabelas relacionadas          │
└─────────────────────────────────────┘
```

## 📋 Checklist de Deploy

### Antes do Deploy
- [x] Build de produção testado localmente
- [x] Configurações do Nginx revisadas
- [x] Servidor Linux preparado (Ubuntu/Debian)
- [x] Acesso SSH ao servidor
- [x] Privilégios sudo no servidor

### Durante o Deploy
- [ ] Executar `npm run build`
- [ ] Transferir arquivos para servidor
- [ ] Executar `sudo ./deploy/deploy.sh`
- [ ] Verificar logs: `sudo journalctl -u avaliacao-encontro`
- [ ] Testar API: `curl http://localhost:3001/api/health`
- [ ] Testar frontend no navegador

### Após o Deploy
- [ ] Configurar domínio no Nginx
- [ ] Configurar SSL com Let's Encrypt
- [ ] Configurar backup automático do banco
- [ ] Configurar firewall (ufw)
- [ ] Testar todas as funcionalidades
- [ ] Documentar credenciais e acessos

## 🔧 Comandos Essenciais

### Gerenciar Aplicação
```bash
# Ver logs em tempo real
sudo journalctl -u avaliacao-encontro -f

# Reiniciar aplicação
sudo systemctl restart avaliacao-encontro

# Ver status
sudo systemctl status avaliacao-encontro

# Parar aplicação
sudo systemctl stop avaliacao-encontro

# Iniciar aplicação
sudo systemctl start avaliacao-encontro
```

### Gerenciar Nginx
```bash
# Testar configuração
sudo nginx -t

# Recarregar (sem downtime)
sudo systemctl reload nginx

# Ver logs de acesso
sudo tail -f /var/log/nginx/avaliacao-encontro-access.log

# Ver logs de erro
sudo tail -f /var/log/nginx/avaliacao-encontro-error.log
```

### Backup
```bash
# Backup do banco de dados
sudo cp /var/www/avaliacao-encontro/encontro.db \
       ~/backup-$(date +%Y%m%d).db

# Baixar backup
scp user@servidor:/var/www/avaliacao-encontro/encontro.db ./backup.db
```

## 🔒 Segurança

### SSL/HTTPS (Let's Encrypt)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado (substitua pelo seu domínio)
sudo certbot --nginx -d seu-dominio.com.br

# Renovação é automática via cron
```

### Firewall
```bash
# Configurar firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## 📊 Estrutura de Arquivos no Servidor

```
/var/www/avaliacao-encontro/
├── dist/                          # Frontend (Vite build)
│   ├── index.html                # SPA entry point
│   ├── assets/                   # CSS, JS, fonts, images
│   │   ├── index-*.js           # JavaScript bundle
│   │   └── index-*.css          # CSS bundle
│   └── server/
│       └── server/
│           ├── index.cjs        # Backend Node.js (compilado)
│           └── database.cjs     # Funções do banco
├── package.json
├── package-lock.json
├── scripts/
│   └── build-backend.js
├── encontro.db                   # Banco de dados SQLite
└── logs/                         # Logs da aplicação (se configurado)

/etc/systemd/system/
└── avaliacao-encontro.service   # Serviço Systemd

/etc/nginx/sites-available/
└── avaliacao-encontro           # Configuração Nginx

/etc/nginx/sites-enabled/
└── avaliacao-encontro -> ../sites-available/avaliacao-encontro
```

## 💰 Custos Estimados

| Item | Custo |
|------|-------|
| VPS (1 core, 1GB RAM, Brasil) | R$ 30-50/mês |
| VPS (Internacional, mais barato) | R$ 20-35/mês |
| Domínio .com.br | R$ 40/ano |
| SSL (Let's Encrypt) | **Gratuito** ✅ |
| **Total mensal** | **R$ 25-55** |

### Provedores VPS Recomendados

**Nacionais (Brasil):**
- HostGator VPS - R$ 29,99/mês
- Locaweb VPS - R$ 49,90/mês
- UOL Host VPS - R$ 39,90/mês

**Internacionais (mais baratos):**
- DigitalOcean - $6/mês (~R$ 30)
- Vultr - $6/mês
- Hetzner (Alemanha) - €4,51/mês (~R$ 27)

**Gratuitos (limitados):**
- Oracle Cloud Free Tier - 2 VMs sempre grátis
- Google Cloud - $300 créditos (90 dias)

## 🆘 Solução de Problemas Rápida

### Aplicação não inicia
```bash
# Ver logs
sudo journalctl -u avaliacao-encontro -n 50

# Testar manualmente
cd /var/www/avaliacao-encontro
sudo -u www-data NODE_ENV=production node dist/server/server/index.cjs
```

### Nginx retorna 502
```bash
# Verificar se app está rodando
curl http://localhost:3001/api/health

# Ver logs
sudo tail -f /var/log/nginx/avaliacao-encontro-error.log
```

### Erro de permissão no banco
```bash
sudo chown www-data:www-data /var/www/avaliacao-encontro/encontro.db
sudo chmod 664 /var/www/avaliacao-encontro/encontro.db
```

## 📚 Documentação

- **Guia Completo:** [DEPLOY_LINUX.md](DEPLOY_LINUX.md) (16+ páginas)
- **Guia Rápido:** [deploy/README.md](deploy/README.md)
- **Deploy Render:** [DEPLOYMENT.md](DEPLOYMENT.md) (alternativa cloud)

## ✅ Status do Projeto

**Pronto para Deploy em Produção!**

- ✅ Build de produção funcionando
- ✅ Configuração Nginx completa
- ✅ Serviço Systemd configurado
- ✅ Script de deploy automatizado
- ✅ Documentação completa
- ✅ Suporte a SSL/HTTPS
- ✅ Backup e restore documentados
- ✅ Monitoramento e logs configurados

## 🎯 Próximos Passos

1. **Escolher provedor VPS** (ver seção "Custos")
2. **Registrar domínio** (opcional, pode usar IP)
3. **Fazer build:** `npm run build`
4. **Transferir para servidor** (via SCP)
5. **Executar deploy:** `sudo ./deploy/deploy.sh`
6. **Configurar SSL:** `sudo certbot --nginx -d seu-dominio.com`
7. **Testar aplicação** no navegador
8. **Configurar backup automático**

## 📞 Suporte

Para dúvidas específicas:
1. Consulte [DEPLOY_LINUX.md](DEPLOY_LINUX.md) → Seção "Solução de Problemas"
2. Verifique logs: `sudo journalctl -u avaliacao-encontro -n 100`
3. Teste API: `curl http://localhost:3001/api/health`

---

**Criado para:** Pastoral Familiar - Paróquia São Benedito do Alto da Ponte
**Data:** Janeiro 2025
**Versão:** 1.0
**Status:** ✅ Pronto para Produção
