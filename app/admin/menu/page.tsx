import { MenuEditor } from '@/components/admin/MenuEditor';
import { getMenuItems } from '@/lib/menu';

import { requireAdminPage } from '@/lib/admin';
export default async function AdminMenuPage() {
  await requireAdminPage();
  const items = await getMenuItems();
  return <MenuEditor initialItems={items} />;
}