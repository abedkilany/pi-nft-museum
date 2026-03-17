import Image from 'next/image';
import Link from 'next/link';
import { Artwork } from '@/lib/types';

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <article className="card art-card">
      <div className="art-image-wrap">
        <Image src={artwork.image} alt={artwork.title} width={1200} height={900} className="art-image" />
      </div>

      <div className="art-body">
        <div className="art-top">
          <div>
            <h3>{artwork.title}</h3>
            <p>
              by{' '}
              <Link href={`/artist/${artwork.artist.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                {artwork.artist.name}
              </Link>
            </p>
          </div>

          <span className="price">{artwork.price.toFixed(2)} π</span>
        </div>

        <p className="art-description">{artwork.description}</p>

        <div className="meta-row">
          <span>{artwork.category}</span>
          <span>
            ⭐ {artwork.rating.toFixed(1)} ({artwork.votes})
          </span>
        </div>

        <div className="card-actions">
          <Link href={`/artwork/${artwork.id}`} className="button secondary full">
            View Artwork
          </Link>
        </div>
      </div>
    </article>
  );
}