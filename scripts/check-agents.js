const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.agent.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      isActive: true,
      aiModel: true,
    },
  });
  console.log('Agents:', JSON.stringify(agents, null, 2));

  const logs = await prisma.agentLog.findMany({
    where: { level: 'error' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      agentId: true,
      message: true,
      createdAt: true,
    },
  });
  console.log('\nRecent Errors:', JSON.stringify(logs, null, 2));
}

main().finally(() => prisma.$disconnect());
