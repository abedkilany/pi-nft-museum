import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { isAdminRole, isSuperadminRole } from '@/lib/roles';

export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdminRole(user.role)) redirect('/account');
  return user;
}

export async function requireAdminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }
  if (!isAdminRole(user.role)) {
    return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export async function requireSuperadminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  }
  if (!isSuperadminRole(user.role)) {
    return { error: NextResponse.json({ error: 'Superadmin access required.' }, { status: 403 }) } as const;
  }
  return { user } as const;
}
