#!/bin/bash

# Script de Deploy - Avaliação do Encontro de Noivos
# Uso: sudo ./deploy/deploy.sh

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🚀 Deploy - Avaliação do Encontro de Noivos${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Este script precisa ser executado como root (sudo)${NC}"
    exit 1
fi

# Variáveis de configuração
APP_NAME="avaliacao-encontro"
APP_DIR="/var/www/${APP_NAME}"
SERVICE_NAME="${APP_NAME}.service"
NGINX_CONFIG="${APP_NAME}"
CURRENT_USER=$(whoami)

echo -e "\n${YELLOW}📋 Configurações:${NC}"
echo "   Aplicação: ${APP_NAME}"
echo "   Diretório: ${APP_DIR}"
echo "   Serviço: ${SERVICE_NAME}"
echo "   Usuário: www-data"

# 1. Instalar dependências do sistema (se necessário)
echo -e "\n${YELLOW}📦 Verificando dependências do sistema...${NC}"
if ! command -v node &> /dev/null; then
    echo "   Node.js não encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "   ✅ Node.js $(node -v) instalado"
fi

if ! command -v nginx &> /dev/null; then
    echo "   Nginx não encontrado. Instalando..."
    apt-get update
    apt-get install -y nginx
else
    echo "   ✅ Nginx instalado"
fi

# 2. Criar diretório da aplicação
echo -e "\n${YELLOW}📁 Preparando diretório da aplicação...${NC}"
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs

# 3. Copiar arquivos da aplicação
echo -e "\n${YELLOW}📋 Copiando arquivos da aplicação...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd .. && pwd )"
echo "   Origem: ${SCRIPT_DIR}"

# Copiar apenas arquivos necessários para produção
cp -r ${SCRIPT_DIR}/dist ${APP_DIR}/
cp ${SCRIPT_DIR}/package*.json ${APP_DIR}/
cp -r ${SCRIPT_DIR}/scripts ${APP_DIR}/

# 4. Instalar dependências de produção
echo -e "\n${YELLOW}📦 Instalando dependências Node.js...${NC}"
cd ${APP_DIR}
npm ci --only=production

# 5. Configurar permissões
echo -e "\n${YELLOW}🔒 Configurando permissões...${NC}"
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod -R 775 ${APP_DIR}/logs

# 6. Configurar banco de dados SQLite
echo -e "\n${YELLOW}💾 Verificando banco de dados...${NC}"
if [ ! -f "${APP_DIR}/encontro.db" ]; then
    echo "   Criando novo banco de dados..."
    touch ${APP_DIR}/encontro.db
    chown www-data:www-data ${APP_DIR}/encontro.db
    chmod 664 ${APP_DIR}/encontro.db
else
    echo "   ✅ Banco de dados existe (${APP_DIR}/encontro.db)"
fi

# 7. Configurar serviço systemd
echo -e "\n${YELLOW}⚙️  Configurando serviço systemd...${NC}"
cp ${SCRIPT_DIR}/deploy/${SERVICE_NAME} /etc/systemd/system/
systemctl daemon-reload

# Parar serviço se estiver rodando
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "   Parando serviço existente..."
    systemctl stop ${SERVICE_NAME}
fi

# Habilitar e iniciar serviço
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}

# Verificar status
sleep 2
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "   ${GREEN}✅ Serviço ${SERVICE_NAME} iniciado com sucesso${NC}"
else
    echo -e "   ${RED}❌ Falha ao iniciar serviço${NC}"
    systemctl status ${SERVICE_NAME} --no-pager
    exit 1
fi

# 8. Configurar Nginx
echo -e "\n${YELLOW}🌐 Configurando Nginx...${NC}"
cp ${SCRIPT_DIR}/deploy/nginx.conf /etc/nginx/sites-available/${NGINX_CONFIG}

# Criar link simbólico se não existir
if [ ! -L "/etc/nginx/sites-enabled/${NGINX_CONFIG}" ]; then
    ln -s /etc/nginx/sites-available/${NGINX_CONFIG} /etc/nginx/sites-enabled/
fi

# Testar configuração do Nginx
if nginx -t; then
    echo "   ✅ Configuração do Nginx válida"
    systemctl reload nginx
    echo "   ✅ Nginx recarregado"
else
    echo -e "   ${RED}❌ Erro na configuração do Nginx${NC}"
    exit 1
fi

# 9. Configurar firewall (opcional)
if command -v ufw &> /dev/null; then
    echo -e "\n${YELLOW}🔥 Configurando firewall...${NC}"
    ufw allow 'Nginx Full'
    echo "   ✅ Firewall configurado"
fi

# 10. Resumo final
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}📊 Status dos serviços:${NC}"
systemctl status ${SERVICE_NAME} --no-pager | head -3
echo ""
systemctl status nginx --no-pager | head -3

echo -e "\n${YELLOW}📝 Comandos úteis:${NC}"
echo "   Ver logs da aplicação:  sudo journalctl -u ${SERVICE_NAME} -f"
echo "   Reiniciar aplicação:    sudo systemctl restart ${SERVICE_NAME}"
echo "   Verificar status:       sudo systemctl status ${SERVICE_NAME}"
echo "   Logs do Nginx:          sudo tail -f /var/log/nginx/avaliacao-encontro-*.log"
echo "   Testar Nginx:           sudo nginx -t"
echo "   Recarregar Nginx:       sudo systemctl reload nginx"

echo -e "\n${YELLOW}🌍 Acesso:${NC}"
echo "   Frontend: http://seu-servidor"
echo "   API:      http://seu-servidor/api/health"

echo -e "\n${YELLOW}💡 Próximos passos:${NC}"
echo "   1. Editar /etc/nginx/sites-available/${NGINX_CONFIG} e configurar seu domínio"
echo "   2. Configurar SSL com Let's Encrypt (certbot)"
echo "   3. Fazer backup regular do banco de dados: ${APP_DIR}/encontro.db"

echo -e "\n${GREEN}✨ Deploy finalizado!${NC}\n"
