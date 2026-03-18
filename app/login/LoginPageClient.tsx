
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';
import { PiLoginCard } from '@/components/auth/PiLoginCard';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/account');

  return <PiLoginCard />;
}
