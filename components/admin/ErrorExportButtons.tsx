'use client';

import { useState } from 'react';
import { adminApiFetch } from '@/lib/admin-auth-client';

type Props = {
  queryString?: string;
  id?: number;
};

function getFilenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

export function ErrorExportButtons({ queryString = '', id }: Props) {
  const [busy, setBusy] = useState<'csv' | 'json' | null>(null);

  async function download(format: 'csv' | 'json') {
    try {
      setBusy(format);
      const suffix = queryString ? `&${queryString}` : '';
      const idParam = id ? `&id=${id}` : '';
      const response = await adminApiFetch(`/api/admin/errors/export?format=${format}${idParam}${suffix}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFilenameFromDisposition(
        response.headers.get('content-disposition'),
        `error-report.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Download failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button type="button" className="button secondary" onClick={() => void download('csv')} disabled={busy !== null}>
        {busy === 'csv' ? 'Preparing CSV…' : 'Download CSV'}
      </button>
      <button type="button" className="button secondary" onClick={() => void download('json')} disabled={busy !== null}>
        {busy === 'json' ? 'Preparing JSON…' : 'Download JSON'}
      </button>
    </>
  );
}
