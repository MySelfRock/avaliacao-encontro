import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import type { EvaluationData, Encontro, EncontroStatus } from '../types';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from './config/env';
import { logger } from './config/logger';
import { getPool } from './database';

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  offset: number;
  totalPages: number;
}

export interface FilterOptions {
  pastoralId?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
  encontroId?: number;
}

export async function getFilteredAvaliacoes(
  pagination: PaginationParams,
  filters: FilterOptions
): Promise<PaginationResult> {
  const conn = getPool();
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params: any[] = [];

  if (filters.pastoralId) {
    whereClause += ' AND e.pastoral_id = ?';
    params.push(filters.pastoralId);
  }

  if (filters.startDate) {
    whereClause += ' AND a.created_at >= ?';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    whereClause += ' AND a.created_at <= ?';
    params.push(filters.endDate + ' 23:59:59');
  }

  if (filters.search) {
    whereClause += ' AND (a.couple_name LIKE ? OR e.nome LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  if (filters.encontroId) {
    whereClause += ' AND a.encontro_id = ?';
    params.push(filters.encontroId);
  }

  const countQuery = `
    SELECT COUNT(*) as total
    FROM avaliacoes a
    LEFT JOIN encontros e ON a.encontro_id = e.id
    WHERE ${whereClause}
  `;

  const [countResult] = await conn.execute<any[]>(countQuery, params);
  const total = countResult[0]?.total || 0;

  const dataQuery = `
    SELECT
      a.*,
      e.nome as encontros_nome,
      e.pastoral_id,
      ag.overall_rating,
      ag.recommendation,
      p.interest as pastoral_interest,
      p.contact_info
    FROM avaliacoes a
    LEFT JOIN encontros e ON a.encontro_id = e.id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    LEFT JOIN pastoral p ON a.id = p.avaliacao_id
    WHERE ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const [rows] = await conn.execute<any[]>(dataQuery, dataParams);

  return {
    data: rows,
    total,
    page,
    limit,
    offset,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFilteredEncontros(
  pagination: PaginationParams,
  filters: FilterOptions
): Promise<PaginationResult> {
  const conn = getPool();
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params: any[] = [];

  if (filters.pastoralId) {
    whereClause += ' AND pastoral_id = ?';
    params.push(filters.pastoralId);
  }

  if (filters.startDate) {
    whereClause += ' AND data_inicio >= ?';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    whereClause += ' AND data_fim <= ?';
    params.push(filters.endDate + ' 23:59:59');
  }

  if (filters.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.search) {
    whereClause += ' AND (nome LIKE ? OR tema LIKE ? OR local LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const countQuery = `
    SELECT COUNT(*) as total
    FROM encontros
    WHERE ${whereClause}
  `;

  const [countResult] = await conn.execute<any[]>(countQuery, params);
  const total = countResult[0]?.total || 0;

  const dataQuery = `
    SELECT
      e.*,
      COUNT(DISTINCT a.id) as total_avaliacoes,
      AVG(ag.overall_rating) as media_avaliacao
    FROM encontros e
    LEFT JOIN avaliacoes a ON e.id = a.encontro_id
    LEFT JOIN avaliacao_geral ag ON a.id = ag.avaliacao_id
    WHERE ${whereClause}
    GROUP BY e.id
    ORDER BY e.data_inicio DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const [rows] = await conn.execute<any[]>(dataQuery, dataParams);

  return {
    data: rows,
    total,
    page,
    limit,
    offset,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFilteredInteressados(
  pagination: PaginationParams,
  filters: FilterOptions
): Promise<PaginationResult> {
  const conn = getPool();
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let whereClause = 'p.interest IN (?, ?)';
  const params: any[] = ['sim', 'talvez'];

  if (filters.pastoralId) {
    whereClause += ' AND e.pastoral_id = ?';
    params.push(filters.pastoralId);
  }

  if (filters.startDate) {
    whereClause += ' AND e.data_inicio >= ?';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    whereClause += ' AND e.data_fim <= ?';
    params.push(filters.endDate + ' 23:59:59');
  }

  if (filters.search) {
    whereClause += ' AND (a.couple_name LIKE ? OR p.contact_info LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  const countQuery = `
    SELECT COUNT(*) as total
    FROM pastoral p
    JOIN avaliacoes a ON p.avaliacao_id = a.id
    LEFT JOIN encontros e ON a.encontro_id = e.id
    WHERE ${whereClause}
  `;

  const [countResult] = await conn.execute<any[]>(countQuery, params);
  const total = countResult[0]?.total || 0;

  const dataQuery = `
    SELECT
      a.id,
      a.couple_name,
      p.contact_info,
      p.interest,
      e.nome as encontros_nome,
      e.data_inicio,
      a.created_at
    FROM pastoral p
    JOIN avaliacoes a ON p.avaliacao_id = a.id
    LEFT JOIN encontros e ON a.encontro_id = e.id
    WHERE ${whereClause}
    ORDER BY 
      CASE p.interest 
        WHEN 'sim' THEN 1 
        WHEN 'talvez' THEN 2 
      END,
      a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const [rows] = await conn.execute<any[]>(dataQuery, dataParams);

  return {
    data: rows,
    total,
    page,
    limit,
    offset,
    totalPages: Math.ceil(total / limit),
  };
}