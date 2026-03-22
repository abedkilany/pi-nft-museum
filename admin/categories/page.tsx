import { prisma } from '@/lib/prisma';

import { requireAdminPage } from '@/lib/admin';
export default async function AdminCategoriesPage() {
  await requireAdminPage();
  const categories = await prisma.artworkCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { artworks: true } } }
  });

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Artwork taxonomy</span>
            <h1>Categories</h1>
          </div>
          <p>Manage category dropdown options from the dashboard instead of typing them manually on each artwork.</p>
        </div>
      </section>

      <form action="/api/admin/categories/create" method="POST" className="card" style={{ padding: '20px', display: 'grid', gap: '14px' }}>
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
        {categories.map((category: any) => (
          <div key={category.id} className="card" style={{ padding: '18px', display: 'grid', gap: '12px' }}>
            <form action="/api/admin/categories/update" method="POST" style={{ display: 'grid', gap: '12px' }}>
              <input type="hidden" name="categoryId" value={category.id} />
              <div className="form-grid">
                <label><span>Name</span><input name="name" defaultValue={category.name} required /></label>
                <label><span>Slug</span><input name="slug" defaultValue={category.slug} required /></label>
                <label><span>Sort order</span><input name="sortOrder" type="number" defaultValue={category.sortOrder} /></label>
                <label><span>Status</span><select name="isActive" defaultValue={category.isActive ? 'true' : 'false'}><option value="true">Active</option><option value="false">Hidden</option></select></label>
                <label className="full-width"><span>Description</span><textarea name="description" rows={3} defaultValue={category.description || ''} /></label>
              </div>
              <div className="card-actions">
                <button className="button primary" type="submit">Save category</button>
                <span className="pill">{category._count.artworks} artworks</span>
              </div>
            </form>
            <form action="/api/admin/categories/delete" method="POST">
              <input type="hidden" name="categoryId" value={category.id} />
              <button className="button secondary" type="submit">Delete category</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}