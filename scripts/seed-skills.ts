import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 定义 Skill 种子数据类型
interface SkillSeedData {
  name: string
  displayName: string
  description: string
  category: string
  parameters: any
  energyCost: number
  cooldown: number
  requiredLevel: number
  priceUsdc?: number      // 付费价格，undefined 表示免费
  priceCurrency?: string  // 货币类型
}

const SKILLS: SkillSeedData[] = [
  // Farming Skills (Farmer - 全部付费)
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
    priceUsdc: 0.001, // Farmer Skill 付费
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
    priceUsdc: 0.001, // Farmer Skill 付费
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
    priceUsdc: 0.001, // Farmer Skill 付费
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
    priceUsdc: 0.001, // Farmer Skill 付费
  },
  {
    name: 'buy_seed',
    displayName: '购买种子',
    description: '从商店购买作物种子。需要提供作物名称和数量。',
    category: 'farming',
    parameters: {
      type: 'object',
      properties: {
        quantities: {
          type: 'object',
          description: '购买数量映射，key为作物名称(如"Wheat","Corn")，value为数量',
          additionalProperties: { type: 'number' }
        },
      },
      required: ['quantities'],
    },
    energyCost: 0,
    cooldown: 0,
    requiredLevel: 1,
    priceUsdc: 0.001, // Farmer Skill 付费
  },
  
  // Social Skills (Raider - 全部付费)
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
    priceUsdc: 0.001, // Raider Skill 付费
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
    priceUsdc: 0.001, // Raider Skill 付费
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
    priceUsdc: 0.001, // Raider Skill 付费
  },
  {
    name: 'radar_scan',
    displayName: '雷达扫描',
    description: '扫描附近可偷窃的目标农场。',
    category: 'social',
    parameters: {
      type: 'object',
      properties: {
        level: { type: 'number', description: '雷达等级 (1-3)' },
      },
      required: [],
    },
    energyCost: 0,
    cooldown: 60,
    requiredLevel: 1,
    priceUsdc: 0.001, // Raider Skill 付费
  },
  
  // Strategy Skills (通用 - 付费)
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
    priceUsdc: 0.001, // Strategy Skill 付费
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
        // 更新已存在的技能（包括价格等字段）
        await prisma.agentSkill.update({
          where: { name: skill.name },
          data: {
            displayName: skill.displayName,
            description: skill.description,
            category: skill.category,
            parameters: skill.parameters,
            energyCost: skill.energyCost,
            cooldown: skill.cooldown,
            requiredLevel: skill.requiredLevel,
            priceUsdc: skill.priceUsdc,
            priceCurrency: skill.priceCurrency,
          },
        })
        console.log(`  🔄 Updated skill: ${skill.displayName} (${skill.category})${skill.priceUsdc ? ` - ${skill.priceUsdc} USDC` : ''}`)
        continue
      }
      
      await prisma.agentSkill.create({
        data: skill,
      })
      
      console.log(`  ✅ Created skill: ${skill.displayName} (${skill.category})${skill.priceUsdc ? ` - ${skill.priceUsdc} USDC` : ''}`)
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
