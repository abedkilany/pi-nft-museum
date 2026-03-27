import { MenuEditor } from '@/components/admin/MenuEditor';
import { getMenuItems } from '@/lib/services/content';

export default async function AdminMenuPage() {
  const items = await getMenuItems();
  return <MenuEditor initialItems={items} />;
}
