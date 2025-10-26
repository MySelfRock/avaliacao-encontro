# Guia de Deploy - Servidor Linux com Nginx

## Visão Geral

Este guia explica como fazer deploy da aplicação em um servidor Linux (Ubuntu/Debian) usando Nginx como proxy reverso e Systemd para gerenciar o processo Node.js.

## Arquitetura do Deploy

```
Internet → Nginx (porta 80/443) → Node.js App (porta 3001) → SQLite DB
```

- **Nginx**: Servidor web que serve arquivos estáticos e faz proxy para a API
- **Systemd**: Gerencia o processo Node.js (auto-restart, logs, etc.)
- **Node.js**: Servidor Express com API REST
- **SQLite**: Banco de dados local

## Pré-requisitos

### No Servidor Linux

1. **Sistema Operacional:** Ubuntu 20.04+ ou Debian 10+
2. **Acesso:** SSH com privilégios sudo
3. **Recursos mínimos:**
   - CPU: 1 core
   - RAM: 512 MB
   - Disco: 2 GB livres

### Dependências a serem instaladas

- Node.js 20.x
- Nginx
- Git (opcional, para clonar o repositório)

## Método 1: Deploy Automatizado (Recomendado)

### Passo 1: Preparar o Build Localmente

```bash
# No seu computador de desenvolvimento
cd avaliacao-do-encontro-de-noivos

# Fazer build de produção
npm run build

# Verificar se dist/ foi criado
ls -la dist/
```

### Passo 2: Transferir para o Servidor

```bash
# Comprimir a aplicação
tar -czf avaliacao-encontro.tar.gz \
  dist/ \
  package.json \
  package-lock.json \
  scripts/ \
  deploy/

# Enviar para o servidor (substitua user e servidor)
scp avaliacao-encontro.tar.gz user@seu-servidor:/tmp/
```

### Passo 3: Executar Deploy no Servidor

```bash
# Conectar ao servidor
ssh user@seu-servidor

# Extrair arquivos
cd /tmp
tar -xzf avaliacao-encontro.tar.gz
cd avaliacao-do-encontro-de-noivos

# Executar script de deploy (como root)
sudo ./deploy/deploy.sh
```

O script automatizado irá:
- ✅ Instalar Node.js e Nginx (se necessário)
- ✅ Criar diretório `/var/www/avaliacao-encontro`
- ✅ Copiar arquivos da aplicação
- ✅ Instalar dependências de produção
- ✅ Configurar permissões
- ✅ Criar banco de dados SQLite
- ✅ Configurar serviço Systemd
- ✅ Configurar Nginx
- ✅ Iniciar todos os serviços

## Método 2: Deploy Manual

### Passo 1: Instalar Dependências

```bash
# Atualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Nginx
sudo apt install -y nginx

# Verificar instalações
node --version  # Deve mostrar v20.x.x
nginx -v        # Deve mostrar nginx/1.x.x
```

### Passo 2: Criar Estrutura de Diretórios

```bash
# Criar diretório da aplicação
sudo mkdir -p /var/www/avaliacao-encontro
sudo mkdir -p /var/www/avaliacao-encontro/logs

# Criar usuário para rodar a aplicação (se não existir)
# O usuário www-data geralmente já existe no Ubuntu/Debian
```

### Passo 3: Copiar Arquivos da Aplicação

```bash
# Assumindo que você já enviou os arquivos para /tmp

# Copiar arquivos necessários
sudo cp -r /tmp/avaliacao-do-encontro-de-noivos/dist /var/www/avaliacao-encontro/
sudo cp /tmp/avaliacao-do-encontro-de-noivos/package*.json /var/www/avaliacao-encontro/
sudo cp -r /tmp/avaliacao-do-encontro-de-noivos/scripts /var/www/avaliacao-encontro/

# Instalar dependências de produção
cd /var/www/avaliacao-encontro
sudo npm ci --only=production

# Configurar permissões
sudo chown -R www-data:www-data /var/www/avaliacao-encontro
sudo chmod -R 755 /var/www/avaliacao-encontro
```

### Passo 4: Configurar Banco de Dados

```bash
# Criar arquivo do banco de dados
sudo touch /var/www/avaliacao-encontro/encontro.db
sudo chown www-data:www-data /var/www/avaliacao-encontro/encontro.db
sudo chmod 664 /var/www/avaliacao-encontro/encontro.db
```

### Passo 5: Configurar Serviço Systemd

```bash
# Copiar arquivo de serviço
sudo cp deploy/avaliacao-encontro.service /etc/systemd/system/

# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar serviço (iniciar automaticamente no boot)
sudo systemctl enable avaliacao-encontro

# Iniciar serviço
sudo systemctl start avaliacao-encontro

# Verificar status
sudo systemctl status avaliacao-encontro
```

### Passo 6: Configurar Nginx

