import { getMenuItems } from '@/lib/services/content';
import { NavBarClient } from '@/components/nav/NavBarClient';

export async function NavBar() {
  const items = await getMenuItems();
  return <NavBarClient items={items} />;
}
