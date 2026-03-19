import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('========== 最新 Agent 日志 ==========\n');
  
  const logs = await prisma.agentLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      agentId: true,
      level: true,
      message: true,
      metadata: true,
      createdAt: true,
    },
  });

  for (const log of logs) {
    const time = log.createdAt.toISOString().split('T')[1].split('.')[0];
    const level = log.level.padEnd(7);
    console.log(`[${time}] [${level}] ${log.message}`);
    if (log.metadata) {
      console.log(`         Metadata: ${JSON.stringify(log.metadata)}`);
    }
  }

  console.log('\n========== 最新 Agent 决策 ==========\n');
  
  const decisions = await prisma.agentDecision.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      agentId: true,
      model: true,
      decisions: true,
      reasoning: true,
      executed: true,
      success: true,
      createdAt: true,
    },
  });

  for (const decision of decisions) {
    const time = decision.createdAt.toISOString().split('T')[1].split('.')[0];
    console.log(`[${time}] Agent: ${decision.agentId.slice(0, 8)}...`);
    console.log(`  Model: ${decision.model}`);
    console.log(`  Decisions: ${JSON.stringify(decision.decisions)}`);
    console.log(`  Reasoning: ${decision.reasoning?.slice(0, 100)}...`);
    console.log(`  Executed: ${decision.executed}, Success: ${decision.success}`);
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
