import { saveUploadedFile } from '@/lib/uploads';

export async function saveArtworkImage(file: File) {
  const saved = await saveUploadedFile(file, {
    subdir: 'artworks',
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSizeMb: 8,
  });

  return saved?.url || null;
}
