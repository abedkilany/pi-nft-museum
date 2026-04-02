'use client';

import { ReactNode, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';

function submitAdminHandoff(url: string, grant: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'grant';
  input.value = grant;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

type Props = {
  className?: string;
  children?: ReactNode;
};

export function AdminPageLink({ className = 'button secondary', children }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await piApiFetch('/api/auth/admin-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Request': 'pi-web',
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (payload?.redirectUrl) {
          window.location.assign(String(payload.redirectUrl));
          return;
        }
        throw new Error(payload?.error || 'Unable to open admin panel.');
      }

      if (!payload?.ok || !payload?.url || !payload?.grant) {
        if (payload?.redirectUrl) {
          window.location.assign(String(payload.redirectUrl));
          return;
        }
        throw new Error(payload?.error || 'Unable to open admin panel.');
      }

      submitAdminHandoff(String(payload.url), String(payload.grant));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to open admin panel.');
      setLoading(false);
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} disabled={loading}>
      {loading ? 'Opening…' : children || 'Admin panel'}
    </button>
  );
}
