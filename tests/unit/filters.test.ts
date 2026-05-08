import { describe, it, expect } from '@jest/globals';
import {
  getDateFilter,
  getStatusFilter,
  getSearchFilter,
  buildDateFilterSQL,
  buildStatusFilterSQL,
  buildSearchFilterSQL,
  DateFilter,
  StatusFilter,
  SearchFilter
} from '../../server/utils/filters';

describe('Database Utils - Filters', () => {
  describe('getDateFilter', () => {
    it('should return empty filter for empty query', () => {
      const result = getDateFilter({});
      
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });

    it('should parse valid dates', () => {
      const result = getDateFilter({ 
        startDate: '2024-01-01', 
        endDate: '2024-12-31' 
      });
      
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-12-31');
    });

    it('should throw for invalid date format', () => {
      expect(() => getDateFilter({ startDate: '01-01-2024' }))
        .toThrow('YYYY-MM-DD');
    });

    it('should throw for invalid date value', () => {
      expect(() => getDateFilter({ startDate: '2024-13-01' }))
        .toThrow('YYYY-MM-DD');
    });

    it('should throw when startDate is after endDate', () => {
      expect(() => getDateFilter({ 
        startDate: '2024-12-31', 
        endDate: '2024-01-01' 
      })).toThrow('não pode ser maior');
    });

    it('should handle only startDate', () => {
      const result = getDateFilter({ startDate: '2024-01-01' });
      
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBeUndefined();
    });

    it('should handle only endDate', () => {
      const result = getDateFilter({ endDate: '2024-12-31' });
      
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBe('2024-12-31');
    });
  });

  describe('getStatusFilter', () => {
    it('should return undefined for no status', () => {
      const result = getStatusFilter({});
      expect(result.status).toBeUndefined();
    });

    it('should return status when provided', () => {
      const result = getStatusFilter({ status: 'concluido' });
      expect(result.status).toBe('concluido');
    });
  });

  describe('getSearchFilter', () => {
    it('should return empty search for no query', () => {
      const result = getSearchFilter({});
      expect(result.search).toBeUndefined();
    });

    it('should return search when provided', () => {
      const result = getSearchFilter({ search: 'john' });
      expect(result.search).toBe('john');
    });
  });

  describe('buildDateFilterSQL', () => {
    it('should return empty for no filters', () => {
      const filter: DateFilter = {};
      const result = buildDateFilterSQL('created_at', filter);
      
      expect(result.sql).toBe('');
      expect(result.params).toHaveLength(0);
    });

    it('should build SQL with startDate only', () => {
      const filter: DateFilter = { startDate: '2024-01-01' };
      const result = buildDateFilterSQL('created_at', filter);
      
      expect(result.sql).toContain('created_at >= ?');
      expect(result.params).toContain('2024-01-01');
    });

    it('should build SQL with endDate only', () => {
      const filter: DateFilter = { endDate: '2024-12-31' };
      const result = buildDateFilterSQL('created_at', filter);
      
      expect(result.sql).toContain('created_at <= ?');
      expect(result.params).toContain('2024-12-31 23:59:59');
    });

    it('should build SQL with both dates', () => {
      const filter: DateFilter = { 
        startDate: '2024-01-01', 
        endDate: '2024-12-31' 
      };
      const result = buildDateFilterSQL('created_at', filter);
      
      expect(result.sql).toContain('created_at >= ?');
      expect(result.sql).toContain('created_at <= ?');
      expect(result.params).toHaveLength(2);
    });
  });

  describe('buildStatusFilterSQL', () => {
    it('should return empty for no status', () => {
      const filter: StatusFilter = {};
      const result = buildStatusFilterSQL('status', filter);
      
      expect(result.sql).toBe('');
      expect(result.params).toHaveLength(0);
    });

    it('should build SQL with status', () => {
      const filter: StatusFilter = { status: 'concluido' };
      const result = buildStatusFilterSQL('status', filter);
      
      expect(result.sql).toContain('status = ?');
      expect(result.params).toContain('concluido');
    });
  });

  describe('buildSearchFilterSQL', () => {
    it('should return empty for no search', () => {
      const filter: SearchFilter = {};
      const result = buildSearchFilterSQL(['name', 'email'], filter);
      
      expect(result.sql).toBe('');
      expect(result.params).toHaveLength(0);
    });

    it('should return empty for no fields', () => {
      const filter: SearchFilter = { search: 'test' };
      const result = buildSearchFilterSQL([], filter);
      
      expect(result.sql).toBe('');
      expect(result.params).toHaveLength(0);
    });

    it('should build SQL with search and fields', () => {
      const filter: SearchFilter = { search: 'john' };
      const result = buildSearchFilterSQL(['name', 'email'], filter);
      
      expect(result.sql).toContain('name LIKE ?');
      expect(result.sql).toContain('email LIKE ?');
      expect(result.params).toContain('%john%');
      expect(result.params).toHaveLength(2);
    });

    it('should trim search query', () => {
      const filter: SearchFilter = { search: '  john  ' };
      const result = buildSearchFilterSQL(['name'], filter);
      
      expect(result.params).toContain('%john%');
    });
  });
});