import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="section-card" style={{ textAlign: 'center' }}>
        <h1>Page not found</h1>
        <p>The page you requested could not be found.</p>
        <Link href="/" className="btn btn-primary">Back to home</Link>
      </section>
    </main>
  );
}
