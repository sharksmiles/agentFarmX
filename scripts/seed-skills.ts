import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SKILLS = [
  // Farming Skills
  {
    name: 'plant_crop',
    displayName: '种植作物',
    description: '在指定地块种植作物。需要提供地块索引和作物ID。',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {
        plotIndex: { type: 'number', description: '地块索引 (0-35)' },
        cropId: { type: 'string', description: '作物ID (如 "Apple", "Wheat")' },
      },
      required: ['plotIndex', 'cropId'],
    },
    energyCost: 10,
    cooldown: 0,
    requiredLevel: 1,
  },
  {
    name: 'harvest_crop',
    displayName: '收获作物',
    description: '收获已成熟的作物。需要提供地块索引。',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {
        plotIndex: { type: 'number', description: '地块索引 (0-35)' },
      },
      required: ['plotIndex'],
    },
    energyCost: 5,
    cooldown: 0,
    requiredLevel: 1,
  },
  {
    name: 'unlock_land',
    displayName: '解锁土地',
    description: '解锁新的土地地块。需要消耗金币。',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {
        plotIndex: { type: 'number', description: '要解锁的地块索引' },
      },
      required: ['plotIndex'],
    },
    energyCost: 0,
    cooldown: 0,
    requiredLevel: 1,
  },
  {
    name: 'use_boost',
    displayName: '使用加速道具',
    description: '对指定地块使用加速道具，提高收益倍数。',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {
        plotIndex: { type: 'number', description: '地块索引' },
        boostType: { type: 'string', description: '加速类型 (如 "speed", "yield")' },
      },
      required: ['plotIndex', 'boostType'],
    },
    energyCost: 0,
    cooldown: 60,
    requiredLevel: 3,
  },
  
  // Social Skills
  {
    name: 'visit_friend',
    displayName: '访问好友',
    description: '访问好友的农场，可以获得经验奖励。',
    category: 'social',
    parameters: {
      type: 'object',
      properties: {
        friendId: { type: 'string', description: '好友用户ID' },
      },
      required: ['friendId'],
    },
    energyCost: 5,
    cooldown: 300,
    requiredLevel: 1,
  },
  {
    name: 'water_friend_crop',
    displayName: '给好友浇水',
    description: '给好友的作物浇水，帮助加速成长。',
    category: 'social',
    parameters: {
      type: 'object',
      properties: {
        friendId: { type: 'string', description: '好友用户ID' },
        plotIndex: { type: 'number', description: '地块索引' },
      },
      required: ['friendId', 'plotIndex'],
    },
    energyCost: 10,
    cooldown: 600,
    requiredLevel: 2,
  },
  {
    name: 'steal_crop',
    displayName: '偷菜',
    description: '尝试偷取好友已成熟的作物。有成功率限制。',
    category: 'social',
    parameters: {
      type: 'object',
      properties: {
        friendId: { type: 'string', description: '好友用户ID' },
        plotIndex: { type: 'number', description: '地块索引' },
      },
      required: ['friendId', 'plotIndex'],
    },
    energyCost: 15,
    cooldown: 1800,
    requiredLevel: 5,
  },
  
  // Strategy Skills
  {
    name: 'analyze_market',
    displayName: '分析市场',
    description: '分析当前作物市场价格，找出最优种植策略。',
    category: 'strategy',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    energyCost: 0,
    cooldown: 300,
    requiredLevel: 3,
  },
  {
    name: 'optimize_farm',
    displayName: '优化农场布局',
    description: '分析当前农场状态，提供优化建议。',
    category: 'strategy',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    energyCost: 0,
    cooldown: 600,
    requiredLevel: 5,
  },
  {
    name: 'check_energy',
    displayName: '检查能量',
    description: '检查当前能量值和恢复时间。',
    category: 'strategy',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    energyCost: 0,
    cooldown: 0,
    requiredLevel: 1,
  },
]

async function seedSkills() {
  try {
    console.log('🌱 Seeding Agent Skills...')
    
    for (const skill of SKILLS) {
      const existing = await prisma.agentSkill.findUnique({
        where: { name: skill.name },
      })
      
      if (existing) {
        console.log(`  ⏭️  Skill "${skill.displayName}" already exists, skipping...`)
        continue
      }
      
      await prisma.agentSkill.create({
        data: skill,
      })
      
      console.log(`  ✅ Created skill: ${skill.displayName} (${skill.category})`)
    }
    
    const totalSkills = await prisma.agentSkill.count()
    console.log(`\n✅ Seeding complete! Total skills: ${totalSkills}`)
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

seedSkills()
