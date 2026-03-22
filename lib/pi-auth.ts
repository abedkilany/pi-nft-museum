
import { prisma } from '@/lib/prisma';

type PiMeResponse = {
  uid: string;
  username?: string;
  wallet_address?: string;
};

function normalizePiUsername(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .toLowerCase();
}

export function buildSyntheticEmail(piUid: string) {
  return `pi-${piUid}@users.pi.local`;
}

export async function fetchPiUser(accessToken: string): Promise<PiMeResponse> {
  const response = await fetch('https://api.minepi.com/v2/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Pi authentication was rejected. Please sign in again from Pi Browser.');
    }

    throw new Error(`Pi verification failed with status ${response.status}.`);
  }

  return response.json();
}

export async function ensureUniqueUsername(baseValue: string, excludeUserId?: number) {
  const sanitizedBase = normalizePiUsername(baseValue) || 'pi-user';
  let candidate = sanitizedBase.slice(0, 30) || 'pi-user';
  let suffix = 1;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true }
    });

    if (!existing || existing.id === excludeUserId) {
      return candidate;
    }

    suffix += 1;
    const suffixText = `-${suffix}`;
    candidate = `${sanitizedBase.slice(0, Math.max(3, 30 - suffixText.length))}${suffixText}`;
  }
}

function parseCsvEnv(value?: string | null) {
  return String(value || '')
    .split(',')
    .map((item: any) => item.trim())
    .filter(Boolean);
}

export async function resolvePiRole(piUser: PiMeResponse) {
  const superadminRole = parseCsvEnv(process.env.PI_SUPERADMIN_USERNAMES);
  const superadminUids = parseCsvEnv(process.env.PI_SUPERADMIN_UIDS);
  const adminRole = parseCsvEnv(process.env.PI_ADMIN_USERNAMES);
  const adminUids = parseCsvEnv(process.env.PI_ADMIN_UIDS);
  const moderatorRole = parseCsvEnv(process.env.PI_MODERATOR_USERNAMES);
  const moderatorUids = parseCsvEnv(process.env.PI_MODERATOR_UIDS);

  if (superadminRole.includes(piUser.username || '') || superadminUids.includes(piUser.uid)) {
    return 'superadmin';
  }

  if (adminRole.includes(piUser.username || '') || adminUids.includes(piUser.uid)) {
    return 'admin';
  }

  if (moderatorRole.includes(piUser.username || '') || moderatorUids.includes(piUser.uid)) {
    return 'moderator';
  }

  return 'artist_or_trader';
}
