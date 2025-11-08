import { describe, it, expect, jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

// Mock do express-validator
const mockValidationResult = jest.fn();
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    trim: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
  })),
  param: jest.fn(() => ({
    isInt: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
  })),
  validationResult: mockValidationResult,
}));

import { validate } from '../../server/middleware/validators';

describe('Validators Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
    };
    mockNext = jest.fn() as NextFunction;
  });

  describe('validate', () => {
    it('should call next() when there are no validation errors', () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => [],
      });

      validate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', () => {
      const mockErrors = [
        { type: 'field', path: 'email', msg: 'Email inválido' },
        { type: 'field', path: 'password', msg: 'Senha muito curta' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      validate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: [
          { field: 'email', message: 'Email inválido' },
          { field: 'password', message: 'Senha muito curta' },
        ],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-field errors gracefully', () => {
      const mockErrors = [
        { type: 'alternative', msg: 'Erro alternativo' },
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors,
      });

      validate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Dados inválidos',
        errors: [
          { field: 'unknown', message: 'Erro alternativo' },
        ],
      });
    });
  });
});
