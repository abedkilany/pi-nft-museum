import { mkdir, readFile, readdir, rename, rm, stat, writeFile, appendFile } from 'fs/promises';
import path from 'path';

export type SystemLogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: unknown;
};

const LOG_DIR = path.join(process.cwd(), 'logs');
const SYSTEM_LOG_FILE = path.join(LOG_DIR, 'system.log');
const DEBUG_LOG_FILE = path.join(LOG_DIR, 'debug.log');
const LOG_MAX_SIZE_BYTES = Number(process.env.LOG_MAX_SIZE_BYTES || 5 * 1024 * 1024);
const LOG_MAX_ARCHIVES = Number(process.env.LOG_MAX_ARCHIVES || 5);

async function ensureLogDir() {
  await mkdir(LOG_DIR, { recursive: true });
}

async function rotateLogFileIfNeeded(filePath: string, prefix: string) {
  await ensureLogDir();

  try {
    const info = await stat(filePath);
    if (info.size < LOG_MAX_SIZE_BYTES) return;

    const archiveName = `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    await rename(filePath, path.join(LOG_DIR, archiveName));

    const files = (await readdir(LOG_DIR))
      .filter((name) => new RegExp(`^${prefix}-.*\.log$`).test(name))
      .sort()
      .reverse();

    for (const extra of files.slice(LOG_MAX_ARCHIVES)) {
      await rm(path.join(LOG_DIR, extra), { force: true });
    }
  } catch {
    // ignore missing file or rotation races
  }
}

async function appendLine(filePath: string, line: string, prefix: string) {
  await rotateLogFileIfNeeded(filePath, prefix);
  await ensureLogDir();
  await appendFile(filePath, line, 'utf8');
}

export async function appendSystemLog(entry: SystemLogEntry) {
  const line = `${JSON.stringify(entry)}
`;
  await Promise.all([
    appendLine(SYSTEM_LOG_FILE, line, 'system'),
    appendLine(DEBUG_LOG_FILE, line, 'debug')
  ]);
}

export async function readSystemLogs(limit = 250): Promise<SystemLogEntry[]> {
  const filesToTry = [DEBUG_LOG_FILE, SYSTEM_LOG_FILE];

  for (const filePath of filesToTry) {
    try {
      const raw = await readFile(filePath, 'utf8');
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line) as SystemLogEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .slice(-limit)
        .reverse() as SystemLogEntry[];
    } catch {
      // try next file
    }
  }

  return [];
}

export async function clearSystemLogs() {
  await ensureLogDir();
  await Promise.all([
    writeFile(SYSTEM_LOG_FILE, '', 'utf8'),
    writeFile(DEBUG_LOG_FILE, '', 'utf8')
  ]);
}

export async function getSystemLogFileBuffer() {
  try {
    return await readFile(DEBUG_LOG_FILE);
  } catch {
    try {
      return await readFile(SYSTEM_LOG_FILE);
    } catch {
      return Buffer.from('');
    }
  }
}

export function getDebugLogPath() {
  return DEBUG_LOG_FILE;
}

export async function deleteUploadsDirectory() {
  await rm(path.join(process.cwd(), 'public', 'uploads'), { recursive: true, force: true });
}
