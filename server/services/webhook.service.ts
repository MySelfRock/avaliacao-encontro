import { logger } from '../config/logger';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  enabled?: boolean;
}

export async function sendWebhook(
  config: WebhookConfig,
  event: string,
  data: any
): Promise<boolean> {
  if (!config.enabled || !config.url) {
    logger.debug('Webhook não configurado, ignorando', { event });
    return false;
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data
  };

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.secret ? { 'X-Webhook-Secret': config.secret } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      logger.error('Webhook falhou', {
        event,
        status: response.status,
        url: config.url
      });
      return false;
    }

    logger.info('Webhook enviado com sucesso', { event, url: config.url });
    return true;
  } catch (error) {
    logger.error('Erro ao enviar webhook', {
      event,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: config.url
    });
    return false;
  }
}

export async function notifyNewAvaliacao(
  webhookConfig: WebhookConfig,
  avaliacao: any
): Promise<boolean> {
  const simplifiedData = {
    id: avaliacao.id,
    coupleName: avaliacao.couple_name,
    encounterId: avaliacao.encontro_id,
    overallRating: avaliacao.overall_rating,
    recommendation: avaliacao.recommendation,
    pastoralInterest: avaliacao.pastoral_interest,
    contactInfo: avaliacao.contact_info,
    createdAt: avaliacao.created_at
  };

  return sendWebhook(webhookConfig, 'avaliacao.created', simplifiedData);
}

export async function notifyNewEncontro(
  webhookConfig: WebhookConfig,
  encontro: any
): Promise<boolean> {
  const simplifiedData = {
    id: encontro.id,
    nome: encontro.nome,
    dataInicio: encontro.data_inicio,
    dataFim: encontro.data_fim,
    local: encontro.local,
    tema: encontro.tema,
    status: encontro.status
  };

  return sendWebhook(webhookConfig, 'encontro.created', simplifiedData);
}