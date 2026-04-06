/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.auction.findMany({
    where: { status: { in: ['SCHEDULED', 'LIVE', 'PAYMENT_PENDING'] } },
    select: { id: true },
    orderBy: [{ endsAt: 'asc' }],
    take: 100,
  });

  console.log(`Found ${candidates.length} auctions to reconcile.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
