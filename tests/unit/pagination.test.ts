import { describe, it, expect } from '@jest/globals';
import {
  getPaginationParams,
  buildPaginationInfo,
  buildPaginatedResponse,
  PaginationParams
} from '../../server/utils/pagination';

describe('Database Utils - Pagination', () => {
  describe('getPaginationParams', () => {
    it('should return default values for empty query', () => {
      const result = getPaginationParams({});
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should parse valid page and limit', () => {
      const result = getPaginationParams({ page: '3', limit: '10' });
      
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20); // (3-1) * 10
    });

    it('should handle page=1 correctly', () => {
      const result = getPaginationParams({ page: '1', limit: '10' });
      
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should cap limit at 100', () => {
      const result = getPaginationParams({ limit: '200' });
      
      expect(result.limit).toBe(100);
    });

it('should cap limit at minimum 1', () => {
      const result = getPaginationParams({ limit: '0' });
      
      expect(result.limit).toBeGreaterThanOrEqual(1);
    });

    it('should not allow page less than 1', () => {
      const result = getPaginationParams({ page: '-1' });
      
      expect(result.page).toBe(1);
    });

    it('should not allow limit less than 1', () => {
      const result = getPaginationParams({ limit: '-5' });
      
      expect(result.limit).toBe(1);
    });

    it('should handle invalid strings gracefully', () => {
      const result = getPaginationParams({ page: 'abc', limit: 'xyz' });
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('buildPaginationInfo', () => {
    it('should calculate total pages correctly', () => {
      const params: PaginationParams = { page: 1, limit: 20, offset: 0 };
      const result = buildPaginationInfo(params, 45);
      
      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle zero total', () => {
      const params: PaginationParams = { page: 1, limit: 20, offset: 0 };
      const result = buildPaginationInfo(params, 0);
      
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should calculate correct offset', () => {
      const params: PaginationParams = { page: 3, limit: 15, offset: 30 };
      const result = buildPaginationInfo(params, 100);
      
      expect(result.offset).toBe(30);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(15);
    });

    it('should handle custom page and limit', () => {
      const params: PaginationParams = { page: 5, limit: 50, offset: 200 };
      const result = buildPaginationInfo(params, 500);
      
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(10);
    });
  });

  describe('buildPaginatedResponse', () => {
    it('should build correct response structure', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const params: PaginationParams = { page: 1, limit: 20, offset: 0 };
      
      const result = buildPaginatedResponse(data, params, 100);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should handle empty data array', () => {
      const data: any[] = [];
      const params: PaginationParams = { page: 1, limit: 20, offset: 0 };
      
      const result = buildPaginatedResponse(data, params, 0);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should preserve data order', () => {
      const data = ['a', 'b', 'c', 'd', 'e'];
      const params: PaginationParams = { page: 1, limit: 10, offset: 0 };
      
      const result = buildPaginatedResponse(data as any, params, 5);
      
      expect(result.data).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should work with custom pagination', () => {
      const data = [{ id: 11 }, { id: 12 }];
      const params: PaginationParams = { page: 2, limit: 10, offset: 10 };
      
      const result = buildPaginatedResponse(data, params, 25);
      
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.offset).toBe(10);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(3);
    });
  });
});