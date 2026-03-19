import Link from 'next/link';

export function Hero() {
  return (
    <section className="hero card hero-card">
      <div className="hero-copy">
        <span className="eyebrow">Built for Pi Network Sandbox</span>
        <h1>Discover, showcase, and prepare digital art for Pi-powered trading.</h1>
        <p>
          This starter app is a clean base for your future NFT museum on Pi Network.
          It includes a gallery, artwork details, an upload page, and Pi wallet connection.
        </p>
        <div className="hero-actions">
          <Link href="#gallery" className="button primary">
            Explore Gallery
          </Link>
          <Link href="/upload" className="button secondary">
            Upload Artwork
          </Link>
        </div>
      </div>
    </section>
  );
}
