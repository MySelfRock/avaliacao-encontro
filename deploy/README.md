# Deploy - Guia Rápido

## 🚀 Deploy Rápido em 3 Passos

### 1️⃣ Fazer Build

No seu computador:

```bash
npm run build
```

### 2️⃣ Enviar para Servidor

```bash
# Comprimir aplicação
tar -czf avaliacao-encontro.tar.gz dist/ package*.json scripts/ deploy/

# Enviar para servidor (substitua user e IP)
scp avaliacao-encontro.tar.gz user@SEU-SERVIDOR-IP:/tmp/
```

### 3️⃣ Deploy no Servidor

No servidor via SSH:

```bash
# Conectar ao servidor
ssh user@SEU-SERVIDOR-IP

# Extrair e fazer deploy
cd /tmp
tar -xzf avaliacao-encontro.tar.gz
cd avaliacao-do-encontro-de-noivos

# Executar script de deploy (REQUER SUDO)
sudo ./deploy/deploy.sh
```

## ✅ Pronto!

Sua aplicação estará rodando em:
- **Frontend**: http://SEU-SERVIDOR-IP
- **API**: http://SEU-SERVIDOR-IP/api/health

## 📁 Arquivos de Deploy

- **`nginx.conf`** - Configuração do Nginx (proxy reverso + static files)
- **`avaliacao-encontro.service`** - Serviço Systemd (gerencia processo Node.js)
- **`deploy.sh`** - Script automatizado de deploy
- **`README.md`** - Este arquivo

## 📚 Documentação Completa

Para instruções detalhadas, configuração de SSL, troubleshooting e mais:

👉 Leia: **[DEPLOY_LINUX.md](../DEPLOY_LINUX.md)**

## ⚙️ Comandos Úteis

```bash
# Ver logs da aplicação
sudo journalctl -u avaliacao-encontro -f

# Reiniciar aplicação
sudo systemctl restart avaliacao-encontro

# Verificar status
sudo systemctl status avaliacao-encontro

# Logs do Nginx
sudo tail -f /var/log/nginx/avaliacao-encontro-access.log
```

## 🔒 Configurar SSL (HTTPS)

Após deploy inicial:

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado (substitua seu domínio)
sudo certbot --nginx -d seu-dominio.com.br
```

## 🆘 Problemas?

1. Verifique logs: `sudo journalctl -u avaliacao-encontro -n 50`
2. Teste API: `curl http://localhost:3001/api/health`
3. Consulte: [DEPLOY_LINUX.md](../DEPLOY_LINUX.md) → Seção "Solução de Problemas"

## 💾 Backup do Banco de Dados

```bash
# Backup manual
sudo cp /var/www/avaliacao-encontro/encontro.db \
       ~/backup-encontro-$(date +%Y%m%d).db

# Baixar para seu computador
scp user@SEU-SERVIDOR:/var/www/avaliacao-encontro/encontro.db ./backup-local.db
```

## 🔄 Atualizar Aplicação

```bash
# 1. No seu computador: fazer build
npm run build
tar -czf update.tar.gz dist/

# 2. Enviar para servidor
scp update.tar.gz user@SEU-SERVIDOR:/tmp/

# 3. No servidor
ssh user@SEU-SERVIDOR
cd /tmp
tar -xzf update.tar.gz
sudo rm -rf /var/www/avaliacao-encontro/dist
sudo mv dist /var/www/avaliacao-encontro/
sudo chown -R www-data:www-data /var/www/avaliacao-encontro/dist
sudo systemctl restart avaliacao-encontro
```

## 📊 Estrutura no Servidor

```
/var/www/avaliacao-encontro/
├── dist/                      # Frontend buildado
│   ├── index.html
│   ├── assets/               # CSS, JS, etc.
│   └── server/
│       └── server/
│           └── index.cjs     # Backend Node.js
├── package.json
├── scripts/
├── encontro.db               # Banco de dados SQLite
└── logs/
```

## 🌐 Requisitos do Servidor

- **SO**: Ubuntu 20.04+ ou Debian 10+
- **CPU**: 1 core
- **RAM**: 512 MB mínimo (1 GB recomendado)
- **Disco**: 2 GB livres
- **Portas**: 80 (HTTP), 443 (HTTPS), 22 (SSH)

## 💰 Custos

- VPS básico: R$ 30-50/mês
- Domínio: R$ 40/ano
- SSL: Gratuito (Let's Encrypt)
- **Total: ~R$ 35-55/mês**

## 🎯 Próximos Passos

1. ✅ Deploy inicial
2. 📝 Editar domínio em `/etc/nginx/sites-available/avaliacao-encontro`
3. 🔒 Configurar SSL com Let's Encrypt
4. 📊 Configurar backup automático
5. 🔐 Configurar firewall (ufw)
6. 📱 Testar aplicação no navegador

---

**Criado para:** Pastoral Familiar - Paróquia São Benedito
**Data:** Janeiro 2025
