export function ReactionFilterBar() {
  return (
    <section className="card surface-section" aria-label="Gallery reactions">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Artwork reactions</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Sign in with Pi to like or dislike artworks from the gallery.
          </p>
        </div>
      </div>
    </section>
  );
}

export default ReactionFilterBar;
