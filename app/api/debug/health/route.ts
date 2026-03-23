import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken } from '@/lib/pi-session';

export async function GET(request: NextRequest) {
  const headers = request.headers;
  return NextResponse.json({
    ok: true,
    summary: 'التطبيق يعمل على بيئة الإنتاج ويمكنه استقبال الطلبات بشكل طبيعي.',
    deployment: {
      appName: process.env.APP_NAME || 'pi-nft-museum-app',
      appVersion: process.env.npm_package_version || '0.1.0',
      nodeEnv: process.env.NODE_ENV || null,
      authMode: process.env.AUTH_MODE || 'token-only',
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelUrl: process.env.VERCEL_URL || null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      region: process.env.VERCEL_REGION || null,
      runtimeTimestamp: new Date().toISOString(),
    },
    request: {
      host: headers.get('host'),
      referer: headers.get('referer'),
      forwardedHost: headers.get('x-forwarded-host'),
      forwardedProto: headers.get('x-forwarded-proto'),
      authHeaderPresent: Boolean(headers.get('authorization')),
      bearerTokenPresent: Boolean(extractBearerToken(headers.get('authorization'))),
    },
  });
}
