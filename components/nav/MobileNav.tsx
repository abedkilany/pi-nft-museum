'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type MobileNavItem = {
  label: string;
  href: string;
};

type Props = {
  items: MobileNavItem[];
};

export function MobileNav({ items }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-summary"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        <span>Menu</span>
        <span className="mobile-nav-icon" aria-hidden="true">
          {open ? '✕' : '☰'}
        </span>
      </button>

      {open ? (
        <nav id="mobile-nav-panel" className="mobile-nav-panel">
          {items.map((item: any) => (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className="mobile-nav-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
