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
      { name: 'crop_configs', model: prisma.cropConfig },
      { name: 'level_configs', model: prisma.levelConfig },
    ]
    
    for (const table of tables) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = await (table.model as any).count()
      console.log(`  ✓ ${table.name}: ${count} records`)
    }

    // Test Agent specific fields
    console.log('\n🔍 Testing Agent fields...')
    const agent = await prisma.agent.findFirst()
    if (agent) {
      console.log('✅ Successfully queried first Agent')
    } else {
      console.log('ℹ️ No agents found, creating a test agent...')
      const user = await prisma.user.findFirst()
      if (user) {
        await prisma.agent.create({
          data: {
            userId: user.id,
            scaAddress: '0x' + Math.random().toString(16).slice(2, 42),
            name: 'Test Agent',
            personality: 'balanced',
            strategyType: 'farming',
            strategyConfig: { some: 'config' },
          }
        })
        console.log('✅ Successfully created test agent with strategyConfig')
      }
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
