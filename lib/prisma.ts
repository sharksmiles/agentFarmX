import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  const dbUrl = process.env.POSTGRES_PRISMA_URL || '';
  const separator = dbUrl.includes('?') ? '&' : '?';
  const urlWithPool = dbUrl + separator + 'connection_limit=5&pool_timeout=20';

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: urlWithPool,
      },
    },
    transactionOptions: {
      maxWait: 60000,  // 最大等待时间 60 秒
      timeout: 60000,  // 事务超时时间 60 秒
    },
  })
  
  // Ensure connections are cleaned up on process exit
  if (typeof window === 'undefined') {
    const cleanup = async () => {
      await client.$disconnect()
    }
    
    process.on('beforeExit', cleanup)
    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  }
  
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
