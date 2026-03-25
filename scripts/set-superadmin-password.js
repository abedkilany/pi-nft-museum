const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const identifier = process.argv[2];
  const password = process.argv[3];

  if (!identifier || !password) {
    console.error('Usage: node scripts/set-superadmin-password.js <username-or-email> <new-password>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: 'insensitive' } },
        { email: { equals: identifier, mode: 'insensitive' } },
      ],
    },
    include: { role: true },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  if (!['superadmin', 'admin', 'moderator', 'reviewer'].includes(user.role.key)) {
    throw new Error(`User role ${user.role.key} is not an admin role.`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });

  console.log(`Password updated for admin user ${user.username} (${user.role.key}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
