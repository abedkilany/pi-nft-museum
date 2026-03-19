import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

const FILE_SIGNATURES: Array<{ mime: string; bytes?: number[]; validator?: (buffer: Uint8Array) => boolean }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  {
    mime: 'image/webp',
    validator: (buffer) =>
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50,
  },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
];

function sanitizeFilename(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || 'file'
  );
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
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

function hasMatchingSignature(buffer: Uint8Array, type: string) {
  const signature = FILE_SIGNATURES.find((item) => item.mime === type);
  if (!signature) return false;
  if (signature.validator) return signature.validator(buffer);
  return signature.bytes?.every((byte, index) => buffer[index] === byte) ?? false;
}

function getGatewayBase() {
  const raw = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs';
  return raw.replace(/\/+$/, '');
}

function shouldUseIpfs() {
  return Boolean(process.env.PINATA_JWT);
}

type SaveOptions = {
  subdir?: string;
  allowedTypes?: string[];
  maxSizeMb?: number;
};

export type SavedUpload = {
  url: string;
  originalName: string;
  mimeType: string | null;
  cid?: string | null;
  gatewayUrl?: string | null;
  storageProvider: 'local' | 'ipfs';
};

async function saveLocally(file: File, buffer: Uint8Array, options: SaveOptions): Promise<SavedUpload> {
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
    cid: null,
    gatewayUrl: null,
    storageProvider: 'local',
  };
}

async function saveToPinata(file: File, buffer: Uint8Array): Promise<SavedUpload> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error('PINATA_JWT is not configured.');
  }

  const originalBase = path.parse(file.name).name;
  const safeName = sanitizeFilename(originalBase);
  const extension = extensionForMimeType(file.type);
  const pinName = `${Date.now()}-${randomUUID()}-${safeName}${extension}`;

  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: file.type }), pinName);
  formData.append('pinataMetadata', JSON.stringify({ name: pinName }));

  const response = await fetch(PINATA_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: formData,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.IpfsHash) {
    throw new Error(payload?.error?.details || payload?.message || 'Pinata upload failed.');
  }

  const cid = String(payload.IpfsHash);
  const gatewayUrl = `${getGatewayBase()}/${cid}`;

  return {
    url: gatewayUrl,
    originalName: file.name,
    mimeType: file.type || null,
    cid,
    gatewayUrl,
    storageProvider: 'ipfs',
  };
}

export async function saveUploadedFile(file: File, options: SaveOptions = {}): Promise<SavedUpload | null> {
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

  if (shouldUseIpfs()) {
    return saveToPinata(file, buffer);
  }

  return saveLocally(file, buffer, options);
}

export async function saveUploadedImageAsset(file: File) {
  return saveUploadedFile(file, {
    allowedTypes: DEFAULT_ALLOWED_TYPES,
    maxSizeMb: 8,
  });
}

export async function saveUploadedImage(file: File) {
  const saved = await saveUploadedImageAsset(file);
  return saved?.url || null;
}
