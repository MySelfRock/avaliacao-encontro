import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';
import fs from 'fs';
import { env } from '../config/env';
import { logger } from '../config/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext);
    const safeName = basename.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use: JPEG, PNG, GIF, WebP ou SVG'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

export interface UploadedFile {
  filename: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
}

export function getFileUrl(filename: string): string {
  const baseUrl = process.env.API_URL || 'http://localhost:3001';
  return `${baseUrl}/uploads/${filename}`;
}

export function deleteFile(filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const filePath = path.join(UPLOAD_DIR, filename);
    
    fs.unlink(filePath, (err) => {
      if (err) {
        logger.error('Erro ao excluir arquivo', { filename, error: err.message });
        reject(err);
      } else {
        logger.info('Arquivo excluído', { filename });
        resolve();
      }
    });
  });
}

export function saveBase64Image(
  base64Data: string,
  filename: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    
    if (!matches) {
      return reject(new Error('Dados Base64 inválidos'));
    }

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const safeName = `${filename}-${randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        logger.error('Erro ao salvar imagem Base64', { error: err.message });
        reject(err);
      } else {
        logger.info('Imagem salva', { filename: safeName });
        resolve(safeName);
      }
    });
  });
}