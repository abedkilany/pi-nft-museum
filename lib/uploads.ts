import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const STORAGE_PROVIDER = (process.env.FILE_STORAGE_PROVIDER || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : process.env.NODE_ENV === 'production' ? 'vercel-blob' : 'local')).toLowerCase();

const FILE_SIGNATURES: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '') || 'file';
}

function extensionForMimeType(type: string) {
  switch (type) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'image/gif': return '.gif';
    default: return '';
  }
}

function hasMatchingSignature(buffer: Uint8Array, type: string) {
  if (type === 'image/webp') {
    return buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  }
  const signature = FILE_SIGNATURES.find((item) => item.mime === type);
  if (!signature) return false;
  return signature.bytes.every((byte, index) => buffer[index] === byte);
}

type SaveOptions = { subdir?: string; allowedTypes?: string[]; maxSizeMb?: number; };

async function saveLocally(buffer: Uint8Array, filename: string, subdir?: string) {
  const targetDir = subdir ? path.join(LOCAL_UPLOAD_DIR, subdir) : LOCAL_UPLOAD_DIR;
  await mkdir(targetDir, { recursive: true });
  const filepath = path.join(targetDir, filename);
  await writeFile(filepath, buffer);
  return subdir ? `/uploads/${subdir}/${filename}` : `/uploads/${filename}`;
}

async function saveToVercelBlob(buffer: Uint8Array, filename: string, contentType: string, subdir?: string) {
  try {
    const mod = await (0, eval)("import('@vercel/blob')");
    const pathname = subdir ? `${subdir}/${filename}` : filename;
    const blob = await mod.put(pathname, buffer, { access: 'public', addRandomSuffix: false, contentType, token: process.env.BLOB_READ_WRITE_TOKEN });
    return blob.url as string;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown storage error';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Blob storage is not ready. Install @vercel/blob and set BLOB_READ_WRITE_TOKEN. ${message}`);
    }
    return saveLocally(buffer, filename, subdir);
  }
}

export async function saveUploadedFile(file: File, options: SaveOptions = {}) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) return null;
  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;
  if (!allowedTypes.includes(file.type)) throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  const maxSizeMb = options.maxSizeMb ?? 10;
  if (file.size > maxSizeMb * 1024 * 1024) throw new Error(`File is too large. Maximum size is ${maxSizeMb} MB.`);
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasMatchingSignature(buffer, file.type)) throw new Error('Uploaded file content does not match the declared file type.');
  const originalBase = path.parse(file.name).name;
  const safeName = sanitizeFilename(originalBase);
  const extension = extensionForMimeType(file.type);
  const filename = `${Date.now()}-${randomUUID()}-${safeName}${extension}`;
  const url = STORAGE_PROVIDER === 'local' ? await saveLocally(buffer, filename, options.subdir) : await saveToVercelBlob(buffer, filename, file.type, options.subdir);
  return { url, originalName: file.name, mimeType: file.type || null, storageProvider: STORAGE_PROVIDER };
}

export async function saveUploadedImage(file: File) {
  const saved = await saveUploadedFile(file, { allowedTypes: DEFAULT_ALLOWED_TYPES, maxSizeMb: 8 });
  return saved?.url || null;
}
