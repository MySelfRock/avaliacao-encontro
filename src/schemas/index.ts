import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

export const createEncontroSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  descricao: z.string().optional(),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_fim: z.string().min(1, 'Data de término é obrigatória'),
  local: z.string().optional(),
  tema: z.string().optional(),
  status: z.enum(['planejado', 'em_andamento', 'concluido', 'cancelado']).optional(),
  max_participantes: z.number().int().positive().optional(),
  observacoes: z.string().optional()
}).refine(data => {
  if (data.data_inicio && data.data_fim) {
    return new Date(data.data_inicio) <= new Date(data.data_fim);
  }
  return true;
}, {
  message: 'Data de início deve ser anterior à data de término',
  path: ['data_inicio']
});

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.enum(['super_admin', 'pastoral_admin']),
  pastoralId: z.number().int().positive().optional()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z.string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .regex(/[A-Z]/, 'Deve ter pelo menos 1 letra maiúscula')
    .regex(/[0-9]/, 'Deve ter pelo menos 1 número')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .regex(/[A-Z]/, 'Deve ter pelo menos 1 letra maiúscula')
    .regex(/[0-9]/, 'Deve ter pelo menos 1 número')
});

export const pastoralConfigSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  subdomain: z.string()
    .min(3, 'Subdomínio deve ter pelo menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  location: z.string().optional(),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  }).optional(),
  webhook: z.object({
    enabled: z.boolean().optional(),
    url: z.string().url().optional(),
    secret: z.string().optional()
  }).optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEncontroInput = z.infer<typeof createEncontroSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PastoralConfigInput = z.infer<typeof pastoralConfigSchema>;