import sgMail from '@sendgrid/mail';
import { env } from '../config/env';

/**
 * Serviço de envio de emails usando SendGrid
 */

// Configurar SendGrid com API Key
sgMail.setApiKey(env.SENDGRID_API_KEY);

/**
 * Interface para opções de email
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envia email usando SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const msg = {
      to: options.to,
      from: {
        email: env.SENDGRID_FROM_EMAIL,
        name: env.SENDGRID_FROM_NAME
      },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML para texto
    };

    await sgMail.send(msg);
    console.log(`✅ Email enviado com sucesso para: ${options.to}`);
    return true;
  } catch (error: any) {
    console.error('❌ Erro ao enviar email:', error);

    if (error.response) {
      console.error('Detalhes do erro SendGrid:', error.response.body);
    }

    return false;
  }
}

/**
 * Template de email para reset de senha
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinição de Senha</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #6b7280;
      font-size: 12px;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔐 Redefinição de Senha</h1>
  </div>

  <div class="content">
    <h2>Olá, ${name}!</h2>

    <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Sistema de Avaliações</strong>.</p>

    <p>Para redefinir sua senha, clique no botão abaixo:</p>

    <center>
      <a href="${resetLink}" class="button">Redefinir Senha</a>
    </center>

    <p>Ou copie e cole o link abaixo no seu navegador:</p>
    <p style="word-break: break-all; color: #3b82f6;">${resetLink}</p>

    <div class="warning">
      <strong>⚠️ Importante:</strong>
      <ul style="margin: 10px 0 0 0;">
        <li>Este link expira em <strong>1 hora</strong></li>
        <li>Se você não solicitou esta redefinição, ignore este email</li>
        <li>Nunca compartilhe este link com outras pessoas</li>
      </ul>
    </div>

    <p>Se você tiver problemas, entre em contato com o suporte.</p>

    <p>Atenciosamente,<br>
    <strong>Equipe Sistema de Avaliações</strong></p>
  </div>

  <div class="footer">
    <p>Este é um email automático, por favor não responda.</p>
    <p>© ${new Date().getFullYear()} Sistema de Avaliações - Pastoral Familiar</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Redefinição de Senha - Sistema de Avaliações',
    html
  });
}

/**
 * Template de email de boas-vindas para novo usuário
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string
): Promise<boolean> {
  const loginLink = `${env.FRONTEND_URL}/login`;

  const roleLabel = role === 'super_admin' ? 'Super Administrador' : 'Administrador de Pastoral';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Sistema</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Bem-vindo!</h1>
  </div>

  <div class="content">
    <h2>Olá, ${name}!</h2>

    <p>Sua conta foi criada com sucesso no <strong>Sistema de Avaliações</strong>.</p>

    <p>Você foi cadastrado como <strong>${roleLabel}</strong>.</p>

    <p><strong>Email de acesso:</strong> ${email}</p>

    <p>Para acessar o sistema, clique no botão abaixo:</p>

    <center>
      <a href="${loginLink}" class="button">Acessar Sistema</a>
    </center>

    <p>Se você não solicitou esta conta ou tem dúvidas, entre em contato com o administrador do sistema.</p>

    <p>Atenciosamente,<br>
    <strong>Equipe Sistema de Avaliações</strong></p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Sistema de Avaliações - Pastoral Familiar</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: 'Bem-vindo ao Sistema de Avaliações',
    html
  });
}

/**
 * Template de email de notificação de nova avaliação
 */
export async function sendNewAvaliacaoNotification(
  adminEmail: string,
  coupleName: string,
  encontroName: string
): Promise<boolean> {
  const dashboardLink = `${env.FRONTEND_URL}/dashboard`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Avaliação Recebida</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .info-box {
      background: white;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📝 Nova Avaliação!</h1>
  </div>

  <div class="content">
    <h2>Nova avaliação recebida</h2>

    <p>Uma nova avaliação foi submetida no sistema:</p>

    <div class="info-box">
      <p><strong>Casal:</strong> ${coupleName}</p>
      <p><strong>Encontro:</strong> ${encontroName}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    </div>

    <p>Para visualizar os detalhes, acesse o painel administrativo:</p>

    <center>
      <a href="${dashboardLink}" class="button">Ver Dashboard</a>
    </center>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Sistema de Avaliações - Pastoral Familiar</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `Nova Avaliação: ${coupleName}`,
    html
  });
}
