import type { PaginationParams, PaginationInfo, PaginatedResponse } from './pagination';

export interface DateFilter {
  startDate?: string;
  endDate?: string;
}

export interface StatusFilter {
  status?: string;
}

export interface SearchFilter {
  search?: string;
}

export type FilterParams = PaginationParams & DateFilter & StatusFilter & SearchFilter;

export function getDateFilter(query: Record<string, any>): DateFilter {
  const startDate = query.startDate as string | undefined;
  const endDate = query.endDate as string | undefined;

  if (startDate && !isValidDate(startDate)) {
    throw new Error('Data inicial inválida. Formato esperado: YYYY-MM-DD');
  }

  if (endDate && !isValidDate(endDate)) {
    throw new Error('Data final inválida. Formato esperado: YYYY-MM-DD');
  }

  if (startDate && endDate && startDate > endDate) {
    throw new Error('Data inicial não pode ser maior que a data final');
  }

  return { startDate, endDate };
}

export function getStatusFilter(query: Record<string, any>): StatusFilter {
  const status = query.status as string | undefined;
  return { status };
}

export function getSearchFilter(query: Record<string, any>): SearchFilter {
  const search = query.search as string | undefined;
  return { search };
}

function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export function buildDateFilterSQL(
  fieldName: string,
  dateFilter: DateFilter
): { sql: string; params: any[] } {
  if (!dateFilter.startDate && !dateFilter.endDate) {
    return { sql: '', params: [] };
  }

  const conditions: string[] = [];
  const params: any[] = [];

  if (dateFilter.startDate) {
    conditions.push(`${fieldName} >= ?`);
    params.push(dateFilter.startDate);
  }

  if (dateFilter.endDate) {
    conditions.push(`${fieldName} <= ?`);
    params.push(dateFilter.endDate + ' 23:59:59');
  }

  return { sql: ` AND ${conditions.join(' AND ')}`, params };
}

export function buildStatusFilterSQL(
  fieldName: string,
  statusFilter: StatusFilter
): { sql: string; params: any[] } {
  if (!statusFilter.status) {
    return { sql: '', params: [] };
  }

  return { sql: ` AND ${fieldName} = ?`, params: [statusFilter.status] };
}

export function buildSearchFilterSQL(
  fields: string[],
  searchFilter: SearchFilter
): { sql: string; params: any[] } {
  if (!searchFilter.search || fields.length === 0) {
    return { sql: '', params: [] };
  }

  const search = `%${searchFilter.search.trim()}%`;
  const conditions = fields.map((f) => `${f} LIKE ?`).join(' OR ');

  return {
    sql: ` AND (${conditions})`,
    params: [...fields.map(() => search)],
  };
}