import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connected successfully!')
    
    // Test query
    const userCount = await prisma.user.count()
    console.log(`📊 Current user count: ${userCount}`)
    
    // Test all tables
    console.log('\n📋 Testing all tables...')
    const tables = [
      { name: 'users', model: prisma.user },
      { name: 'farm_states', model: prisma.farmState },
      { name: 'land_plots', model: prisma.landPlot },
      { name: 'inventories', model: prisma.inventory },
      { name: 'agents', model: prisma.agent },
      { name: 'agent_tasks', model: prisma.agentTask },
      { name: 'agent_logs', model: prisma.agentLog },
      { name: 'agent_skills', model: prisma.agentSkill },
      { name: 'agent_skill_usages', model: prisma.agentSkillUsage },
      { name: 'agent_decisions', model: prisma.agentDecision },
      { name: 'social_actions', model: prisma.socialAction },
      { name: 'raffle_entries', model: prisma.raffleEntry },
      { name: 'transactions', model: prisma.transaction },
      { name: 'system_configs', model: prisma.systemConfig },
    ]
    
    for (const table of tables) {
      const count = await table.model.count()
      console.log(`  ✓ ${table.name}: ${count} records`)
    }
    
    console.log('\n✅ All tables accessible!')
    console.log('\n🎉 Database setup complete and working!')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
