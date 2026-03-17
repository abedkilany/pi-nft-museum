import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { ADMIN_ROLES } from '@/lib/roles';

export async function requireAdminJson() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !ADMIN_ROLES.includes(currentUser.role as (typeof ADMIN_ROLES)[number])) {
    return {
      currentUser: null,
      errorResponse: NextResponse.json({ error: 'Unauthorized.' }, { status: 403 })
    };
  }

  return { currentUser, errorResponse: null };
}

export async function requireAdminRedirect(request: Request, fallbackPath = '/account') {
  const currentUser = await getCurrentUser();

  if (!currentUser || !ADMIN_ROLES.includes(currentUser.role as (typeof ADMIN_ROLES)[number])) {
    return {
      currentUser: null,
      errorResponse: NextResponse.redirect(new URL(fallbackPath, request.url))
    };
  }

  return { currentUser, errorResponse: null };
}
