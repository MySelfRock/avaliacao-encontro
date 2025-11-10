# Guia Completo de Deploy - Ubuntu Server com Nginx

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura da Aplicação](#arquitetura-da-aplicação)
3. [Pré-requisitos](#pré-requisitos)
4. [Build da Aplicação](#build-da-aplicação)
5. [Deploy Automatizado](#deploy-automatizado-recomendado)
6. [Deploy Manual Passo a Passo](#deploy-manual-passo-a-passo)
7. [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
8. [SSL/HTTPS com Let's Encrypt](#sslhttps-com-lets-encrypt)
9. [Gerenciamento e Monitoramento](#gerenciamento-e-monitoramento)
10. [Backup e Restore](#backup-e-restore)
11. [Solução de Problemas](#solução-de-problemas)
12. [Segurança](#segurança)

---

## Visão Geral

Este guia fornece instruções completas para deploy da aplicação **Sistema de Avaliação de Encontro de Noivos** em um servidor Ubuntu usando Nginx como proxy reverso e Systemd para gerenciar o processo Node.js.

### Tecnologias Utilizadas

- **Frontend**: React + Vite (arquivos estáticos)
- **Backend**: Node.js + Express (API REST)
- **Banco de Dados**: SQLite (arquivo local)
- **Servidor Web**: Nginx (proxy reverso)
- **Gerenciador de Processos**: Systemd

---

## Arquitetura da Aplicação

```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
       │ HTTPS (443) / HTTP (80)
       ▼
┌─────────────────────────────────────────────┐
│              Nginx                          │
│  - Serve arquivos estáticos (Frontend)      │
│  - Proxy reverso para API (/api/*)         │
│  - SSL/TLS termination                      │
└──────┬──────────────────────────────────────┘
       │
       │ HTTP (localhost:3001)
       ▼
┌─────────────────────────────────────────────┐
│         Node.js / Express                   │
│  - API REST                                 │
│  - Autenticação JWT                         │
│  - Business Logic                           │
└──────┬──────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────┐
│          SQLite Database                    │
│  - avaliacoes.db                            │
└─────────────────────────────────────────────┘
```

---

## Pré-requisitos

### Servidor

- **Sistema Operacional**: Ubuntu 20.04 LTS ou superior (ou Debian 11+)
- **Acesso**: SSH com privilégios sudo
- **Recursos Mínimos**:
  - CPU: 1 core
  - RAM: 1 GB (512 MB mínimo)
  - Disco: 5 GB livres
  - Largura de banda: 1 TB/mês

### Conhecimentos Necessários

- Comandos básicos de Linux
- SSH para acesso remoto
- Conceitos de servidor web (opcional, mas recomendado)

---

## Build da Aplicação

### Passo 1: Preparar o Ambiente Local

Certifique-se de ter Node.js 20.x ou superior instalado:

```bash
node --version  # Deve ser v20.x ou superior
```

### Passo 2: Instalar Dependências

```bash
cd avaliacao-do-encontro-de-noivos
npm install
```

### Passo 3: Executar Build de Produção

```bash
npm run build
```

**O que o build faz:**

1. **Build do Frontend** (`npm run build:frontend`):
   - Compila React com Vite
   - Minifica e otimiza arquivos
   - Gera arquivos estáticos em `dist/`:
     - `dist/index.html`
     - `dist/assets/*.js` (JavaScript minificado)
     - `dist/assets/*.css` (CSS minificado)

2. **Build do Backend** (`npm run build:backend`):
   - Compila TypeScript para CommonJS
   - Converte todos `.js` para `.cjs`
   - Gera arquivos em `dist/server/server/`:
     - `dist/server/server/index.cjs` (entry point)
     - `dist/server/server/database.cjs`
     - `dist/server/server/auth.cjs`
     - Outros módulos do servidor

### Passo 4: Verificar Build

```bash
# Verificar estrutura gerada
ls -la dist/
ls -la dist/server/server/

# Deve mostrar:
# dist/
#   ├── index.html
#   ├── assets/
#   └── server/
#       └── server/
#           ├── index.cjs
#           ├── database.cjs
#           └── ...
```

### Passo 5: Preparar Pacote para Deploy

```bash
# Comprimir arquivos necessários
tar -czf avaliacao-encontro-deploy.tar.gz \
  dist/ \
  package.json \
  package-lock.json \
  scripts/ \
  deploy/ \
  .env.example

# Verificar tamanho do pacote
ls -lh avaliacao-encontro-deploy.tar.gz
```

---

## Deploy Automatizado (Recomendado)

### Passo 1: Transferir Pacote para o Servidor

```bash
# Enviar para o servidor via SCP
scp avaliacao-encontro-deploy.tar.gz seu-usuario@seu-servidor:/tmp/

# Exemplo:
# scp avaliacao-encontro-deploy.tar.gz root@192.168.1.100:/tmp/
```

### Passo 2: Conectar ao Servidor

```bash
ssh seu-usuario@seu-servidor
```

### Passo 3: Extrair e Executar Deploy

```bash
# Extrair arquivos
cd /tmp
tar -xzf avaliacao-encontro-deploy.tar.gz

# Executar script de deploy automatizado
cd avaliacao-do-encontro-de-noivos
sudo bash deploy/deploy.sh
```

### O que o Script Automatizado Faz

✅ Instala Node.js 20.x (se não instalado)
✅ Instala Nginx (se não instalado)
✅ Cria diretório `/var/www/avaliacao-encontro`
✅ Copia arquivos da aplicação
✅ Instala dependências de produção
✅ Configura permissões adequadas
✅ Cria e inicializa banco de dados SQLite
✅ Configura serviço Systemd
✅ Configura Nginx como proxy reverso
✅ Inicia todos os serviços

### Passo 4: Verificar Deploy

```bash
# Verificar status do serviço
sudo systemctl status avaliacao-encontro

# Verificar se API está respondendo
curl http://localhost:3001/api/health

# Verificar Nginx
sudo systemctl status nginx

# Acessar aplicação
# Abra o navegador: http://seu-servidor-ip
```

---

## Deploy Manual Passo a Passo

Use esta seção se preferir fazer o deploy manualmente ou se o script automatizado falhar.

### 1. Atualizar Sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Instalar Node.js 20.x

```bash
# Adicionar repositório NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node --version   # v20.x.x
npm --version    # 10.x.x
```

### 3. Instalar Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Verificar instalação
nginx -v

# Verificar status
sudo systemctl status nginx
```

### 4. Criar Estrutura de Diretórios

```bash
# Criar diretório da aplicação
sudo mkdir -p /var/www/avaliacao-encontro
sudo mkdir -p /var/www/avaliacao-encontro/logs

# Verificar
ls -la /var/www/
```

### 5. Copiar Arquivos da Aplicação

```bash
# Assumindo que você extraiu os arquivos em /tmp

# Copiar dist/ (frontend e backend compilados)
sudo cp -r /tmp/avaliacao-do-encontro-de-noivos/dist /var/www/avaliacao-encontro/

# Copiar package.json e package-lock.json
sudo cp /tmp/avaliacao-do-encontro-de-noivos/package*.json /var/www/avaliacao-encontro/

# Copiar scripts (se necessário)
sudo cp -r /tmp/avaliacao-do-encontro-de-noivos/scripts /var/www/avaliacao-encontro/

# Verificar
ls -la /var/www/avaliacao-encontro/
```

### 6. Instalar Dependências de Produção

```bash
cd /var/www/avaliacao-encontro

# Instalar apenas dependências de produção
sudo npm ci --only=production

# Verificar
ls -la node_modules/
```

### 7. Configurar Permissões

```bash
# Alterar proprietário para www-data (usuário do Nginx)
sudo chown -R www-data:www-data /var/www/avaliacao-encontro

# Definir permissões
sudo chmod -R 755 /var/www/avaliacao-encontro

# Permissões especiais para logs
sudo chmod 775 /var/www/avaliacao-encontro/logs
```

### 8. Criar e Configurar Banco de Dados

```bash
# Criar arquivo do banco de dados
sudo touch /var/www/avaliacao-encontro/avaliacoes.db

# Configurar permissões
sudo chown www-data:www-data /var/www/avaliacao-encontro/avaliacoes.db
sudo chmod 664 /var/www/avaliacao-encontro/avaliacoes.db

# O banco será inicializado automaticamente na primeira execução
```

### 9. Configurar Serviço Systemd

**Criar arquivo de serviço:**

```bash
sudo nano /etc/systemd/system/avaliacao-encontro.service
```

**Conteúdo do arquivo:**

```ini
[Unit]
Description=Sistema de Avaliação de Encontro de Noivos
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/avaliacao-encontro
Environment="NODE_ENV=production"
Environment="PORT=3001"
ExecStart=/usr/bin/node dist/server/server/index.cjs
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=avaliacao-encontro

# Segurança
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/avaliacao-encontro
ReadWritePaths=/var/www/avaliacao-encontro/logs

[Install]
WantedBy=multi-user.target
```

**Ativar e iniciar serviço:**

```bash
# Recarregar daemon do systemd
sudo systemctl daemon-reload

# Habilitar serviço (iniciar no boot)
sudo systemctl enable avaliacao-encontro

# Iniciar serviço
sudo systemctl start avaliacao-encontro

# Verificar status
sudo systemctl status avaliacao-encontro

# Ver logs
sudo journalctl -u avaliacao-encontro -f
```

### 10. Configurar Nginx

**Criar arquivo de configuração:**

```bash
sudo nano /etc/nginx/sites-available/avaliacao-encontro
```

**Conteúdo do arquivo:**

```nginx
# Upstream para o backend Node.js
upstream nodejs_backend {
    server localhost:3001;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;

    # Substitua pelo seu domínio ou IP
    server_name seu-dominio.com.br www.seu-dominio.com.br;

    # Logs
    access_log /var/log/nginx/avaliacao-encontro-access.log;
    error_log /var/log/nginx/avaliacao-encontro-error.log;

    # Root para arquivos estáticos
    root /var/www/avaliacao-encontro/dist;
    index index.html;

    # Compressão gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    # Servir arquivos estáticos
    location / {
        try_files $uri $uri/ /index.html;

        # Cache para assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy para API
    location /api/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check
    location /api/health {
        proxy_pass http://nodejs_backend;
        access_log off;
    }

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Desabilitar logs de favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        log_not_found off;
        access_log off;
    }
}
```

**Ativar configuração:**

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/avaliacao-encontro /etc/nginx/sites-enabled/

# Remover configuração padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Se OK, recarregar Nginx
sudo systemctl reload nginx
```

### 11. Configurar Firewall

```bash
# Permitir SSH (IMPORTANTE!)
sudo ufw allow OpenSSH

# Permitir HTTP e HTTPS
sudo ufw allow 'Nginx Full'

# Ou individualmente:
# sudo ufw allow 80/tcp
# sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable

# Verificar status
sudo ufw status verbose
```

---

## Configuração de Variáveis de Ambiente

### Criar Arquivo .env

```bash
sudo nano /var/www/avaliacao-encontro/.env
```

### Configuração Mínima para Produção

```env
# Ambiente
NODE_ENV=production

# Servidor
PORT=3001
FRONTEND_URL=https://seu-dominio.com.br

# JWT - GERE CHAVES FORTES!
JWT_SECRET=sua-chave-jwt-muito-forte-aqui-64-caracteres-minimo
JWT_EXPIRES_IN=7d

# Refresh Token
REFRESH_TOKEN_SECRET=sua-chave-refresh-token-forte-64-caracteres-minimo
REFRESH_TOKEN_EXPIRES_IN=30d

# Cookie Secret
COOKIE_SECRET=sua-chave-cookie-secret-forte-64-caracteres-minimo

# SendGrid (obrigatório para reset de senha)
SENDGRID_API_KEY=SG.sua-api-key-do-sendgrid
SENDGRID_FROM_EMAIL=noreply@seu-dominio.com.br
SENDGRID_FROM_NAME=Sistema de Avaliações
```

### Gerar Chaves Seguras

```bash
# Método 1: OpenSSL
openssl rand -base64 64

# Método 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Execute 3 vezes para gerar JWT_SECRET, REFRESH_TOKEN_SECRET e COOKIE_SECRET
```

### Ajustar Permissões do .env

```bash
sudo chown www-data:www-data /var/www/avaliacao-encontro/.env
sudo chmod 600 /var/www/avaliacao-encontro/.env
```

### Reiniciar Aplicação

```bash
sudo systemctl restart avaliacao-encontro
```

---

## SSL/HTTPS com Let's Encrypt

### 1. Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obter Certificado SSL

```bash
# Substitua pelo seu domínio
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br

# Siga as instruções interativas:
# 1. Informe seu email
# 2. Aceite os termos de serviço
# 3. Escolha se quer redirecionar HTTP → HTTPS (recomendado: sim)
```

### 3. Verificar Configuração

```bash
# Testar configuração do Nginx
sudo nginx -t

# Recarregar se necessário
sudo systemctl reload nginx

# Acessar via HTTPS
# https://seu-dominio.com.br
```

### 4. Renovação Automática

```bash
# Testar renovação
sudo certbot renew --dry-run

# Configurar renovação automática (já vem configurado)
sudo systemctl status certbot.timer

# Verificar agendamento
sudo systemctl list-timers | grep certbot
```

### 5. Forçar HTTPS

Certbot já configura redirecionamento automático. Para verificar:

```bash
sudo nano /etc/nginx/sites-available/avaliacao-encontro

# Deve ter um bloco como:
# server {
#     if ($host = seu-dominio.com.br) {
#         return 301 https://$host$request_uri;
#     }
#     listen 80;
#     server_name seu-dominio.com.br;
#     return 404;
# }
```

---

## Gerenciamento e Monitoramento

### Comandos do Systemd

```bash
# Ver logs em tempo real
sudo journalctl -u avaliacao-encontro -f

# Ver últimas 100 linhas
sudo journalctl -u avaliacao-encontro -n 100

# Ver logs desde hoje
sudo journalctl -u avaliacao-encontro --since today

# Ver logs das últimas 2 horas
sudo journalctl -u avaliacao-encontro --since "2 hours ago"

# Reiniciar aplicação
sudo systemctl restart avaliacao-encontro

# Parar aplicação
sudo systemctl stop avaliacao-encontro

# Iniciar aplicação
sudo systemctl start avaliacao-encontro

# Ver status detalhado
sudo systemctl status avaliacao-encontro

# Ver logs de erro
sudo journalctl -u avaliacao-encontro -p err
```

### Comandos do Nginx

```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração (sem downtime)
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver status
sudo systemctl status nginx

# Logs de acesso
sudo tail -f /var/log/nginx/avaliacao-encontro-access.log

# Logs de erro
sudo tail -f /var/log/nginx/avaliacao-encontro-error.log

# Ver últimos erros
sudo tail -50 /var/log/nginx/avaliacao-encontro-error.log
```

### Health Check

```bash
# Verificar saúde da API
curl http://localhost:3001/api/health

# Resposta esperada:
# {"status":"OK","message":"API de Avaliações - Pastoral Familiar","timestamp":"..."}

# Verificar via HTTPS (externo)
curl https://seu-dominio.com.br/api/health
```

### Monitoramento de Recursos

```bash
# CPU e memória do processo Node.js
top -p $(pgrep -f "node.*index.cjs")

# Uso de disco
df -h /var/www/avaliacao-encontro

# Tamanho do banco de dados
ls -lh /var/www/avaliacao-encontro/avaliacoes.db

# Processos Node.js rodando
ps aux | grep node

# Conexões de rede
sudo netstat -tlnp | grep -E "(3001|80|443)"
```

---

## Backup e Restore

### Backup do Banco de Dados

#### Backup Manual

```bash
# Criar backup com timestamp
sudo cp /var/www/avaliacao-encontro/avaliacoes.db \
       /var/backups/avaliacoes-$(date +%Y%m%d-%H%M%S).db

# Verificar
ls -lh /var/backups/avaliacoes-*.db
```

#### Backup Automático com Cron

```bash
# Editar crontab do root
sudo crontab -e

# Adicionar backup diário às 2h da manhã
0 2 * * * cp /var/www/avaliacao-encontro/avaliacoes.db /var/backups/avaliacoes-$(date +\%Y\%m\%d).db

# Adicionar limpeza de backups antigos (manter últimos 30 dias)
0 3 * * * find /var/backups/avaliacoes-*.db -mtime +30 -delete
```

#### Script de Backup Avançado

```bash
# Criar script
sudo nano /usr/local/bin/backup-avaliacoes.sh
```

Conteúdo:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/avaliacoes"
DB_PATH="/var/www/avaliacao-encontro/avaliacoes.db"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/avaliacoes-$DATE.db"

# Criar diretório se não existir
mkdir -p "$BACKUP_DIR"

# Fazer backup
cp "$DB_PATH" "$BACKUP_FILE"

# Comprimir backup
gzip "$BACKUP_FILE"

# Remover backups com mais de 30 dias
find "$BACKUP_DIR" -name "avaliacoes-*.db.gz" -mtime +30 -delete

echo "Backup realizado: ${BACKUP_FILE}.gz"
```

Tornar executável:

```bash
sudo chmod +x /usr/local/bin/backup-avaliacoes.sh

# Testar
sudo /usr/local/bin/backup-avaliacoes.sh

# Agendar no cron
sudo crontab -e
# Adicionar:
0 2 * * * /usr/local/bin/backup-avaliacoes.sh >> /var/log/backup-avaliacoes.log 2>&1
```

### Backup via API

```bash
# Exportar avaliações (requer autenticação)
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3001/api/avaliacoes > avaliacoes-backup.json

# Backup completo do diretório
sudo tar -czf avaliacoes-full-backup-$(date +%Y%m%d).tar.gz \
     /var/www/avaliacao-encontro/
```

### Restore do Banco de Dados

```bash
# 1. Parar aplicação
sudo systemctl stop avaliacao-encontro

# 2. Fazer backup do banco atual (precaução)
sudo cp /var/www/avaliacao-encontro/avaliacoes.db \
       /var/www/avaliacao-encontro/avaliacoes.db.before-restore

# 3. Restaurar backup
sudo cp /var/backups/avaliacoes-20241110.db \
       /var/www/avaliacao-encontro/avaliacoes.db

# Ou se for comprimido:
sudo gunzip -c /var/backups/avaliacoes/avaliacoes-20241110.db.gz \
       > /var/www/avaliacao-encontro/avaliacoes.db

# 4. Ajustar permissões
sudo chown www-data:www-data /var/www/avaliacao-encontro/avaliacoes.db
sudo chmod 664 /var/www/avaliacao-encontro/avaliacoes.db

# 5. Reiniciar aplicação
sudo systemctl start avaliacao-encontro

# 6. Verificar
sudo systemctl status avaliacao-encontro
curl http://localhost:3001/api/health
```

---

## Solução de Problemas

### 1. Aplicação Não Inicia

**Sintomas**: `sudo systemctl status avaliacao-encontro` mostra "failed"

**Diagnóstico**:

```bash
# Ver logs detalhados
sudo journalctl -u avaliacao-encontro -n 50 --no-pager

# Verificar se porta 3001 está em uso
sudo netstat -tlnp | grep 3001

# Testar manualmente
cd /var/www/avaliacao-encontro
sudo -u www-data NODE_ENV=production node dist/server/server/index.cjs
```

**Soluções**:

- **Erro de permissão no banco**: Execute comandos da seção 8 (permissões)
- **Porta em uso**: Mate o processo ou mude a porta no .env
- **Módulos faltando**: `sudo npm ci --only=production`
- **Variáveis de ambiente**: Verifique `/var/www/avaliacao-encontro/.env`

### 2. Nginx Retorna 502 Bad Gateway

**Sintomas**: Erro 502 ao acessar o site

**Diagnóstico**:

```bash
# Verificar se aplicação está rodando
sudo systemctl status avaliacao-encontro

# Verificar se porta 3001 está escutando
curl http://localhost:3001/api/health

# Ver logs do Nginx
sudo tail -50 /var/log/nginx/avaliacao-encontro-error.log

# Ver logs da aplicação
sudo journalctl -u avaliacao-encontro -n 50
```

**Soluções**:

- **Aplicação não está rodando**: `sudo systemctl start avaliacao-encontro`
- **Firewall bloqueando**: `sudo ufw status`
- **Configuração Nginx incorreta**: `sudo nginx -t`

### 3. Assets (CSS/JS) Não Carregam

**Sintomas**: Página HTML carrega mas sem estilos

**Diagnóstico**:

```bash
# Verificar se arquivos existem
ls -la /var/www/avaliacao-encontro/dist/assets/

# Verificar permissões
sudo ls -la /var/www/avaliacao-encontro/dist/

# Ver logs do Nginx
sudo tail -f /var/log/nginx/avaliacao-encontro-access.log
```

**Soluções**:

```bash
# Corrigir permissões
sudo chown -R www-data:www-data /var/www/avaliacao-encontro/dist
sudo chmod -R 755 /var/www/avaliacao-encontro/dist

# Limpar cache do Nginx
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx

# Verificar configuração do Nginx
sudo nginx -t
```

### 4. Erro de Permissão no Banco de Dados

**Sintomas**: "SQLITE_CANTOPEN" ou "permission denied"

**Solução**:

```bash
# Corrigir permissões do banco
sudo chown www-data:www-data /var/www/avaliacao-encontro/avaliacoes.db
sudo chmod 664 /var/www/avaliacao-encontro/avaliacoes.db

# Corrigir permissões do diretório (importante!)
sudo chown www-data:www-data /var/www/avaliacao-encontro
sudo chmod 755 /var/www/avaliacao-encontro

# Reiniciar
sudo systemctl restart avaliacao-encontro
```

### 5. Erro de JWT ou Token Inválido

**Sintomas**: "Token inválido" ao fazer login

**Solução**:

```bash
# Verificar se JWT_SECRET está configurado
sudo grep JWT_SECRET /var/www/avaliacao-encontro/.env

# Se não estiver, adicionar
sudo nano /var/www/avaliacao-encontro/.env

# Gerar chave forte
openssl rand -base64 64

# Adicionar no .env:
# JWT_SECRET=chave-gerada-acima

# Reiniciar aplicação
sudo systemctl restart avaliacao-encontro
```

### 6. Logs Úteis para Debug

```bash
# Ver todos os logs da aplicação
sudo journalctl -u avaliacao-encontro --since "1 hour ago"

# Ver erros do Nginx
sudo grep "error" /var/log/nginx/avaliacao-encontro-error.log

# Ver conexões recusadas
sudo journalctl -u avaliacao-encontro | grep "ECONNREFUSED"

# Ver erros de banco de dados
sudo journalctl -u avaliacao-encontro | grep "SQLite"

# Ver uso de memória
free -h
sudo journalctl -u avaliacao-encontro | grep "memory"
```

---

## Segurança

### 1. Checklist de Segurança

- [ ] HTTPS configurado com Let's Encrypt
- [ ] Firewall ativo (ufw) permitindo apenas portas necessárias
- [ ] Chaves JWT/Cookie geradas com 64+ caracteres aleatórios
- [ ] Arquivo .env com permissões 600
- [ ] Desabilitado login root via SSH
- [ ] Backup automático configurado
- [ ] Logs sendo monitorados
- [ ] Sistema e pacotes atualizados

### 2. Configurar Segurança SSH

```bash
# Editar configuração SSH
sudo nano /etc/ssh/sshd_config

# Configurações recomendadas:
# PermitRootLogin no
# PasswordAuthentication no  # (se usar chaves SSH)
# Port 2222  # (opcional: mudar porta padrão)

# Reiniciar SSH
sudo systemctl restart sshd
```

### 3. Atualizar Sistema Regularmente

```bash
# Atualizar pacotes
sudo apt update
sudo apt upgrade -y

# Atualizar Node.js (se necessário)
sudo npm install -g npm@latest

# Verificar atualizações de segurança
sudo apt list --upgradable
```

### 4. Monitorar Tentativas de Acesso

```bash
# Ver tentativas de login SSH
sudo grep "Failed password" /var/log/auth.log | tail -20

# Ver IPs bloqueados pelo fail2ban (se instalado)
sudo fail2ban-client status sshd

# Instalar fail2ban (recomendado)
sudo apt install -y fail2ban
```

### 5. Limitar Taxa de Requisições (Rate Limiting)

A aplicação já possui rate limiting configurado no código. Verifique se está ativo:

```bash
# Ver logs de rate limiting
sudo journalctl -u avaliacao-encontro | grep "rate limit"
```

### 6. Headers de Segurança

O Nginx já está configurado com headers de segurança. Verifique:

```bash
curl -I https://seu-dominio.com.br

# Deve incluir:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

---

## Atualizações da Aplicação

### Método 1: Atualização Rápida (Apenas Frontend/Backend)

```bash
# 1. No seu computador local
npm run build

# 2. Comprimir
tar -czf update.tar.gz dist/

# 3. Enviar para servidor
scp update.tar.gz seu-usuario@servidor:/tmp/

# 4. No servidor
ssh seu-usuario@servidor
cd /tmp
tar -xzf update.tar.gz

# 5. Parar aplicação
sudo systemctl stop avaliacao-encontro

# 6. Backup do dist atual (precaução)
sudo mv /var/www/avaliacao-encontro/dist \
        /var/www/avaliacao-encontro/dist.backup-$(date +%Y%m%d)

# 7. Copiar novo dist
sudo mv dist /var/www/avaliacao-encontro/

# 8. Ajustar permissões
sudo chown -R www-data:www-data /var/www/avaliacao-encontro/dist
sudo chmod -R 755 /var/www/avaliacao-encontro/dist

# 9. Reiniciar aplicação
sudo systemctl start avaliacao-encontro

# 10. Verificar
sudo systemctl status avaliacao-encontro
curl http://localhost:3001/api/health
```

### Método 2: Atualização com Git (Recomendado)

```bash
# No servidor, se tiver repositório clonado em /home
cd /home/seu-usuario/avaliacao-encontro

# Atualizar código
git pull origin master

# Build
npm run build

# Parar aplicação
sudo systemctl stop avaliacao-encontro

# Backup
sudo mv /var/www/avaliacao-encontro/dist \
        /var/www/avaliacao-encontro/dist.backup-$(date +%Y%m%d)

# Copiar novo build
sudo cp -r dist /var/www/avaliacao-encontro/

# Atualizar dependências se necessário
cd /var/www/avaliacao-encontro
sudo npm ci --only=production

# Ajustar permissões
sudo chown -R www-data:www-data /var/www/avaliacao-encontro/dist

# Reiniciar
sudo systemctl start avaliacao-encontro

# Verificar
sudo systemctl status avaliacao-encontro
```

### Método 3: Atualização Zero-Downtime

```bash
# Usar PM2 ou similar (mais avançado)
# Ou usar estratégia de blue-green deployment
```

---

## Custos Estimados

### Provedores VPS Recomendados

#### Nacionais (Brasil)

| Provedor | Plano | Recursos | Preço/mês |
|----------|-------|----------|-----------|
| HostGator | VPS Básico | 1 core, 1GB RAM, 20GB SSD | R$ 29,99 |
| Locaweb | VPS 1 | 1 core, 1GB RAM, 25GB SSD | R$ 49,90 |
| UOL Host | VPS Linux | 1 core, 1GB RAM, 20GB SSD | R$ 39,90 |

#### Internacionais

| Provedor | Plano | Recursos | Preço/mês |
|----------|-------|----------|-----------|
| DigitalOcean | Basic Droplet | 1 core, 1GB RAM, 25GB SSD | $6 (~R$ 30) |
| Vultr | Cloud Compute | 1 core, 1GB RAM, 25GB SSD | $6 (~R$ 30) |
| Linode | Nanode | 1 core, 1GB RAM, 25GB SSD | $5 (~R$ 25) |
| Hetzner | CX11 | 1 core, 2GB RAM, 20GB SSD | €4,51 (~R$ 27) |

#### Gratuitos (com limitações)

- **Oracle Cloud Free Tier**: 2 VMs gratuitas (sempre)
- **Google Cloud**: $300 créditos por 90 dias
- **AWS Free Tier**: 12 meses grátis (limitado)

### Custo Total Estimado

| Item | Custo Mensal | Custo Anual |
|------|--------------|-------------|
| VPS (1GB RAM) | R$ 30-50 | R$ 360-600 |
| Domínio .com.br | R$ 3,33 | R$ 40 |
| SSL (Let's Encrypt) | Gratuito | Gratuito |
| **TOTAL** | **R$ 33-53** | **R$ 400-640** |

---

## Comandos Rápidos de Referência

```bash
# Status geral
sudo systemctl status avaliacao-encontro nginx

# Logs em tempo real
sudo journalctl -u avaliacao-encontro -f

# Reiniciar tudo
sudo systemctl restart avaliacao-encontro nginx

# Health check
curl http://localhost:3001/api/health

# Backup rápido
sudo cp /var/www/avaliacao-encontro/avaliacoes.db \
       /var/backups/avaliacoes-$(date +%Y%m%d).db

# Ver processos Node.js
ps aux | grep node

# Uso de recursos
top -p $(pgrep -f "node.*index.cjs")

# Testar Nginx
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## Conclusão

Após seguir este guia, você terá:

✅ Aplicação fullstack rodando em produção
✅ Nginx configurado como proxy reverso
✅ SSL/HTTPS com Let's Encrypt
✅ Gerenciamento automático via Systemd
✅ Banco de dados SQLite persistente
✅ Backup automático configurado
✅ Logs centralizados e acessíveis
✅ Segurança básica implementada
✅ Monitoramento e troubleshooting

### Próximos Passos Recomendados

1. Configurar monitoramento avançado (Uptime Robot, Prometheus, etc.)
2. Implementar CI/CD para deploy automático
3. Configurar alertas por email/SMS
4. Adicionar CDN para assets estáticos (Cloudflare)
5. Implementar backup off-site (S3, Backblaze, etc.)

---

## Suporte e Contato

Para dúvidas ou problemas:

1. Consulte a seção [Solução de Problemas](#solução-de-problemas)
2. Verifique os logs: `sudo journalctl -u avaliacao-encontro -n 100`
3. Verifique a documentação técnica: `DOCUMENTACAO_TECNICA.md`

---

**Documentação atualizada em**: 10 de Novembro de 2025
**Versão**: 2.0.0
**Sistema**: Ubuntu 20.04+ / Debian 11+ com Nginx e Node.js 20.x
