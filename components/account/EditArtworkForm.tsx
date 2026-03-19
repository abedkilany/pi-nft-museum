'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { piApiFetch } from '../../lib/pi-auth-client';

type EditableArtwork = {
  id: number;
  status: string;
  title: string;
  description: string;
  basePrice: number;
  discountPercent: number;
  price: number;
  imageUrl: string;
  category: string;
  reviewNote: string;
};

type CategoryOption = { id: number; name: string; slug: string };

export function EditArtworkForm({ artwork, categories }: { artwork: EditableArtwork; categories: CategoryOption[] }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(artwork.imageUrl);
  const [file, setFile] = useState<File | null>(null);
  const draftMode = artwork.status === 'DRAFT';
  const [form, setForm] = useState({
    title: artwork.title,
    description: artwork.description,
    basePrice: String(artwork.basePrice),
    discountPercent: String(artwork.discountPercent),
    imageUrl: artwork.imageUrl,
    category: artwork.category
  });

  const finalPrice = Math.max(0, Number(form.basePrice || 0) * (1 - Number(form.discountPercent || 0) / 100));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const payload = new FormData();
    payload.append('artworkId', String(artwork.id));
    payload.append('title', form.title);
    payload.append('description', form.description);
    payload.append('basePrice', form.basePrice);
    payload.append('discountPercent', form.discountPercent);
    payload.append('imageUrl', form.imageUrl);
    payload.append('category', form.category);
    if (file) payload.append('imageFile', file);

    const response = await piApiFetch('/api/artworks/update', { method: 'POST', body: payload });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error || 'Failed to update artwork.');
      return;
    }

    setMessage(draftMode ? 'Artwork updated successfully.' : 'Artwork pricing updated successfully.');
    router.push('/account/artworks');
    router.refresh();
  }

  return (
    <form className="card upload-form" onSubmit={handleSubmit}>
      <div className="section-head compact">
        <div>
          <span className="section-kicker">Edit artwork</span>
          <h1>Update your artwork</h1>
        </div>
        <p>{draftMode ? 'Draft artworks can be fully edited.' : 'After leaving draft, only pricing can be changed by the artist.'}</p>
      </div>

      {artwork.reviewNote ? <div className="card" style={{ padding: '16px', marginBottom: '18px' }}><strong>Review note</strong><p style={{ marginBottom: 0 }}>{artwork.reviewNote}</p></div> : null}

      <div className="form-grid">
        <label>
          <span>Artwork title</span>
          <input required value={form.title} disabled={!draftMode} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
        </label>
        <label>
          <span>Base price</span>
          <input type="number" min="0" step="0.01" required value={form.basePrice} onChange={(e) => setForm((current) => ({ ...current, basePrice: e.target.value }))} />
        </label>
        <label>
          <span>Discount %</span>
          <input type="number" min="0" max="100" step="0.01" value={form.discountPercent} onChange={(e) => setForm((current) => ({ ...current, discountPercent: e.target.value }))} />
        </label>
        <label>
          <span>Final price</span>
          <input value={finalPrice.toFixed(2)} disabled />
        </label>
        <label>
          <span>Category</span>
          <select value={form.category} disabled={!draftMode} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}>
            <option value="">Choose category</option>
            {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
          </select>
        </label>
        <label>
          <span>External image URL</span>
          <input value={form.imageUrl} disabled={!draftMode} onChange={(e) => setForm((current) => ({ ...current, imageUrl: e.target.value }))} />
        </label>
        <label className="full-width">
          <span>Upload new image</span>
          <input type="file" accept="image/*" disabled={!draftMode} onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            setPreview(selected ? URL.createObjectURL(selected) : form.imageUrl);
          }} />
        </label>
        <label className="full-width">
          <span>Description</span>
          <textarea rows={6} required disabled={!draftMode} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
        </label>
      </div>

      {!draftMode ? <p style={{ margin: 0, color: 'var(--muted)' }}>This artwork is no longer in draft. Only base price and discount can be updated now.</p> : null}

      {preview ? <img src={preview} alt={form.title} style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '16px' }} /> : null}

      <div className="form-actions">
        <button className="button primary" type="submit" disabled={loading}>{loading ? 'Saving...' : draftMode ? 'Save changes' : 'Save pricing'}</button>
        {message ? <p className="form-message">{message}</p> : null}
      </div>
    </form>
  );
}