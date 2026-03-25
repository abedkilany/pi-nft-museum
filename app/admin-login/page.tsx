import { redirect } from 'next/navigation';
import AdminLoginPageClient from './AdminLoginPageClient';
import { getCurrentAdminContextUser } from '@/lib/current-user';

type Props = {
  searchParams?: {
    next?: string;
  };
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const user = await getCurrentAdminContextUser();
  if (user) {
    redirect('/admin');
  }

  const nextPath = searchParams?.next;

  return <AdminLoginPageClient nextPath={nextPath} />;
}
