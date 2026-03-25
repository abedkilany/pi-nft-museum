import { redirect } from 'next/navigation';
import AdminLoginPageClient from './AdminLoginPageClient';
import { getCurrentAdminContextUser } from '@/lib/current-user';

export default async function AdminLoginPage() {
  const user = await getCurrentAdminContextUser();
  if (user) {
    redirect('/admin');
  }

  return <AdminLoginPageClient />;
}
