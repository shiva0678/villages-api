// ─── Prisma Client (Database Connection) ─────────────────────────────────────
// Single shared Prisma instance across the whole app
// NeonDB (PostgreSQL) connection via DATABASE_URL in .env

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
