import { Artwork } from '@/lib/types';

export function Stats({ artworks }: { artworks: Artwork[] }) {
  const artists = new Set(
    artworks.map((art: any) => art.artist.name.toLowerCase())
  ).size;

  const total = artworks.reduce((sum, art) => sum + art.price, 0);

  return (
    <section className="stats">
      <div className="stat-card">
        <h3>{artworks.length}</h3>
        <p>Artworks</p>
      </div>

      <div className="stat-card">
        <h3>{artists}</h3>
        <p>Artists</p>
      </div>

      <div className="stat-card">
        <h3>{total.toFixed(2)} π</h3>
        <p>Total Display Value</p>
      </div>
    </section>
  );
}