import { Wallet, JsonRpcProvider, Contract } from 'ethers'

const privateKey = '922a3726e5c123d47b034bfef87ff4a3796a40b75f415bd7377ea461f0b47685'
const wallet = new Wallet(privateKey)

console.log('🔐 私钥验证:')
console.log('   私钥:', privateKey)
console.log('   派生地址:', wallet.address)
console.log('')
console.log('📋 .env 配置:')
console.log('   PAY_TO_ADDRESS=0x97E8128f759973f6DCe0c1957030fA8a23a23953')
console.log('   PAYMENT_RECEIVER_ADDRESS=0x97E8128f759973f6DCe0c1957030fA8a23a23953')
console.log('')
const match = wallet.address.toLowerCase() === '0x97E8128f759973f6DCe0c1957030fA8a23a23953'.toLowerCase()
console.log(match ? '✅ 验证通过: 私钥与地址匹配' : '❌ 验证失败: 私钥与地址不匹配')

// 链上验证
async function verifyOnChain() {
  const provider = new JsonRpcProvider('https://testrpc.xlayer.tech')
  const fxAddress = '0x3A4f62e715f96F526f9928836313CB3DCCad8174'
  
  const FX_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function owner() view returns (address)',
    'function decimals() view returns (uint8)',
  ]
  
  const fx = new Contract(fxAddress, FX_ABI, provider)
  
  const [balance, owner, decimals] = await Promise.all([
    fx.balanceOf(wallet.address),
    fx.owner(),
    fx.decimals(),
  ])
  
  console.log('')
  console.log('📊 链上验证:')
  console.log('   合约地址:', fxAddress)
  console.log('   合约 Owner:', owner)
  console.log('   钱包 FX 余额:', Number(balance) / 10**Number(decimals), 'FX')
  console.log('')
  console.log(owner.toLowerCase() === wallet.address.toLowerCase() 
    ? '✅ 此地址是合约 Owner，可执行 mint()' 
    : '❌ 此地址不是合约 Owner')
}

verifyOnChain()
