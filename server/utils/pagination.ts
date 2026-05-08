export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  offset: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
}

export function getPaginationParams(query: Record<string, any>): PaginationParams {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildPaginationInfo(
  params: PaginationParams,
  total: number
): PaginationInfo {
  return {
    page: params.page || 1,
    limit: params.limit || 20,
    offset: params.offset || 0,
    total,
    totalPages: Math.ceil(total / (params.limit || 20)),
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  params: PaginationParams,
  total: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: buildPaginationInfo(params, total),
  };
}