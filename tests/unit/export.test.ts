import { describe, it, expect } from '@jest/globals';
import {
  exportToCSV,
  exportToJSON,
  setExportHeaders,
  avaliacaoColumns,
  ExportColumn
} from '../../server/utils/export';

describe('Database Utils - Export', () => {
  describe('exportToCSV', () => {
    it('should export empty data with headers', () => {
      const data: any[] = [];
      const result = exportToCSV(data, { 
        columns: avaliacaoColumns.slice(0, 2), 
        filename: 'test' 
      });
      
      const lines = result.split('\n');
      expect(lines).toHaveLength(1); // only header
      expect(lines[0]).toBe('ID,Nome do Casal');
    });

    it('should export data with correct headers', () => {
      const data = [
        { id: 1, couple_name: 'João e Maria' },
        { id: 2, couple_name: 'Pedro e Ana' }
      ];
      const columns: ExportColumn[] = [
        { key: 'id', label: 'ID' },
        { key: 'couple_name', label: 'Nome do Casal' }
      ];
      const result = exportToCSV(data, { columns, filename: 'test' });
      
      const lines = result.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('ID,Nome do Casal');
      expect(lines[1]).toBe('1,João e Maria');
      expect(lines[2]).toBe('2,Pedro e Ana');
    });

    it('should handle null values', () => {
      const data = [{ id: 1, couple_name: null }];
      const columns: ExportColumn[] = [
        { key: 'id', label: 'ID' },
        { key: 'couple_name', label: 'Nome do Casal' }
      ];
      const result = exportToCSV(data, { columns, filename: 'test' });
      
      expect(result).toContain(',');
    });

    it('should format values using format function', () => {
      const data = [{ overall_rating: 4.5 }];
      const columns: ExportColumn[] = [
        { 
          key: 'overall_rating', 
          label: 'Nota',
          format: (v) => v ? `${v}/5` : 'N/A'
        }
      ];
      const result = exportToCSV(data, { columns, filename: 'test' });
      
      expect(result).toContain('4.5/5');
    });

    it('should escape quotes in values', () => {
      const data = [{ couple_name: 'João "Teste" Silva' }];
      const columns: ExportColumn[] = [
        { key: 'couple_name', label: 'Nome' }
      ];
      const result = exportToCSV(data, { columns, filename: 'test' });
      
      expect(result).toContain('""');
    });

    it('should escape commas in values', () => {
      const data = [{ couple_name: 'Silva, João' }];
      const columns: ExportColumn[] = [
        { key: 'couple_name', label: 'Nome' }
      ];
      const result = exportToCSV(data, { columns, filename: 'test' });
      
      expect(result).toContain('"Silva, João"');
    });

    it('should escape newlines in values', () => {
      const data = [{ couple_name: 'João\nSilva' }];
      const columns: ExportColumn[] = [
        { key: 'couple_name', label: 'Nome' }
      ];
      const result = exportToCSV(data, { columns, filename: 'test' });
      
      expect(result).toContain('"');
    });
  });

  describe('exportToJSON', () => {
    it('should export empty array', () => {
      const result = exportToJSON([], 'test');
      const parsed = JSON.parse(result);
      
      expect(parsed.data).toHaveLength(0);
      expect(parsed.total).toBe(0);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.filename).toBe('test');
    });

    it('should export data with metadata', () => {
      const data = [{ id: 1, name: 'Test' }];
      const result = exportToJSON(data, 'test');
      const parsed = JSON.parse(result);
      
      expect(parsed.data).toHaveLength(1);
      expect(parsed.total).toBe(1);
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should include timestamp', () => {
      const data: any[] = [];
      const result = exportToJSON(data, 'test');
      const parsed = JSON.parse(result);
      
      expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('setExportHeaders', () => {
    it('should set CSV headers', () => {
      const mockRes = {
        setHeader: jest.fn()
      } as any;
      
      setExportHeaders(mockRes, 'test', 'csv');
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('test_')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv')
      );
    });

    it('should set JSON headers', () => {
      const mockRes = {
        setHeader: jest.fn()
      } as any;
      
      setExportHeaders(mockRes, 'test', 'json');
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json; charset=utf-8'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.json')
      );
    });

    it('should include date in filename', () => {
      const mockRes = {
        setHeader: jest.fn()
      } as any;
      
      setExportHeaders(mockRes, 'avaliacoes', 'csv');
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/\d{4}-\d{2}-\d{2}/)
      );
    });
  });

  describe('avaliacaoColumns', () => {
    it('should have all required columns', () => {
      const keys = avaliacaoColumns.map(c => c.key);
      
      expect(keys).toContain('id');
      expect(keys).toContain('couple_name');
      expect(keys).toContain('encontro_nome');
      expect(keys).toContain('overall_rating');
    });

    it('should have format functions for ratings', () => {
      const ratingCol = avaliacaoColumns.find(c => c.key === 'overall_rating');
      
      expect(ratingCol?.format).toBeDefined();
      expect(ratingCol?.format!(4, {})).toBe('4/5');
      expect(ratingCol?.format!(null, {})).toBe('N/A');
    });

    it('should have format functions for pastoral interest', () => {
      const interestCol = avaliacaoColumns.find(c => c.key === 'pastoral_interest');
      
      expect(interestCol?.format).toBeDefined();
      expect(interestCol?.format!('sim', {})).toBe('Sim');
      expect(interestCol?.format!('nao', {})).toBe('Não');
      expect(interestCol?.format!('talvez', {})).toBe('Talvez');
      expect(interestCol?.format!('unknown', {})).toBe('Não informado');
    });
  });
});