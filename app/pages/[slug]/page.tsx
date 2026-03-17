import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPageContentBySlug } from '@/lib/pages';

function renderSection(section: any) {
  const settings = (section.settingsJson || {}) as Record<string, string>;

  if (section.sectionType === 'hero') {
    return (
      <section key={section.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '32px', background: settings.imageUrl ? `linear-gradient(135deg, rgba(10,12,18,0.76), rgba(10,12,18,0.52)), url(${settings.imageUrl}) center/cover` : 'linear-gradient(135deg, rgba(221,176,79,0.18), rgba(255,255,255,0.03))' }}>
          <span className="section-kicker">Hero section</span>
          <h1 style={{ marginTop: 0 }}>{section.title || 'Untitled hero'}</h1>
          <p style={{ color: 'var(--muted)', maxWidth: '780px', lineHeight: 1.8 }}>{section.content || ''}</p>
          {settings.buttonLabel && settings.buttonHref ? <div className="card-actions"><Link href={settings.buttonHref} className="button primary">{settings.buttonLabel}</Link></div> : null}
        </div>
      </section>
    );
  }

  if (section.sectionType === 'image') {
    return (
      <section key={section.id} className="card" style={{ padding: '24px', display: 'grid', gap: '18px' }}>
        {section.title ? <h2 style={{ margin: 0 }}>{section.title}</h2> : null}
        {settings.imageUrl ? <img src={settings.imageUrl} alt={section.title || 'Page image'} style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', borderRadius: '18px' }} /> : null}
        {section.content ? <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.8 }}>{section.content}</p> : null}
      </section>
    );
  }

  if (section.sectionType === 'cta') {
    return (
      <section key={section.id} className="card" style={{ padding: '28px', display: 'grid', gap: '12px' }}>
        {section.title ? <h2 style={{ margin: 0 }}>{section.title}</h2> : null}
        {section.content ? <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.8 }}>{section.content}</p> : null}
        {settings.buttonLabel && settings.buttonHref ? <div className="card-actions"><Link href={settings.buttonHref} className="button primary">{settings.buttonLabel}</Link></div> : null}
      </section>
    );
  }

  return (
    <section key={section.id} className="card" style={{ padding: '28px' }}>
      {section.title ? <h2 style={{ marginTop: 0 }}>{section.title}</h2> : null}
      <div style={{ color: 'var(--muted)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{section.content || 'No content yet.'}</div>
    </section>
  );
}

export default async function CmsPage({ params }: { params: { slug: string } }) {
  const page = await getPageContentBySlug(params.slug);
  if (!page || page.status !== 'PUBLISHED') notFound();

  return (
    <div style={{ paddingTop: '30px', display: 'grid', gap: '20px' }}>
      {page.sections.length === 0 ? <section className="card" style={{ padding: '28px' }}><h1 style={{ marginTop: 0 }}>{page.title}</h1><p style={{ margin: 0 }}>No sections yet.</p></section> : page.sections.map(renderSection)}
    </div>
  );
}
