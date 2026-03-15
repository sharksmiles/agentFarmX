import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_WALLET = '0x97e8128f759973f6dce0c1957030fa8a23a23953'
const NEW_BALANCE = 10000

async function main() {
  try {
    console.log(`🔍 Searching for user with wallet: ${TARGET_WALLET}...`)
    
    const user = await prisma.user.findUnique({
      where: { walletAddress: TARGET_WALLET }
    })

    if (!user) {
      console.log(`❌ User with wallet ${TARGET_WALLET} not found.`)
      return
    }

    console.log(`✅ Found user: ${user.username || 'N/A'} (ID: ${user.id})`)
    console.log(`💰 Current balance: ${user.farmCoins}`)
    console.log(`🚀 Updating balance to ${NEW_BALANCE}...`)

    const updatedUser = await prisma.user.update({
      where: { walletAddress: TARGET_WALLET },
      data: { farmCoins: NEW_BALANCE }
    })

    console.log(`🎉 Success! New balance: ${updatedUser.farmCoins}`)

  } catch (error) {
    console.error('❌ Error updating user balance:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
