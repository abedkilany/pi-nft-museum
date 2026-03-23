import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import pkg from '@/package.json';
import { prisma } from '@/lib/prisma';
import { getCurrentUserAccess } from '@/lib/permissions';
import { buildAdminSections } from '@/lib/admin-sections';
import { extractBearerToken } from '@/lib/pi-session';
import { readSystemLogs } from '@/lib/system-log';

function redactValue(key: string, value: string | null) {
  if (!value) return null;
  const lowered = key.toLowerCase();
  if (
    lowered.includes('authorization') ||
    lowered.includes('cookie') ||
    lowered.includes('secret') ||
    lowered.includes('token') ||
    lowered.includes('password')
  ) {
    return '[redacted]';
  }
  return value;
}

export function getDeploymentFingerprint() {
  return {
    appName: pkg.name,
    appVersion: pkg.version,
    nodeEnv: process.env.NODE_ENV ?? null,
    authMode: 'token-only',
    appDebug: process.env.APP_DEBUG ?? null,
    logLevel: process.env.LOG_LEVEL ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
    region: process.env.VERCEL_REGION ?? null,
    runtimeTimestamp: new Date().toISOString(),
  };
}

export function getRequestSnapshot() {
  const headerStore = headers();
  const authorization = headerStore.get('authorization');
  const authToken = extractBearerToken(authorization);

  return {
    host: headerStore.get('host'),
    origin: headerStore.get('origin'),
    referer: headerStore.get('referer'),
    userAgent: headerStore.get('user-agent'),
    forwardedHost: headerStore.get('x-forwarded-host'),
    forwardedProto: headerStore.get('x-forwarded-proto'),
    forwardedForPresent: Boolean(headerStore.get('x-forwarded-for')),
    authHeaderPresent: Boolean(authorization),
    bearerTokenPresent: Boolean(authToken),
    selectedHeaders: {
      accept: redactValue('accept', headerStore.get('accept')),
      contentType: redactValue('content-type', headerStore.get('content-type')),
      xRequestedWith: redactValue('x-requested-with', headerStore.get('x-requested-with')),
      xForwardedProto: redactValue('x-forwarded-proto', headerStore.get('x-forwarded-proto')),
    },
  };
}

export async function requireDebugAccessApi() {
  const access = await getCurrentUserAccess();

  if (!access?.sessionUser) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }

  if (!access.isStaff) {
    return { error: NextResponse.json({ error: 'Staff access required.' }, { status: 403 }) } as const;
  }

  return { access } as const;
}

export async function getAuthDiagnostics() {
  const access = await getCurrentUserAccess();
  const sessionUser = access?.sessionUser ?? null;
  const rolePermissions = access?.permissions ?? [];

  return {
    authenticated: Boolean(sessionUser),
    user: sessionUser
      ? {
          id: sessionUser.userId,
          username: sessionUser.username,
          role: sessionUser.role,
          email: sessionUser.email ?? null,
        }
      : null,
    access: access
      ? {
          role: access.role,
          isStaff: access.isStaff,
          isSuperadmin: access.isSuperadmin,
          permissionsCount: rolePermissions.length,
          permissions: rolePermissions,
          sections: buildAdminSections(rolePermissions),
        }
      : null,
    request: getRequestSnapshot(),
  };
}

export async function getDbDiagnostics() {
  const access = await getCurrentUserAccess();
  const currentUserId = access?.sessionUser?.userId ?? null;

  const [
    userCount,
    roleCount,
    permissionCount,
    rolePermissionCount,
    auditCount,
    systemLogCount,
    latestAudit,
    latestSystemLog,
    currentUserRow,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.rolePermission.count(),
    prisma.auditLog.count({
      where: {
        NOT: {
          targetType: 'SYSTEM',
          action: { startsWith: 'SYSTEM_LOG_' },
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        targetType: 'SYSTEM',
        action: { startsWith: 'SYSTEM_LOG_' },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        NOT: {
          targetType: 'SYSTEM',
          action: { startsWith: 'SYSTEM_LOG_' },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
      },
    }),
    prisma.auditLog.findFirst({
      where: {
        targetType: 'SYSTEM',
        action: { startsWith: 'SYSTEM_LOG_' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        createdAt: true,
        newValuesJson: true,
      },
    }),
    currentUserId
      ? prisma.user.findUnique({
          where: { id: currentUserId },
          select: {
            id: true,
            username: true,
            email: true,
            roleId: true,
            status: true,
            role: {
              select: {
                id: true,
                key: true,
                name: true,
                permissions: {
                  include: {
                    permission: {
                      select: {
                        id: true,
                        key: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    connectivity: {
      ok: true,
      provider: 'postgresql',
    },
    counts: {
      users: userCount,
      roles: roleCount,
      permissions: permissionCount,
      rolePermissions: rolePermissionCount,
      auditLogs: auditCount,
      systemLogs: systemLogCount,
    },
    currentUserRow: currentUserRow
      ? {
          ...currentUserRow,
          role: currentUserRow.role
            ? {
                ...currentUserRow.role,
                permissions: currentUserRow.role.permissions.map((entry) => entry.permission),
              }
            : null,
        }
      : null,
    latestAudit,
    latestSystemLog,
    recentSystemLogs: await readSystemLogs(5),
  };
}

function previewBody(text: string) {
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

export async function probeSameOriginRoute(input: {
  origin: string;
  path: string;
  authorization?: string | null;
}) {
  const response = await fetch(`${input.origin}${input.path}`, {
    method: 'GET',
    headers: input.authorization ? { Authorization: input.authorization } : {},
    cache: 'no-store',
  });

  const text = await response.text();

  return {
    path: input.path,
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type'),
    bodyPreview: previewBody(text),
  };
}
