const { PrismaClient } = require('@prisma/client')

async function clearConnections() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Disconnecting Prisma Client...')
    await prisma.$disconnect()
    console.log('✓ All connections cleared')
  } catch (error) {
    console.error('Error clearing connections:', error)
    process.exit(1)
  }
}

clearConnections()
