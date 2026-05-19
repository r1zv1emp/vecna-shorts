import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Ensure owner account exists
  const existing = await prisma.user.findUnique({ where: { username: 'Vecna7' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        username: 'Vecna7',
        email: 'owner@vecna.local',
        password: await bcrypt.hash('@Hassanr1zv1', 10),
        role: 'OWNER',
      },
    });
    console.log('✅ Owner account created: Vecna7');
  } else {
    console.log('ℹ️  Owner account already exists');
  }

  // Create a test invite code
  const code = await prisma.inviteCode.create({
    data: { code: 'VECNA-BETA-2024' },
  });
  console.log(`✅ Test invite code: ${code.code}`);

  console.log('✅ Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
