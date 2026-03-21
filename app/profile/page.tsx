import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.username) {
    redirect('/login');
  }

  redirect(`/profile/${currentUser.username}`);
}