```bash
# Copiar configuração
sudo cp deploy/nginx.conf /etc/nginx/sites-available/avaliacao-encontro

# Editar configuração e ajustar domínio/IP
sudo nano /etc/nginx/sites-available/avaliacao-encontro
# Altere a linha: server_name seu-dominio.com.br;

# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/avaliacao-encontro /etc/nginx/sites-enabled/

# Remover configuração padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### Passo 7: Configurar Firewall

```bash
# Permitir HTTP e HTTPS
sudo ufw allow 'Nginx Full'

# Permitir SSH (importante!)
sudo ufw allow OpenSSH

# Habilitar firewall
sudo ufw enable

# Verificar status
sudo ufw status
```

## Configurar SSL/HTTPS com Let's Encrypt

### Instalar Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Obter Certificado SSL

```bash
# Substitua pelo seu domínio
sudo certbot --nginx -d seu-dominio.com.br -d www.seu-dominio.com.br

# Seguir instruções interativas:
# - Informar email
# - Aceitar termos de serviço
# - Escolher se quer redirecionar HTTP → HTTPS (recomendado)
```

### Renovação Automática

```bash
# Testar renovação
sudo certbot renew --dry-run

# A renovação automática já está configurada via cron
```

## Gerenciamento da Aplicação

### Comandos do Systemd

```bash
# Ver logs em tempo real
sudo journalctl -u avaliacao-encontro -f

# Ver últimas 100 linhas de log
sudo journalctl -u avaliacao-encontro -n 100

# Reiniciar aplicação
sudo systemctl restart avaliacao-encontro

# Parar aplicação
sudo systemctl stop avaliacao-encontro

# Iniciar aplicação
sudo systemctl start avaliacao-encontro

# Ver status
sudo systemctl status avaliacao-encontro
```

### Comandos do Nginx

```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração (sem downtime)
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de acesso
sudo tail -f /var/log/nginx/avaliacao-encontro-access.log

# Ver logs de erro
sudo tail -f /var/log/nginx/avaliacao-encontro-error.log
```

## Atualizações da Aplicação

### Método Rápido

```bash
# 1. No seu computador, fazer build
npm run build

# 2. Comprimir e enviar
tar -czf update.tar.gz dist/
scp update.tar.gz user@servidor:/tmp/

# 3. No servidor
ssh user@servidor
cd /tmp
tar -xzf update.tar.gz
sudo rm -rf /var/www/avaliacao-encontro/dist
sudo mv dist /var/www/avaliacao-encontro/
sudo chown -R www-data:www-data /var/www/avaliacao-encontro/dist
sudo systemctl restart avaliacao-encontro
```

### Com Git (Recomendado para atualizações frequentes)

```bash
# No servidor, clonar repositório em /home
cd /home/user
git clone https://github.com/seu-usuario/avaliacao-encontro.git

# Quando atualizar
cd /home/user/avaliacao-encontro
git pull
npm run build
sudo rm -rf /var/www/avaliacao-encontro/dist
sudo cp -r dist /var/www/avaliacao-encontro/
sudo chown -R www-data:www-data /var/www/avaliacao-encontro/dist
sudo systemctl restart avaliacao-encontro
```

## Backup e Restore

### Backup do Banco de Dados

```bash
# Backup manual
sudo cp /var/www/avaliacao-encontro/encontro.db \
       /var/backups/encontro-$(date +%Y%m%d-%H%M%S).db

# Script de backup automático (adicionar ao crontab)
sudo crontab -e

# Adicionar linha (backup diário às 2h da manhã):
0 2 * * * cp /var/www/avaliacao-encontro/encontro.db /var/backups/encontro-$(date +\%Y\%m\%d).db
```

### Backup via API (exportar JSON)

```bash
# Exportar todas avaliações
curl http://localhost:3001/api/avaliacoes > avaliacoes-backup.json

# Exportar estatísticas
curl http://localhost:3001/api/estatisticas > estatisticas-backup.json

# Exportar interessados
curl http://localhost:3001/api/pastoral/interessados > interessados-backup.json
```

### Restore do Banco de Dados

```bash
# Parar aplicação
sudo systemctl stop avaliacao-encontro

# Restaurar backup
sudo cp /var/backups/encontro-20250126.db \
       /var/www/avaliacao-encontro/encontro.db

# Ajustar permissões
sudo chown www-data:www-data /var/www/avaliacao-encontro/encontro.db
sudo chmod 664 /var/www/avaliacao-encontro/encontro.db

# Reiniciar aplicação
sudo systemctl start avaliacao-encontro
```

## Monitoramento

### Verificar Saúde da Aplicação

```bash
# Health check da API
curl http://localhost:3001/api/health

# Resposta esperada:
# {"status":"OK","message":"API de Avaliações - Pastoral Familiar","timestamp":"..."}
```

### Verificar Logs

```bash
# Logs da aplicação Node.js
sudo journalctl -u avaliacao-encontro --since today

# Logs de acesso do Nginx
sudo tail -f /var/log/nginx/avaliacao-encontro-access.log

