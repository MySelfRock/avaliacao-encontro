import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
} from '../../server/middleware/secureCookies';

describe('Secure Cookies Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      cookies: {},
      headers: {},
    };
    mockRes = {
      cookie: jest.fn() as any,
      clearCookie: jest.fn() as any,
    };
  });

  describe('setAccessTokenCookie', () => {
    it('should set access token cookie with correct options', () => {
      const token = 'test-access-token';

      setAccessTokenCookie(mockRes as Response, token);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'accessToken',
        token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        })
      );
    });

    it('should set secure flag in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const token = 'test-access-token';
      setAccessTokenCookie(mockRes as Response, token);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'accessToken',
        token,
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('setRefreshTokenCookie', () => {
    it('should set refresh token cookie with correct options', () => {
      const token = 'test-refresh-token';

      setRefreshTokenCookie(mockRes as Response, token);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refreshToken',
        token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
        })
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both access and refresh token cookies', () => {
      clearAuthCookies(mockRes as Response);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAccessToken', () => {
    it('should get token from cookies when available', () => {
      mockReq.cookies = { accessToken: 'cookie-token' };

      const token = getAccessToken(mockReq as Request);

      expect(token).toBe('cookie-token');
    });

    it('should get token from Authorization header as fallback', () => {
      mockReq.headers = { authorization: 'Bearer header-token' };

      const token = getAccessToken(mockReq as Request);

      expect(token).toBe('header-token');
    });

    it('should prioritize cookie over header', () => {
      mockReq.cookies = { accessToken: 'cookie-token' };
      mockReq.headers = { authorization: 'Bearer header-token' };

      const token = getAccessToken(mockReq as Request);

      expect(token).toBe('cookie-token');
    });

    it('should return null when no token is available', () => {
      const token = getAccessToken(mockReq as Request);

      expect(token).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should get refresh token from cookies', () => {
      mockReq.cookies = { refreshToken: 'refresh-cookie-token' };

      const token = getRefreshToken(mockReq as Request);

      expect(token).toBe('refresh-cookie-token');
    });

    it('should return null when no refresh token is available', () => {
      const token = getRefreshToken(mockReq as Request);

      expect(token).toBeNull();
    });
  });
});
