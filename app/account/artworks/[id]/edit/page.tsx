import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { EditArtworkForm } from '@/components/account/EditArtworkForm';

interface Props {
  params: {
    id: string;
  };
}

export default async function EditArtworkPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const artworkId = Number(params.id);

  const [artwork, categories] = await Promise.all([
    prisma.artwork.findUnique({
      where: { id: artworkId },
      include: { category: true }
    }),
    prisma.artworkCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } })
  ]);

  if (!artwork) {
    notFound();
  }

  if (artwork.artistUserId !== user.userId) {
    redirect('/account/artworks');
  }

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <EditArtworkForm
        artwork={{
          id: artwork.id,
          status: artwork.status,
          title: artwork.title,
          description: artwork.description,
          basePrice: Number((artwork as any).basePrice ?? artwork.price),
          discountPercent: Number((artwork as any).discountPercent ?? 0),
          price: Number(artwork.price),
          imageUrl: artwork.imageUrl,
          category: artwork.category?.name || '',
          reviewNote: artwork.reviewNote || ''
        }}
        categories={categories}
      />
    </div>
  );
}