# Logs de erro do Nginx
sudo tail -f /var/log/nginx/avaliacao-encontro-error.log
```

### Monitoramento de Recursos

```bash
# Uso de CPU e memória
top -p $(pgrep -f "node.*index.cjs")

# Espaço em disco
df -h /var/www/avaliacao-encontro
```

## Solução de Problemas

### Aplicação não inicia

```bash
# Ver logs detalhados
sudo journalctl -u avaliacao-encontro -n 50 --no-pager

# Verificar se porta 3001 está livre
sudo netstat -tlnp | grep 3001

# Testar manualmente
cd /var/www/avaliacao-encontro
sudo -u www-data NODE_ENV=production node dist/server/server/index.cjs
```

### Nginx retorna 502 Bad Gateway

```bash
# Verificar se aplicação está rodando
sudo systemctl status avaliacao-encontro

# Verificar se porta 3001 está escutando
curl http://localhost:3001/api/health

# Ver logs do Nginx
sudo tail /var/log/nginx/avaliacao-encontro-error.log
```

### Erro de permissão no banco de dados

```bash
# Corrigir permissões
sudo chown www-data:www-data /var/www/avaliacao-encontro/encontro.db
sudo chmod 664 /var/www/avaliacao-encontro/encontro.db

# Verificar permissões do diretório
sudo ls -la /var/www/avaliacao-encontro/
```

### Assets (CSS/JS) não carregam

```bash
# Verificar se arquivos existem
ls -la /var/www/avaliacao-encontro/dist/assets/

# Verificar permissões
sudo chmod -R 755 /var/www/avaliacao-encontro/dist

# Verificar configuração do Nginx
sudo nginx -t
```

## Segurança

### Boas Práticas

1. **Sempre usar HTTPS em produção**
   - Configure SSL com Let's Encrypt (gratuito)

2. **Manter sistema atualizado**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Configurar firewall**
   ```bash
   sudo ufw status
   # Deve permitir apenas: 22 (SSH), 80 (HTTP), 443 (HTTPS)
   ```

4. **Desabilitar acesso root via SSH**
   ```bash
   sudo nano /etc/ssh/sshd_config
   # PermitRootLogin no
   sudo systemctl restart sshd
   ```

5. **Backup regular do banco de dados**
   - Configure cron job para backup diário

6. **Monitorar logs regularmente**
   ```bash
   sudo journalctl -u avaliacao-encontro --since yesterday
   ```

## Recursos do Servidor

### Requisitos Mínimos

- **CPU:** 1 core
- **RAM:** 512 MB
- **Disco:** 2 GB
- **Largura de banda:** 1 TB/mês (suficiente para ~10.000 acessos)

### Provedores Recomendados

#### VPS Nacionais (Brasil)
- **HostGator VPS** - A partir de R$ 29,99/mês
- **UOL Host VPS** - A partir de R$ 39,90/mês
- **Locaweb VPS** - A partir de R$ 49,90/mês

#### VPS Internacionais (mais baratos)
- **DigitalOcean** - $6/mês (Droplet básico)
- **Vultr** - $6/mês
- **Linode** - $5/mês
- **Hetzner** - €4,51/mês (~R$ 27)

#### Gratuitos (limitados)
- **Oracle Cloud Free Tier** - 2 VMs gratuitas (sempre)
- **Google Cloud** - $300 créditos por 90 dias
- **AWS Free Tier** - 12 meses grátis (limitado)

## Custos Estimados

Para uma aplicação deste porte:

| Item | Custo Mensal |
|------|--------------|
| VPS básico (1 core, 1GB RAM) | R$ 30-50 |
| Domínio (.com.br) | R$ 40/ano (~R$ 3,30/mês) |
| SSL (Let's Encrypt) | Gratuito |
| **Total** | **~R$ 35-55/mês** |

## Suporte

### Logs e Debug

```bash
# Logs da aplicação
sudo journalctl -u avaliacao-encontro -f

# Logs do Nginx
sudo tail -f /var/log/nginx/avaliacao-encontro-error.log

# Processos Node.js
ps aux | grep node

# Conexões de rede
sudo netstat -tlnp | grep -E "(3001|80|443)"
```

### Comandos Úteis

```bash
# Restart completo
sudo systemctl restart avaliacao-encontro nginx

# Verificar configurações
sudo nginx -t
sudo systemctl status avaliacao-encontro

# Limpar cache do Nginx (se necessário)
sudo rm -rf /var/cache/nginx/*
sudo systemctl restart nginx
```

## Conclusão

Após seguir este guia, você terá:

- ✅ Aplicação rodando em servidor Linux
- ✅ Nginx servindo frontend e fazendo proxy para API
- ✅ Serviço gerenciado pelo Systemd (auto-restart)
- ✅ SSL/HTTPS configurado (se seguiu seção Let's Encrypt)
- ✅ Banco de dados SQLite persistente
- ✅ Logs centralizados e fáceis de acessar
- ✅ Backup automatizado do banco de dados

Para dúvidas ou problemas, consulte a seção de **Solução de Problemas** ou verifique os logs da aplicação.
