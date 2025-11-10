import { body, param, query, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware para validar resultados das validações
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Validações para autenticação
 */
export const loginValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 1 }).withMessage('Senha é obrigatória'),
  validate
];

export const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  validate
];

export const resetPasswordValidation = [
  body('token')
    .trim()
    .isLength({ min: 32 }).withMessage('Token inválido'),
  body('newPassword')
    .trim()
    .isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres')
    .matches(/[a-z]/).withMessage('Senha deve conter letras minúsculas')
    .matches(/[A-Z]/).withMessage('Senha deve conter letras maiúsculas')
    .matches(/[0-9]/).withMessage('Senha deve conter números'),
  validate
];

export const changePasswordValidation = [
  body('currentPassword')
    .trim()
    .isLength({ min: 1 }).withMessage('Senha atual é obrigatória'),
  body('newPassword')
    .trim()
    .isLength({ min: 8 }).withMessage('Nova senha deve ter no mínimo 8 caracteres')
    .matches(/[a-z]/).withMessage('Nova senha deve conter letras minúsculas')
    .matches(/[A-Z]/).withMessage('Nova senha deve conter letras maiúsculas')
    .matches(/[0-9]/).withMessage('Nova senha deve conter números'),
  validate
];

/**
 * Validações para usuários
 */
export const createUserValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres')
    .matches(/[a-z]/).withMessage('Senha deve conter letras minúsculas')
    .matches(/[A-Z]/).withMessage('Senha deve conter letras maiúsculas')
    .matches(/[0-9]/).withMessage('Senha deve conter números'),
  body('name')
    .trim()
    .isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres')
    .isLength({ max: 100 }).withMessage('Nome muito longo'),
  body('role')
    .isIn(['super_admin', 'pastoral_admin']).withMessage('Role inválido'),
  body('pastoralId')
    .optional()
    .isInt({ min: 1 }).withMessage('ID da pastoral inválido'),
  validate
];

export const updateUserValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID do usuário inválido'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres')
    .isLength({ max: 100 }).withMessage('Nome muito longo'),
  body('role')
    .optional()
    .isIn(['super_admin', 'pastoral_admin']).withMessage('Role inválido'),
  body('pastoralId')
    .optional()
    .isInt({ min: 1 }).withMessage('ID da pastoral inválido'),
  validate
];

/**
 * Validações para pastorais
 */
export const createPastoralValidation = [
  body('nome')
    .trim()
    .isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres')
    .isLength({ max: 200 }).withMessage('Nome muito longo'),
  body('subdominio')
    .trim()
    .isLength({ min: 2 }).withMessage('Subdomínio deve ter no mínimo 2 caracteres')
    .matches(/^[a-z0-9-]+$/).withMessage('Subdomínio deve conter apenas letras minúsculas, números e hífens'),
  body('cidade')
    .trim()
    .isLength({ min: 2 }).withMessage('Cidade inválida'),
  body('estado')
    .trim()
    .isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres (ex: SP)')
    .customSanitizer((value: string) => value.toUpperCase()),
  body('contato_email')
    .trim()
    .isEmail().withMessage('Email de contato inválido')
    .normalizeEmail(),
  validate
];

export const updatePastoralValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID da pastoral inválido'),
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),
  body('cidade')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Cidade inválida'),
  body('estado')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 }).withMessage('Estado deve ter 2 caracteres'),
  body('contato_email')
    .optional()
    .trim()
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  validate
];

export const blockPastoralValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID da pastoral inválido'),
  body('reason')
    .trim()
    .isLength({ min: 10 }).withMessage('Motivo deve ter no mínimo 10 caracteres')
    .isLength({ max: 500 }).withMessage('Motivo muito longo'),
  validate
];

/**
 * Validações para encontros
 */
export const createEncontroValidation = [
  body('numero')
    .isInt({ min: 1 }).withMessage('Número do encontro inválido'),
  body('tema')
    .trim()
    .isLength({ min: 3 }).withMessage('Tema deve ter no mínimo 3 caracteres')
    .isLength({ max: 200 }).withMessage('Tema muito longo'),
  body('local')
    .trim()
    .isLength({ min: 3 }).withMessage('Local deve ter no mínimo 3 caracteres'),
  body('data_inicio')
    .isISO8601().withMessage('Data de início inválida'),
  body('data_fim')
    .isISO8601().withMessage('Data de fim inválida')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.data_inicio)) {
        throw new Error('Data de fim deve ser posterior à data de início');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['planejado', 'ativo', 'concluido', 'cancelado']).withMessage('Status inválido'),
  validate
];

/**
 * Validações para avaliações
 */
export const createAvaliacaoValidation = [
  body('encontro_id')
    .optional()
    .isInt({ min: 1 }).withMessage('ID do encontro inválido'),
  body('couple_name')
    .trim()
    .isLength({ min: 3 }).withMessage('Nome do casal inválido'),
  body('encounter_date')
    .trim()
    .isLength({ min: 1 }).withMessage('Data do encontro é obrigatória'),
  // Validações de ratings (0-5)
  body('preEncontro.communication_clarity')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Avaliação deve estar entre 0 e 5'),
  body('preEncontro.registration_ease')
    .optional()
    .isInt({ min: 0, max: 5 }).withMessage('Avaliação deve estar entre 0 e 5'),
  validate
];

/**
 * Validações de parâmetros de rota
 */
export const idParamValidation = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID inválido'),
  validate
];

/**
 * Validações de query strings
 */
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limite deve estar entre 1 e 100'),
  validate
];
