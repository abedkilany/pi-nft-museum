'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '../lib/pi-auth-client';

type CategoryOption = { id: number; name: string; slug: string };

export function UploadForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({ title: '', basePrice: '', discountPercent: '0', category: '', description: '', imageUrl: '', status: 'DRAFT' });
  const [file, setFile] = useState<File | null>(null);

  const finalPrice = Math.max(0, Number(form.basePrice || 0) * (1 - Number(form.discountPercent || 0) / 100));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('basePrice', form.basePrice);
    payload.append('discountPercent', form.discountPercent);
    payload.append('category', form.category);
    payload.append('description', form.description);
    payload.append('imageUrl', form.imageUrl);
    payload.append('status', form.status);
    if (file) payload.append('imageFile', file);

    const response = await piApiFetch('/api/artworks/create', { method: 'POST', body: payload });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || 'Failed to create artwork.');
      return;
    }

    setMessage('Artwork saved successfully.');
    router.push(`/artwork/${data.artwork.id}`);
    router.refresh();
  }

  return (
    <form className="card upload-form" onSubmit={handleSubmit}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Artist submission</span>
          <h1>Upload a new artwork</h1>
        </div>
        <p>New artworks start as Draft by default so you can finish them later without sending them to review by mistake.</p>
      </div>

      <div className="form-grid">
        <label>
          <span>Artwork title</span>
          <input required value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} placeholder="Example: Celestial Gate" />
          <small className="field-help">Choose a title visitors can understand at a glance.</small>
        </label>
        <label>
          <span>Initial status</span>
          <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Submit for review now</option>
          </select>
          <small className="field-help">Draft keeps the artwork private. Submit for review sends it to moderation immediately.</small>
        </label>
        <label>
          <span>Base price</span>
          <input type="number" min="0" step="0.01" required value={form.basePrice} onChange={(e) => setForm((current) => ({ ...current, basePrice: e.target.value }))} placeholder="100" />
          <small className="field-help">This is the original price suggested by the artist.</small>
        </label>
        <label>
          <span>Discount %</span>
          <input type="number" min="0" max="100" step="0.01" value={form.discountPercent} onChange={(e) => setForm((current) => ({ ...current, discountPercent: e.target.value }))} placeholder="0" />
          <small className="field-help">Final price is calculated automatically after discount.</small>
        </label>
        <label>
          <span>Final price</span>
          <input value={finalPrice.toFixed(2)} disabled />
          <small className="field-help">Calculated from base price and discount percent.</small>
        </label>
        <label>
          <span>Category</span>
          <select value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}>
            <option value="">Choose category</option>
            {categories.map((category: any) => <option key={category.id} value={category.name}>{category.name}</option>)}
          </select>
          <small className="field-help">Categories are managed from the admin dashboard.</small>
        </label>
        <label>
          <span>External image URL</span>
          <input value={form.imageUrl} onChange={(e) => setForm((current) => ({ ...current, imageUrl: e.target.value }))} placeholder="Optional if you upload a file below" />
          <small className="field-help">Paste a direct image URL only if the file is hosted elsewhere.</small>
        </label>
        <label className="full-width">
          <span>Upload image file</span>
          <input type="file" accept="image/*" onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            setPreview(selected ? URL.createObjectURL(selected) : '');
          }} />
          <small className="field-help">Recommended: upload a JPG, PNG, WEBP, GIF, or SVG image from your device.</small>
        </label>
        <label className="full-width">
          <span>Description</span>
          <textarea rows={6} required value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Describe the concept, medium, story, and any minting notes for reviewers." />
          <small className="field-help">Helpful descriptions make moderation and public review easier.</small>
        </label>
      </div>

      {preview ? <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', borderRadius: '16px' }} /> : null}

      <div className="form-actions">
        <button className="button primary" type="submit" disabled={loading}>{loading ? 'Saving...' : form.status === 'PENDING' ? 'Save and submit for review' : 'Save as draft'}</button>
        {message ? <p className="form-message">{message}</p> : null}
      </div>
    </form>
  );
}