import { redirect } from 'next/navigation';

export default function ProfileShortcutPage() {
  redirect('/me');
}
