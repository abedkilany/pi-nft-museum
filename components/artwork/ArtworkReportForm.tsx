'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '../../lib/pi-auth-client';

export function ArtworkReportForm({ artworkId, canReport }: { artworkId: number; canReport: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  async function submitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append('artworkId', String(artworkId));
    if (files) {
      Array.from(files).slice(0, 5).forEach((file) => formData.append('evidenceFiles', file));
    }
    const response = await piApiFetch('/api/artworks/reports', { method: 'POST', body: formData });
    const data = await response.json();
    setBusy(false);
    setMessage(data.message || data.error || 'Done.');
    if (response.ok) {
      form.reset();
      setFiles(null);
      setOpen(false);
      router.refresh();
    }
  }

  if (!canReport) {
    return (
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Safety</span>
            <h2>Report artwork</h2>
          </div>
          <p>Login to report stolen, copied, spam, or offensive artworks.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ padding: '24px' }}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Safety</span>
          <h2>Report artwork</h2>
        </div>
        <p>Use this when artwork is stolen, copied, fake, or abusive. After 5 reports the artwork is moved to pending review automatically.</p>
      </div>
      <div className="card-actions" style={{ marginBottom: open ? 18 : 0 }}>
        <button type="button" className="button secondary" onClick={() => setOpen((value) => !value)}>{open ? 'Hide report form' : 'Open report form'}</button>
      </div>
      {open ? (
        <form onSubmit={submitReport} className="upload-form" style={{ padding: 0 }}>
          <div className="form-grid">
            <label>
              <span>Reason</span>
              <select name="reason" defaultValue="COPYRIGHT" required>
                <option value="COPYRIGHT">Stolen or copied artwork</option>
                <option value="FAKE">Fake artwork</option>
                <option value="SPAM">Spam</option>
                <option value="OFFENSIVE">Offensive content</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              <span>Your contact email</span>
              <input type="email" name="contactEmail" placeholder="you@example.com" />
            </label>
            <label className="full-width">
              <span>Original artwork link</span>
              <input type="url" name="originalWorkLink" placeholder="Link to the original work or proof of ownership" />
            </label>
            <label className="full-width">
              <span>Extra evidence link</span>
              <input type="url" name="evidenceLink" placeholder="Dropbox, Drive, or any public evidence link" />
            </label>
            <label className="full-width">
              <span>Upload evidence files</span>
              <input type="file" accept="image/*,.pdf" multiple onChange={(e) => setFiles(e.target.files)} />
            </label>
            <label className="full-width">
              <span>Details</span>
              <textarea name="description" rows={5} placeholder="Explain why this artwork should be reviewed. Include dates, sources, ownership details, or anything that helps the admin team." required />
            </label>
          </div>
          <div className="form-actions">
            <button className="button primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Submit report'}</button>
            {message ? <p className="form-message">{message}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}