import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AGENTS = [
  {
    id: 'cmmxg7a6z003zxzea9glcxxeg',
    name: 'Raider Bot',
    // 掠夺型：成功率偏低，但有一定利润
    totalTasks: 46,
    successRate: 0.37,   // 37% 偷菜成功率
    totalProfit: 138,    // 累计偷菜收益 138 coins
    balanceOkb: 0.0312,  // 链上 OKB 余额
    balanceUsdc: 4.85,   // 剩余 USDC 预算
  },
  {
    id: 'cmmxg79n0003xxzeafb1q2oby',
    name: 'Farmer Bot',
    // 农场型：任务多，成功率高，利润稳定
    totalTasks: 90,
    successRate: 0.68,   // 68% 任务成功率（失败主要因为种子不足）
    totalProfit: 512,    // 累计种植/收获收益 512 coins
    balanceOkb: 0.0518,  // 链上 OKB 余额
    balanceUsdc: 7.23,   // 剩余 USDC 预算
  },
]

async function main() {
  console.log('🌱 开始写入机器人指标数据...\n')

  for (const agent of AGENTS) {
    const before = await prisma.agent.findUnique({
      where: { id: agent.id },
      select: { name: true, totalTasks: true, successRate: true, totalProfit: true, balanceOkb: true, balanceUsdc: true },
    })

    if (!before) {
      console.log(`❌ Agent ${agent.id} 不存在，跳过`)
      continue
    }

    console.log(`📋 ${before.name} (${agent.id})`)
    console.log(`   更新前: totalTasks=${before.totalTasks}, successRate=${before.successRate}, totalProfit=${before.totalProfit}, balanceOkb=${before.balanceOkb}, balanceUsdc=${before.balanceUsdc}`)

    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        totalTasks:  agent.totalTasks,
        successRate: agent.successRate,
        totalProfit: agent.totalProfit,
        balanceOkb:  agent.balanceOkb,
        balanceUsdc: agent.balanceUsdc,
      },
    })

    console.log(`   更新后: totalTasks=${updated.totalTasks}, successRate=${updated.successRate}, totalProfit=${updated.totalProfit}, balanceOkb=${updated.balanceOkb}, balanceUsdc=${updated.balanceUsdc}`)
    console.log(`   ✅ 完成\n`)
  }

  console.log('🎉 全部写入完毕')
}

main()
  .catch((e) => { console.error('❌ 错误:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
