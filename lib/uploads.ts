import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}

function hasMatchingSignature(buffer: Uint8Array, type: string) {
  if (type === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }

  const signature = FILE_SIGNATURES.find((item) => item.mime === type);
  if (!signature) return false;
  return signature.bytes.every((byte, index) => buffer[index] === byte);
}

type SaveOptions = {
  subdir?: string;
  allowedTypes?: string[];
  maxSizeMb?: number;
};

export async function saveUploadedFile(file: File, options: SaveOptions = {}) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) {
    return null;
  }

  const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
  }

  const maxSizeMb = options.maxSizeMb ?? 10;
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new Error(`File is too large. Maximum size is ${maxSizeMb} MB.`);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasMatchingSignature(buffer, file.type)) {
    throw new Error('Uploaded file content does not match the declared file type.');
  }

  const targetDir = options.subdir ? path.join(UPLOAD_DIR, options.subdir) : UPLOAD_DIR;
  await mkdir(targetDir, { recursive: true });

  const originalBase = path.parse(file.name).name;
  const safeName = sanitizeFilename(originalBase);
  const extension = extensionForMimeType(file.type);
  const filename = `${Date.now()}-${randomUUID()}-${safeName}${extension}`;
  const filepath = path.join(targetDir, filename);

  await writeFile(filepath, buffer);

  const publicPath = options.subdir ? `/uploads/${options.subdir}/${filename}` : `/uploads/${filename}`;
  return {
    url: publicPath,
    originalName: file.name,
    mimeType: file.type || null,
  };
}

export async function saveUploadedImage(file: File) {
  const saved = await saveUploadedFile(file, {
    allowedTypes: DEFAULT_ALLOWED_TYPES,
    maxSizeMb: 8,
  });

  return saved?.url || null;
}
