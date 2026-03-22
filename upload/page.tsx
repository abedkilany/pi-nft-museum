import { UploadForm } from '@/components/UploadForm';
import { prisma } from '@/lib/prisma';

export default async function UploadPage() {
  const categories = await prisma.artworkCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true }
  });

  return <UploadForm categories={categories} />;
}
