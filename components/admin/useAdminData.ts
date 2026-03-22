'use client';

import { useCallback, useEffect, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';

export function useAdminData<T>(url: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const response = await piApiFetch(url, { method: 'GET', cache: 'no-store' }).catch(() => null);
    const payload = response ? await response.json().catch(() => null) : null;

    if (!response?.ok || !payload?.ok) {
      setData(null);
      setError(payload?.error || 'Failed to load admin data.');
      setLoading(false);
      return null;
    }

    setData(payload.data as T);
    setLoading(false);
    return payload.data as T;
  }, [url]);

  useEffect(() => {
    load();
  }, [load, ...deps]);

  return { data, loading, error, reload: load };
}
