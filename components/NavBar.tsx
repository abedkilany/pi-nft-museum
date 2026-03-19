import { getMenuItems } from '@/lib/menu';
import { NavBarClient } from '@/components/nav/NavBarClient';

export async function NavBar() {
  const items = await getMenuItems();
  return <NavBarClient items={items} />;
}
