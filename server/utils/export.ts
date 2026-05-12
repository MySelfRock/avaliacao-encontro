export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any, row: any) => string;
}

export interface ExportOptions {
  columns: ExportColumn[];
  filename: string;
  format?: 'csv' | 'json';
}

export function exportToCSV(
  data: Record<string, any>[],
  options: ExportOptions
): string {
  const { columns } = options;

  const headers = columns.map((c) => c.label).join(',');

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value, row) : value;
        return formatCSVValue(formatted);
      })
      .join(',')
  );

  return [headers, ...rows].join('\n');
}

export function exportToJSON<T>(data: T[], filename: string): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      filename,
      total: data.length,
      data,
    },
    null,
    2
  );
}

function formatCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const stringValue = String(value);

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function setExportHeaders(
  res: any,
  filename: string,
  format: 'csv' | 'json' = 'csv'
): void {
  const timestamp = new Date().toISOString().slice(0, 10);
  const fullFilename = `${filename}_${timestamp}.${format}`;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fullFilename}"`
  );
}

export const avaliacaoColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'couple_name', label: 'Nome do Casal' },
  { key: 'encontro_nome', label: 'Encontro' },
  {
    key: 'created_at',
    label: 'Data da Avaliação',
    format: (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '',
  },
  {
    key: 'overall_rating',
    label: 'Nota Geral',
    format: (v: any) => v ? `${v}/5` : 'N/A',
  },
  {
    key: 'recommendation',
    label: 'Recomendação',
    format: (v: any) => v ? `${v}/5` : 'N/A',
  },
  {
    key: 'pastoral_interest',
    label: 'Interesse Pastoral',
    format: (v: any) => {
      if (v === 'sim') return 'Sim';
      if (v === 'talvez') return 'Talvez';
      if (v === 'nao') return 'Não';
      return 'Não informado';
    },
  },
  { key: 'contact_info', label: 'Contato' },
];

export const encontroColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome do Encontro' },
  { key: 'tema', label: 'Tema' },
  {
    key: 'data_inicio',
    label: 'Data Início',
    format: (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '',
  },
  {
    key: 'data_fim',
    label: 'Data Fim',
    format: (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '',
  },
  { key: 'local', label: 'Local' },
  {
    key: 'status',
    label: 'Status',
    format: (v: any) => {
      if (v === 'planejado') return 'Planejado';
      if (v === 'em_andamento') return 'Em Andamento';
      if (v === 'concluido') return 'Concluído';
      if (v === 'cancelado') return 'Cancelado';
      return v;
    },
  },
  {
    key: 'total_avaliacoes',
    label: 'Total Avaliações',
    format: (v: any) => v || '0',
  },
  {
    key: 'media_avaliacao',
    label: 'Média Avaliação',
    format: (v: any) => v ? Number(v).toFixed(1) : 'N/A',
  },
];

export const interesadosColumns: ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'couple_name', label: 'Nome do Casal' },
  { key: 'encontro_nome', label: 'Encontro' },
  {
    key: 'data_inicio',
    label: 'Data do Encontro',
    format: (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '',
  },
  {
    key: 'interest',
    label: 'Interesse',
    format: (v: any) => (v === 'sim' ? 'Sim' : 'Talvez'),
  },
  { key: 'contact_info', label: 'Contato' },
  {
    key: 'created_at',
    label: 'Data do Registro',
    format: (v: any) => v ? new Date(v).toLocaleDateString('pt-BR') : '',
  },
];