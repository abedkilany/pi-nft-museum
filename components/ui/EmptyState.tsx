import Link from 'next/link';

type EmptyStateProps = {
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
};

export default function EmptyState({ title, description, href, actionLabel }: EmptyStateProps) {
  return (
    <section className="section-card" style={{ textAlign: 'center' }}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {href && actionLabel ? (
        <Link href={href} className="btn btn-primary">
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
