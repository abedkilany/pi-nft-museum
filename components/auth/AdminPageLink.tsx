'use client';

import { ReactNode } from 'react';

type Props = {
  className?: string;
  children?: ReactNode;
};

export function AdminPageLink({ className = 'button secondary', children }: Props) {
  return (
    <a href="/admin-login" className={className}>
      {children || 'Admin panel'}
    </a>
  );
}
