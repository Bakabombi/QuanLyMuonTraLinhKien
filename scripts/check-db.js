import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  await prisma.$queryRawUnsafe('SELECT 1');
  console.log('Kết nối PostgreSQL thành công');
} catch (error) {
  console.error(`Không thể kết nối PostgreSQL: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
