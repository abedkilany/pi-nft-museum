import { Artwork } from '@/lib/types';
import { ArtworkCard } from './ArtworkCard';

export function GallerySection({ artworks }: { artworks: Artwork[] }) {
  return (
    <section id="gallery" className="section-gap">
      <div className="section-head">
        <div>
          <span className="section-kicker">Featured collection</span>
          <h2>Curated artwork gallery</h2>
        </div>
        <p>Use this as the first base for your NFT museum, then we can expand it into a real marketplace.</p>
      </div>

      <div className="gallery-grid">
        {artworks.map((artwork: any) => (
          <ArtworkCard key={artwork.id} artwork={artwork} />
        ))}
      </div>
    </section>
  );
}
