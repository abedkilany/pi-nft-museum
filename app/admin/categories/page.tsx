'use client';

import { useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { useAdminData } from '@/components/admin/useAdminData';

export default function AdminCategoriesPage() {
  const { data, loading, error, reload } = useAdminData<any[]>('/api/admin/categories/list');
  const [message, setMessage] = useState('');

  async function submitForm(event: React.FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault();
    setMessage('');
    const formData = new FormData(event.currentTarget);
    const response = await piApiFetch(endpoint, { method: 'POST', body: formData });
    setMessage(response.ok ? 'Category saved.' : 'Failed to save category.');
    if (response.ok) reload();
  }

  if (loading) return <div className="card" style={{ padding: '24px' }}><p>Loading categories…</p></div>;
  if (error || !data) return <div className="card" style={{ padding: '24px' }}><p>{error || 'Failed to load categories.'}</p></div>;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact"><div><span className="section-kicker">Artwork taxonomy</span><h1>Categories</h1></div><p>Manage category dropdown options from the dashboard.</p></div>
        {message ? <p className="form-message">{message}</p> : null}
      </section>
      <form onSubmit={(e) => submitForm(e, '/api/admin/categories/create')} className="card" style={{ padding: '20px', display: 'grid', gap: '14px' }}>
        <div className="form-grid">
          <label><span>Name</span><input name="name" placeholder="Abstract" required /></label>
          <label><span>Slug</span><input name="slug" placeholder="abstract" required /></label>
          <label><span>Sort order</span><input name="sortOrder" type="number" defaultValue="0" /></label>
          <label><span>Status</span><select name="isActive" defaultValue="true"><option value="true">Active</option><option value="false">Hidden</option></select></label>
          <label className="full-width"><span>Description</span><textarea name="description" rows={3} placeholder="Short help text shown to admins." /></label>
        </div>
        <div className="card-actions"><button className="button primary" type="submit">Create category</button></div>
      </form>
      <div style={{ display: 'grid', gap: '14px' }}>
        {data.map((category: any) => (
          <div key={category.id} className="card" style={{ padding: '18px', display: 'grid', gap: '12px' }}>
            <form onSubmit={(e) => submitForm(e, '/api/admin/categories/update')} style={{ display: 'grid', gap: '12px' }}>
              <input type="hidden" name="categoryId" value={category.id} />
              <div className="form-grid">
                <label><span>Name</span><input name="name" defaultValue={category.name} required /></label>
                <label><span>Slug</span><input name="slug" defaultValue={category.slug} required /></label>
                <label><span>Sort order</span><input name="sortOrder" type="number" defaultValue={category.sortOrder} /></label>
                <label><span>Status</span><select name="isActive" defaultValue={category.isActive ? 'true' : 'false'}><option value="true">Active</option><option value="false">Hidden</option></select></label>
                <label className="full-width"><span>Description</span><textarea name="description" rows={3} defaultValue={category.description || ''} /></label>
              </div>
              <div className="card-actions"><button className="button primary" type="submit">Save category</button><span className="pill">{category._count.artworks} artworks</span></div>
            </form>
            <form onSubmit={(e) => submitForm(e, '/api/admin/categories/delete')}>
              <input type="hidden" name="categoryId" value={category.id} />
              <button className="button secondary" type="submit">Delete category</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
