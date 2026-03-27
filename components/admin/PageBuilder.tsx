'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { piApiFetch } from '../../lib/pi-auth-client';

type SectionType = 'hero' | 'rich_text' | 'image' | 'cta';

type Section = {
  id?: number;
  sectionKey: string;
  sectionType: SectionType;
  title: string;
  content: string;
  settingsJson?: {
    imageUrl?: string;
    buttonLabel?: string;
    buttonHref?: string;
    align?: 'left' | 'center';
  };
  sortOrder: number;
  isEnabled: boolean;
};

type PageRecord = {
  id: number;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  menuLabel: string | null;
  showInMenu: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: Section[];
};

function emptySection(type: SectionType): Section {
  return {
    sectionKey: `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sectionType: type,
    title: '',
    content: '',
    settingsJson: {},
    sortOrder: 0,
    isEnabled: true
  };
}

function SectionFields({ section, onChange, onMove, onRemove }: {
  section: Section;
  onChange: (next: Section) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="card" style={{ padding: '16px', display: 'grid', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>{section.sectionType.replace('_', ' ')}</strong>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="button secondary" onClick={() => onMove(-1)}>↑</button>
          <button type="button" className="button secondary" onClick={() => onMove(1)}>↓</button>
          <button type="button" className="button secondary" onClick={onRemove}>Remove</button>
        </div>
      </div>

      <div className="form-grid">
        <label>
          <span>Section title</span>
          <input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
        </label>
        <label>
          <span>Section key</span>
          <input value={section.sectionKey} onChange={(e) => onChange({ ...section, sectionKey: e.target.value })} />
        </label>
        <label className="full-width">
          <span>Content</span>
          <textarea rows={section.sectionType === 'rich_text' ? 8 : 4} value={section.content} onChange={(e) => onChange({ ...section, content: e.target.value })} />
        </label>
        {(section.sectionType === 'image' || section.sectionType === 'hero' || section.sectionType === 'cta') ? (
          <label className="full-width">
            <span>Image URL</span>
            <input value={section.settingsJson?.imageUrl || ''} onChange={(e) => onChange({ ...section, settingsJson: { ...section.settingsJson, imageUrl: e.target.value } })} placeholder="/uploads/example.jpg or https://..." />
          </label>
        ) : null}
        {(section.sectionType === 'cta' || section.sectionType === 'hero') ? (
          <>
            <label>
              <span>Button label</span>
              <input value={section.settingsJson?.buttonLabel || ''} onChange={(e) => onChange({ ...section, settingsJson: { ...section.settingsJson, buttonLabel: e.target.value } })} placeholder="Explore gallery" />
            </label>
            <label>
              <span>Button link</span>
              <input value={section.settingsJson?.buttonHref || ''} onChange={(e) => onChange({ ...section, settingsJson: { ...section.settingsJson, buttonHref: e.target.value } })} placeholder="/gallery" />
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PageCard({ page, isNew = false }: { page: PageRecord; isNew?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [status, setStatus] = useState<PageRecord['status']>(page.status);
  const [menuLabel, setMenuLabel] = useState(page.menuLabel || '');
  const [showInMenu, setShowInMenu] = useState(page.showInMenu);
  const [seoTitle, setSeoTitle] = useState(page.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(page.seoDescription || '');
  const [sections, setSections] = useState<Section[]>(page.sections.length > 0 ? page.sections : [emptySection('rich_text')]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const sortedSections = useMemo(
    () => sections.map((section, index) => ({ ...section, sortOrder: index })),
    [sections]
  );

  function updateSection(index: number, next: Section) {
    setSections((current) => current.map((section, sectionIndex) => sectionIndex === index ? next : section));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const draft = [...current];
      [draft[index], draft[nextIndex]] = [draft[nextIndex], draft[index]];
      return draft;
    });
  }

  function removeSection(index: number) {
    setSections((current) => current.filter((_, sectionIndex) => sectionIndex !== index));
  }

  function addSection(type: SectionType) {
    setSections((current) => [...current, emptySection(type)]);
  }

  async function savePage() {
    setBusy(true);
    setMessage('');
    const response = await piApiFetch(isNew ? '/api/admin/pages/create' : '/api/admin/pages/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: isNew ? undefined : page.id,
        title,
        slug,
        status,
        menuLabel,
        showInMenu,
        seoTitle,
        seoDescription,
        sections: sortedSections
      })
    });
    const data = await response.json();
    setBusy(false);
    setMessage(data.message || data.error || 'Saved.');
    if (response.ok) router.refresh();
  }

  async function deletePage() {
    if (isNew) {
      setTitle('');
      setSlug('');
      setSections([emptySection('rich_text')]);
      return;
    }
    setBusy(true);
    const response = await piApiFetch('/api/admin/pages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId: page.id })
    });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <section className="card" style={{ padding: '20px', display: 'grid', gap: '16px' }}>
      <div className="form-grid">
        <label>
          <span>Page title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="About the museum" />
        </label>
        <label>
          <span>Slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="about" />
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as PageRecord['status'])}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="HIDDEN">Hidden</option>
          </select>
        </label>
        <label>
          <span>Menu label</span>
          <input value={menuLabel} onChange={(e) => setMenuLabel(e.target.value)} placeholder="Leave blank to use title" />
        </label>
        <label>
          <span>Menu visibility</span>
          <select value={showInMenu ? 'true' : 'false'} onChange={(e) => setShowInMenu(e.target.value === 'true')}>
            <option value="false">Do not show in menu</option>
            <option value="true">Show in menu</option>
          </select>
        </label>
        <label>
          <span>Public URL</span>
          <input value={slug ? `/pages/${slug}` : ''} readOnly />
        </label>
        <label>
          <span>SEO title</span>
          <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </label>
        <label>
          <span>SEO description</span>
          <input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" className="button secondary" onClick={() => addSection('hero')}>Add hero</button>
        <button type="button" className="button secondary" onClick={() => addSection('rich_text')}>Add text block</button>
        <button type="button" className="button secondary" onClick={() => addSection('image')}>Add image block</button>
        <button type="button" className="button secondary" onClick={() => addSection('cta')}>Add CTA block</button>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {sortedSections.map((section, index) => (
          <SectionFields
            key={`${section.sectionKey}-${index}`}
            section={section}
            onChange={(next) => updateSection(index, next)}
            onMove={(direction) => moveSection(index, direction)}
            onRemove={() => removeSection(index)}
          />
        ))}
      </div>

      <div className="card-actions">
        <button type="button" className="button primary" disabled={busy} onClick={savePage}>{busy ? 'Saving...' : isNew ? 'Create page' : 'Save page'}</button>
        {!isNew ? <a href={`/pages/${slug}`} target="_blank" className="button secondary">Open page</a> : null}
        {!isNew ? <button type="button" className="button secondary" disabled={busy} onClick={deletePage}>Delete page</button> : null}
        {message ? <p className="form-message">{message}</p> : null}
      </div>
    </section>
  );
}

export function PageBuilder({ pages }: { pages: PageRecord[] }) {
  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">CMS builder</span>
            <h1>Pages</h1>
          </div>
          <p>Create published pages visually, arrange sections, and optionally place them in the main menu.</p>
        </div>
      </section>

      <PageCard
        isNew
        page={{ id: 0, title: '', slug: '', status: 'DRAFT', menuLabel: '', showInMenu: false, seoTitle: '', seoDescription: '', sections: [emptySection('rich_text')] }}
      />

      <div style={{ display: 'grid', gap: '18px' }}>
        {pages.map((page) => (
          <PageCard key={page.id} page={page} />
        ))}
      </div>
    </div>
  );
}